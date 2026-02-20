import axios, { AxiosError } from 'axios';
import { config } from '../config';
import { Settings } from '../models';
import { aiDetectionSchema } from './schemas';
import { SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from './prompts';

function parseJsonResponse(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        console.error('[openrouter] Failed to parse extracted JSON:', match[0].slice(0, 300));
        throw new Error(`Failed to parse JSON from response: ${content.slice(0, 300)}`);
      }
    }
    throw new Error(`Response is not valid JSON: ${content.slice(0, 300)}`);
  }
}

function getClient(apiKey: string, apiUrl: string) {
  return axios.create({
    baseURL: apiUrl,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://llamaudit.local',
      'X-Title': 'LLaMa Audit',
    },
    timeout: 120000,
  });
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (attempt >= maxRetries) throw error;

      const axiosErr = error as AxiosError<any>;
      const status = axiosErr.response?.status;
      const errMeta = axiosErr.response?.data?.error?.metadata;

      // Rate limited (429) — use Retry-After or exponential backoff
      if (status === 429) {
        const retryAfter = parseInt(axiosErr.response?.headers?.['retry-after'] || '0') * 1000;
        const delay = Math.max(retryAfter, 5000 * Math.pow(2, attempt));
        const provider = errMeta?.provider_name || 'unknown';
        console.log(`[openrouter] Rate limited by ${provider}, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      // Provider-specific error (400 from upstream provider)
      if (status === 400 && errMeta?.provider_name) {
        const delay = 3000 * (attempt + 1);
        console.log(`[openrouter] Provider ${errMeta.provider_name} returned 400, retrying in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      // Server errors (5xx)
      if (status && status >= 500) {
        const delay = 3000 * Math.pow(2, attempt);
        console.log(`[openrouter] Server error ${status}, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      // Empty response / parse error (non-HTTP errors) — also retryable
      if (!status && (error.message?.includes('Empty response') || error.message?.includes('Failed to parse'))) {
        const delay = 5000 * (attempt + 1);
        console.log(`[openrouter] Empty/malformed response, retry in ${delay}ms (${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries exceeded');
}

export interface SectionAnalysis {
  text: string;
  ai_probability: number;
  rationale: string;
  markers: string[];
}

export interface DetectionResult {
  sections: SectionAnalysis[];
  overall_score: number;
  summary: string;
  title?: string;
  model: string;
}

async function getApiConfig(): Promise<{ apiKey: string; apiUrl: string; models: string[] }> {
  let apiKey = config.openRouter.apiKey;
  let apiUrl = config.openRouter.apiUrl;
  let models = config.openRouter.chatModels;

  // Check for overrides in settings DB
  try {
    const keyRow = await Settings.findOne({ where: { key: 'openrouter_api_key' } });
    if (keyRow && keyRow.value) apiKey = keyRow.value;

    const urlRow = await Settings.findOne({ where: { key: 'openrouter_api_url' } });
    if (urlRow && urlRow.value) apiUrl = urlRow.value;

    const modelsRow = await Settings.findOne({ where: { key: 'openrouter_models' } });
    if (modelsRow && modelsRow.value) models = modelsRow.value.split(',').map(m => m.trim());
  } catch {
    // Settings table may not exist yet during startup
  }

  return { apiKey, apiUrl, models };
}

export async function analyzeText(text: string, onProgress?: (progress: any) => void): Promise<DetectionResult[]> {
  const { apiKey, apiUrl, models } = await getApiConfig();

  if (!apiKey) {
    throw new Error('OpenRouter API key is not configured');
  }

  console.log(`[openrouter] Starting parallel analysis with ${models.length} model(s): ${models.join(', ')}`);
  console.log(`[openrouter] Text length: ${text.length} chars, ~${text.split(/\s+/).length} words`);

  const client = getClient(apiKey, apiUrl);
  const results: DetectionResult[] = [];
  const errors: string[] = [];
  const modelStatuses: Record<string, string> = {};
  models.forEach(m => modelStatuses[m] = 'processing');

  const reportProgress = () => {
    if (onProgress) {
      onProgress({
        totalModels: models.length,
        completedModels: Object.values(modelStatuses).filter(s => s === 'completed' || s === 'failed').length,
        modelStatuses: { ...modelStatuses },
      });
    }
  };

  // Report all models as processing at start
  reportProgress();

  // Run all models in parallel
  const modelPromises = models.map(async (model) => {
    const reasoningParams = model.startsWith('qwen/') ? { reasoning: { enabled: false } } : {};

    console.log(`[openrouter] Sending request to model: ${model}`);
    const startTime = Date.now();

    try {
      const result = await withRetry(async () => {
        const response = await client.post('/chat/completions', {
          model,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${USER_PROMPT_TEMPLATE}${text}` },
          ],
          response_format: aiDetectionSchema,
          ...reasoningParams,
          plugins: [{ id: 'response-healing' }],
          provider: { require_parameters: true, allow_fallbacks: true },
          temperature: 0,
          max_tokens: 4096,
        });

        const elapsed = Date.now() - startTime;
        const content = response.data.choices?.[0]?.message?.content;
        const finishReason = response.data.choices?.[0]?.finish_reason;
        const usage = response.data.usage;

        console.log(`[openrouter] ${model} responded in ${elapsed}ms (finish_reason: ${finishReason}, tokens: ${usage?.total_tokens || 'unknown'})`);

        if (!content) {
          console.warn(`[openrouter] ${model} returned empty content. Raw response:`, JSON.stringify(response.data.choices?.[0]).slice(0, 500));
          throw new Error(`Empty response from ${model} (finish_reason: ${finishReason})`);
        }

        if (finishReason === 'length') {
          console.warn(`[openrouter] ${model} response was truncated (max_tokens reached)`);
        }

        return parseJsonResponse(content);
      });

      const elapsed = Date.now() - startTime;
      console.log(`[openrouter] ${model} analysis complete in ${elapsed}ms — score: ${result.overall_score}, sections: ${result.sections?.length || 0}`);
      results.push({ ...result, model });
      modelStatuses[model] = 'completed';
      reportProgress();
    } catch (error: any) {
      const elapsed = Date.now() - startTime;
      const status = error?.response?.status;
      const responseData = error?.response?.data;
      const errorMsg = responseData?.error?.message || error?.message || 'Unknown error';

      console.error(`[openrouter] ${model} FAILED after ${elapsed}ms:`);
      console.error(`[openrouter]   Status: ${status || 'N/A'}`);
      console.error(`[openrouter]   Error: ${errorMsg}`);
      if (responseData?.error) {
        console.error(`[openrouter]   Full error:`, JSON.stringify(responseData.error).slice(0, 500));
      }

      errors.push(`${model}: ${errorMsg}`);
      modelStatuses[model] = 'failed';
      reportProgress();
    }
  });

  await Promise.allSettled(modelPromises);

  console.log(`[openrouter] Analysis complete: ${results.length}/${models.length} models succeeded`);

  if (results.length === 0) {
    const errorDetails = errors.join('; ');
    throw new Error(`All models failed. ${errorDetails}`);
  }

  return results;
}

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { apiKey, apiUrl } = await getApiConfig();
    if (!apiKey) {
      return { success: false, error: 'No API key configured' };
    }

    const client = getClient(apiKey, apiUrl);
    const response = await client.get('/models', { timeout: 10000 });
    return { success: response.status === 200 };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Connection failed' };
  }
}

export async function testConnectionWithKey(apiKey: string, apiUrl?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = apiUrl || config.openRouter.apiUrl;
    const client = getClient(apiKey, url);
    const response = await client.get('/models', { timeout: 10000 });
    return { success: response.status === 200 };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Connection failed' };
  }
}

export async function getAvailableModels(): Promise<any[]> {
  try {
    const { apiKey, apiUrl } = await getApiConfig();
    if (!apiKey) return [];

    const client = getClient(apiKey, apiUrl);
    const response = await client.get('/models');
    const models = response.data?.data || [];

    // Filter models that support structured output (json_schema response_format)
    return models
      .filter((m: any) => {
        const supported = m.supported_parameters || [];
        return supported.includes('response_format') || supported.includes('structured_output');
      })
      .map((m: any) => ({
        id: m.id,
        name: m.name,
        context_length: m.context_length,
        pricing: m.pricing,
        supported_parameters: m.supported_parameters || [],
      }));
  } catch (error: any) {
    console.error('Failed to fetch models:', error?.message);
    return [];
  }
}
