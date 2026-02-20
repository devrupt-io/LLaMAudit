'use client';

import { useState, useEffect, useCallback } from 'react';
import { ConnectionTestResult, ModelInfo } from '@/types';

type Provider = 'openrouter' | 'ollama';

interface SettingsState {
  provider: Provider;
  openrouter_api_key: string;
  openrouter_api_url: string;
  openrouter_models: string;
  ollama_endpoint: string;
  ollama_models: string;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    provider: 'openrouter',
    openrouter_api_key: '',
    openrouter_api_url: 'https://openrouter.ai/api/v1',
    openrouter_models: '',
    ollama_endpoint: 'http://host.docker.internal:11434',
    ollama_models: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [availableModels, setAvailableModels] = useState<ModelInfo[]>([]);
  const [loadingModels, setLoadingModels] = useState(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState<string>('any');
  const [modelSearch, setModelSearch] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  // Auto-load models when settings are loaded
  useEffect(() => {
    if (settings.openrouter_api_key || settings.ollama_endpoint) {
      fetchModels();
    }
  }, [settings.provider, settings.openrouter_api_key, settings.ollama_endpoint]);

  const loadSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(prev => ({
          ...prev,
          ...data,
          provider: (data.provider || 'openrouter') as Provider,
        }));
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/settings/batch', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (err) {
      console.error('Failed to save settings:', err);
    } finally {
      setSaving(false);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const body: any = { provider: settings.provider };
      if (settings.provider === 'openrouter') {
        if (settings.openrouter_api_key && !settings.openrouter_api_key.startsWith('••')) {
          body.apiKey = settings.openrouter_api_key;
        }
        body.apiUrl = settings.openrouter_api_url;
      } else {
        body.endpoint = settings.ollama_endpoint;
      }

      const res = await fetch('/api/settings/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ success: false, error: err.message });
    } finally {
      setTesting(false);
    }
  };

  const fetchModels = useCallback(async () => {
    setLoadingModels(true);
    try {
      const res = await fetch(`/api/settings/models?provider=${settings.provider}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableModels(data);
      }
    } catch (err) {
      console.error('Failed to fetch models:', err);
    } finally {
      setLoadingModels(false);
    }
  }, [settings.provider]);

  const toggleModel = (modelId: string) => {
    const key = settings.provider === 'openrouter' ? 'openrouter_models' : 'ollama_models';
    const current = settings[key].split(',').map(m => m.trim()).filter(Boolean);
    const newModels = current.includes(modelId)
      ? current.filter(m => m !== modelId)
      : [...current, modelId];
    setSettings(prev => ({ ...prev, [key]: newModels.join(',') }));
  };

  const selectedModels = (
    settings.provider === 'openrouter'
      ? settings.openrouter_models
      : settings.ollama_models
  ).split(',').map(m => m.trim()).filter(Boolean);

  // Estimate cost for a 1,000-word essay analysis
  // ~1,800 input tokens (system prompt + essay) + ~800 output tokens
  const INPUT_TOKENS = 1800;
  const OUTPUT_TOKENS = 800;

  function estimateCost(pricing: any): number | null {
    if (!pricing?.prompt || !pricing?.completion) return null;
    const promptCost = parseFloat(pricing.prompt) * INPUT_TOKENS;
    const completionCost = parseFloat(pricing.completion) * OUTPUT_TOKENS;
    return promptCost + completionCost;
  }

  function formatCost(cost: number | null): string {
    if (cost === null) return '?';
    if (cost === 0) return 'free';
    if (cost < 0.001) return '<$0.001';
    return `$${cost.toFixed(3)}`;
  }

  const filteredModels = availableModels.filter((model) => {
    // Name filter
    if (modelSearch) {
      const search = modelSearch.toLowerCase();
      const matchesName = (model.name || '').toLowerCase().includes(search);
      const matchesId = model.id.toLowerCase().includes(search);
      if (!matchesName && !matchesId) return false;
    }
    // Price filter
    if (maxPriceFilter === 'any') return true;
    if (maxPriceFilter === 'free') {
      const cost = estimateCost(model.pricing);
      return cost !== null && cost === 0;
    }
    const maxCost = parseFloat(maxPriceFilter);
    const cost = estimateCost(model.pricing);
    return cost !== null && cost <= maxCost;
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Settings</h2>
        <p className="text-slate-600">Configure your AI provider and model preferences.</p>
      </div>

      {/* Provider Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">AI Provider</h3>
        <div className="flex gap-3">
          {(['openrouter', 'ollama'] as const).map((p) => (
            <button
              key={p}
              onClick={() => {
                setSettings(prev => ({ ...prev, provider: p }));
                setTestResult(null);
                setAvailableModels([]);
              }}
              className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                settings.provider === p
                  ? 'border-primary-500 bg-primary-50 text-primary-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'
              }`}
            >
              {p === 'openrouter' ? '🌐 OpenRouter' : '🦙 Ollama'}
            </button>
          ))}
        </div>
      </div>

