import { Router, Request, Response } from 'express';
import { Settings } from '../models';
import { config } from '../config';
import * as analyzer from '../services/analyzer';
import * as openrouter from '../services/openrouter';
import * as ollama from '../services/ollama';

const router = Router();

// Get all settings (merge env defaults with DB overrides)
router.get('/', async (_req: Request, res: Response) => {
  try {
    // Start with defaults from env
    const result: Record<string, string> = {
      provider: 'openrouter',
      openrouter_api_key: config.openRouter.apiKey,
      openrouter_api_url: config.openRouter.apiUrl,
      openrouter_models: config.openRouter.chatModels.join(','),
      ollama_endpoint: config.ollama.endpoint,
      ollama_models: config.ollama.models.join(','),
    };

    // Override with DB settings
    const settings = await Settings.findAll();
    for (const s of settings) {
      if (s.value) result[s.key] = s.value;
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// Update a setting
router.put('/', async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;
    if (!key || typeof key !== 'string') {
      return res.status(400).json({ error: 'Key is required' });
    }

    const allowedKeys = [
      'provider',
      'openrouter_api_key',
      'openrouter_api_url',
      'openrouter_models',
      'ollama_endpoint',
      'ollama_models',
    ];

    if (!allowedKeys.includes(key)) {
      return res.status(400).json({ error: `Invalid setting key. Allowed: ${allowedKeys.join(', ')}` });
    }

    const existing = await Settings.findOne({ where: { key } });
    if (existing) {
      existing.value = value || '';
      await existing.save();
      res.json({ key: existing.key, value: existing.key.includes('api_key') ? '••••••••' : existing.value });
    } else {
      const setting = await Settings.create({ key, value: value || '' });
      res.json({ key: setting.key, value: setting.key.includes('api_key') ? '••••••••' : setting.value });
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update setting' });
  }
});

// Batch update settings
router.put('/batch', async (req: Request, res: Response) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== 'object') {
      return res.status(400).json({ error: 'Settings object is required' });
    }

    for (const [key, value] of Object.entries(settings)) {
      const existing = await Settings.findOne({ where: { key } });
      if (existing) {
        existing.value = (value as string) || '';
        await existing.save();
      } else {
        await Settings.create({ key, value: (value as string) || '' });
      }
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
});

// Test connection for a provider
router.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const { provider, apiKey, apiUrl, endpoint } = req.body;

    if (provider === 'openrouter') {
      if (apiKey) {
        const result = await openrouter.testConnectionWithKey(apiKey, apiUrl);
        return res.json(result);
      }
      const result = await openrouter.testConnection();
      return res.json(result);
    }

    if (provider === 'ollama') {
      if (endpoint) {
        const result = await ollama.testConnectionWithEndpoint(endpoint);
        return res.json(result);
      }
      const result = await ollama.testConnection();
      return res.json(result);
    }

    // Default: test current provider
    const result = await analyzer.testConnection();
    res.json(result);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Connection test failed' });
  }
});

// Get available models for a provider
router.get('/models', async (req: Request, res: Response) => {
  try {
    const provider = (req.query.provider as string) || undefined;
    const models = await analyzer.getAvailableModels(provider);
    res.json(models);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch models' });
  }
});

export default router;
