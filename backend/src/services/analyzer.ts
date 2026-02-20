import * as openrouter from './openrouter';
import * as ollama from './ollama';
import { Settings } from '../models';
import { DetectionResult } from './openrouter';

export type { DetectionResult, SectionAnalysis } from './openrouter';

export type ProgressCallback = (progress: {
  totalModels: number;
  completedModels: number;
  currentModel?: string;
  modelStatuses: Record<string, 'pending' | 'processing' | 'completed' | 'failed'>;
}) => void;

async function getProvider(): Promise<string> {
  try {
    const providerRow = await Settings.findOne({ where: { key: 'provider' } });
    if (providerRow && providerRow.value) return providerRow.value;
  } catch {
    // Default to openrouter
  }
  return 'openrouter';
}

export async function analyzeText(text: string, onProgress?: ProgressCallback): Promise<{ provider: string; results: DetectionResult[] }> {
  const provider = await getProvider();

  let results: DetectionResult[];
  if (provider === 'ollama') {
    results = await ollama.analyzeText(text, onProgress);
  } else {
    results = await openrouter.analyzeText(text, onProgress);
  }

  return { provider, results };
}

export function aggregateResults(results: DetectionResult[]): {
  overallScore: number;
  sections: Array<{
    text: string;
    ai_probability: number;
    rationale: string;
    markers: string[];
  }>;
  summary: string;
  title: string;
} {
  if (results.length === 0) {
    return { overallScore: 0, sections: [], summary: 'No analysis results', title: 'Untitled Analysis' };
  }

  if (results.length === 1) {
    return {
      overallScore: results[0].overall_score,
      sections: results[0].sections,
      summary: results[0].summary,
      title: results[0].title || 'Untitled Analysis',
    };
  }

  // Average scores across models
  const overallScore = results.reduce((sum, r) => sum + r.overall_score, 0) / results.length;

  // Use the sections from the first model as the base, average probabilities
  const baseSections = results[0].sections;
  const sections = baseSections.map((section, i) => {
    const avgProb = results.reduce((sum, r) => {
      const matching = r.sections[i];
      return sum + (matching ? matching.ai_probability : section.ai_probability);
    }, 0) / results.length;

    const allMarkers = new Set<string>();
    results.forEach(r => {
      const matching = r.sections[i];
      if (matching) matching.markers.forEach(m => allMarkers.add(m));
    });

    return {
      text: section.text,
      ai_probability: avgProb,
      rationale: section.rationale,
      markers: Array.from(allMarkers),
    };
  });

  const summaries = results.map(r => `[${r.model}]: ${r.summary}`).join('\n');

  return { overallScore, sections, summary: summaries, title: results[0].title || 'Untitled Analysis' };
}

export async function testConnection(provider?: string): Promise<{ success: boolean; error?: string }> {
  const p = provider || (await getProvider());
  if (p === 'ollama') {
    return ollama.testConnection();
  }
  return openrouter.testConnection();
}

export async function getAvailableModels(provider?: string): Promise<any[]> {
  const p = provider || (await getProvider());
  if (p === 'ollama') {
    return ollama.getAvailableModels();
  }
  return openrouter.getAvailableModels();
}