      {/* Provider-specific Settings */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">
          {settings.provider === 'openrouter' ? 'OpenRouter Configuration' : 'Ollama Configuration'}
        </h3>

        {settings.provider === 'openrouter' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
              <input
                type="text"
                value={settings.openrouter_api_key}
                onChange={(e) => setSettings(prev => ({ ...prev, openrouter_api_key: e.target.value }))}
                placeholder="sk-or-v1-..."
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">API URL</label>
              <input
                type="text"
                value={settings.openrouter_api_url}
                onChange={(e) => setSettings(prev => ({ ...prev, openrouter_api_url: e.target.value }))}
                placeholder="https://openrouter.ai/api/v1"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Models (comma-separated)
              </label>
              <input
                type="text"
                value={settings.openrouter_models}
                onChange={(e) => setSettings(prev => ({ ...prev, openrouter_models: e.target.value }))}
                placeholder="qwen/qwen3-8b,meta-llama/llama-3-8b-instruct"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Endpoint URL</label>
              <input
                type="text"
                value={settings.ollama_endpoint}
                onChange={(e) => setSettings(prev => ({ ...prev, ollama_endpoint: e.target.value }))}
                placeholder="http://localhost:11434"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Models (comma-separated)
              </label>
              <input
                type="text"
                value={settings.ollama_models}
                onChange={(e) => setSettings(prev => ({ ...prev, ollama_models: e.target.value }))}
                placeholder="llama3,mistral"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
              />
            </div>
          </div>
        )}

        {/* Connection Test */}
        <div className="mt-4 pt-4 border-t border-slate-100">
          <button
            onClick={testConnection}
            disabled={testing}
            className="px-4 py-2 text-sm font-medium text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-lg transition-colors disabled:opacity-50"
          >
            {testing ? 'Testing...' : '🔌 Test Connection'}
          </button>
          {testResult && (
            <div className={`mt-2 px-3 py-2 rounded-lg text-sm ${
              testResult.success
                ? 'bg-success-50 text-success-700 border border-success-200'
                : 'bg-danger-50 text-danger-700 border border-danger-200'
            }`}>
              {testResult.success ? '✅ Connection successful!' : `❌ ${testResult.error || 'Connection failed'}`}
            </div>
          )}
        </div>
      </div>

      {/* Model Browser */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">Available Models</h3>
          <button
            onClick={fetchModels}
            disabled={loadingModels}
            className="px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors disabled:opacity-50"
          >
            {loadingModels ? 'Loading...' : '🔄 Refresh Models'}
          </button>
        </div>

        {selectedModels.length > 0 && (
          <div className="mb-3">
            <span className="text-xs font-medium text-slate-500">Selected:</span>
            <div className="flex flex-wrap gap-1 mt-1">
              {selectedModels.map(m => (
                <span key={m} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-primary-100 text-primary-700 rounded-full">
                  {m}
                  <button
                    onClick={() => toggleModel(m)}
                    className="hover:text-danger-600 transition-colors"
                    title="Remove model"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {availableModels.length > 0 && (
          <div className="mb-3 space-y-2">
            <input
              type="text"
              value={modelSearch}
              onChange={(e) => setModelSearch(e.target.value)}
              placeholder="Search models..."
              className="w-full px-3 py-1.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
            />
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">Max cost per 1k-word essay:</span>
              <select
                value={maxPriceFilter}
                onChange={(e) => setMaxPriceFilter(e.target.value)}
                className="text-xs px-2 py-1 rounded border border-slate-300 bg-white text-slate-700"
              >
                <option value="any">Any price</option>
                <option value="free">Free only</option>
                <option value="0.001">≤ $0.001</option>
                <option value="0.01">≤ $0.01</option>
                <option value="0.05">≤ $0.05</option>
                <option value="0.10">≤ $0.10</option>
              </select>
              <span className="text-xs text-slate-400">
                ({filteredModels.length} of {availableModels.length} models)
              </span>
            </div>
          </div>
        )}

        {filteredModels.length > 0 ? (
          <div className="max-h-80 overflow-y-auto space-y-1">
            {filteredModels.map((model) => {
              const cost = estimateCost(model.pricing);
              return (
                <label
                  key={model.id}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-50 cursor-pointer text-sm"
                >
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onChange={() => toggleModel(model.id)}
                    className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="flex-1 text-slate-700">{model.name || model.id}</span>
                  <span className="flex items-center gap-2 text-xs text-slate-400">
                    <span title="Estimated cost per 1,000-word essay analysis" className={cost === 0 ? 'text-green-500 font-medium' : ''}>
                      {formatCost(cost)}/essay
                    </span>
                    {model.context_length && (
                      <span>{(model.context_length / 1000).toFixed(0)}k</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-slate-500">
            Click &quot;Refresh Models&quot; to load available models from your provider.
            {settings.provider === 'openrouter' && ' Models that support structured output will be shown.'}
          </p>
        )}
      </div>

      {/* Save */}
      <div className="flex items-center gap-3">
        <button
          onClick={saveSettings}
          disabled={saving}
          className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : '💾 Save Settings'}
        </button>
        {saved && (
          <span className="text-sm text-success-600 font-medium animate-fade-in">
            ✅ Settings saved!
          </span>
        )}
      </div>
    </div>
  );
}
