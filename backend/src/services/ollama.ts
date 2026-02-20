import axios from 'axios';
import { config } from '../config';
import { Settings } from '../models';
import { DetectionResult, SectionAnalysis } from './openrouter';
import { OLLAMA_SYSTEM_PROMPT, USER_PROMPT_TEMPLATE } from './prompts';

function parseJsonResponse(content: string): any {
  try {
    return JSON.parse(content);
  } catch {
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    throw new Error(`Failed to parse JSON from response: ${content.slice(0, 200)}`);
  }
}

async function getOllamaConfig(): Promise<{ endpoint: string; models: string[] }> {
  let endpoint = config.ollama.endpoint;
  let models = config.ollama.models;

  try {
    const endpointRow = await Settings.findOne({ where: { key: 'ollama_endpoint' } });
    if (endpointRow && endpointRow.value) endpoint = endpointRow.value;

    const modelsRow = await Settings.findOne({ where: { key: 'ollama_models' } });
    if (modelsRow && modelsRow.value) models = modelsRow.value.split(',').map(m => m.trim());
  } catch {
    // Settings may not exist yet
  }

  return { endpoint, models };
}

export async function analyzeText(text: string, onProgress?: (progress: any) => void): Promise<DetectionResult[]> {
  const { endpoint, models } = await getOllamaConfig();

  if (!models.length) {
    throw new Error('No Ollama models configured');
  }

  const results: DetectionResult[] = [];
  const modelStatuses: Record<string, string> = {};
  models.forEach(m => modelStatuses[m] = 'pending');

  for (const model of models) {
    modelStatuses[model] = 'processing';
    if (onProgress) {
      onProgress({ totalModels: models.length, completedModels: results.length, currentModel: model, modelStatuses: { ...modelStatuses } });
    }

    try {
      const response = await axios.post(
        `${endpoint}/api/chat`,
        {
          model,
          messages: [
            { role: 'system', content: OLLAMA_SYSTEM_PROMPT },
            { role: 'user', content: `${USER_PROMPT_TEMPLATE}${text}` },
          ],
          format: 'json',
          stream: false,
          options: {
            temperature: 0,
            num_predict: 4096,
          },
        },
        { timeout: 300000 }
      );

      const parsed = parseJsonResponse(response.data.message.content);
      results.push({ ...parsed, model });
      modelStatuses[model] = 'completed';
    } catch (error: any) {
      console.error(`[ollama] Error with model ${model}:`, error?.message);
      modelStatuses[model] = 'failed';
    }

    if (onProgress) {
      onProgress({ totalModels: models.length, completedModels: Object.values(modelStatuses).filter(s => s === 'completed' || s === 'failed').length, modelStatuses: { ...modelStatuses } });
    }
  }

  if (results.length === 0) {
    throw new Error('All Ollama models failed');
  }

  return results;
}

export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { endpoint } = await getOllamaConfig();
    const response = await axios.get(`${endpoint}/api/tags`, { timeout: 5000 });
    return { success: response.status === 200 };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Connection failed' };
  }
}

export async function testConnectionWithEndpoint(endpoint: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.get(`${endpoint}/api/tags`, { timeout: 5000 });
    return { success: response.status === 200 };
  } catch (error: any) {
    return { success: false, error: error?.message || 'Connection failed' };
  }
}

export async function getAvailableModels(): Promise<any[]> {
  try {
    const { endpoint } = await getOllamaConfig();
    const response = await axios.get(`${endpoint}/api/tags`, { timeout: 5000 });
    return (response.data?.models || []).map((m: any) => ({
      id: m.name,
      name: m.name,
      size: m.size,
      modified_at: m.modified_at,
    }));
  } catch (error: any) {
    console.error('Failed to fetch Ollama models:', error?.message);
    return [];
  }
}
