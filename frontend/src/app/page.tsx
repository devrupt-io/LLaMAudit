'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import TextEditor from '@/components/TextEditor';
import AnalysisResults from '@/components/AnalysisResults';
import { AnalysisResponse, AnalysisProgress } from '@/types';

export default function HomePage() {
  const [text, setText] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<AnalysisProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, []);

  const pollForResult = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/analysis/${id}`);
      if (!res.ok) throw new Error('Failed to check analysis status');

      const data = await res.json();

      if (data.progress) {
        setProgress(data.progress);
      }

      if (data.status === 'completed') {
        setAnalysis(data);
        setLoading(false);
        setProgress(null);
        return;
      }

      if (data.status === 'failed') {
        setError(data.error || 'Analysis failed. Check your settings and try again.');
        setLoading(false);
        setProgress(null);
        return;
      }

      // Still processing — poll again
      pollingRef.current = setTimeout(() => pollForResult(id), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to check analysis status');
      setLoading(false);
      setProgress(null);
    }
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!text.trim()) {
      setError('Please enter some text to analyze.');
      return;
    }

    setLoading(true);
    setError(null);
    setAnalysis(null);
    setProgress(null);

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        let message = 'Analysis failed';
        try {
          const data = await res.json();
          message = data.error || message;
        } catch {
          message = `Server error (${res.status})`;
        }
        throw new Error(message);
      }

      const { id } = await res.json();
      pollForResult(id);
    } catch (err: any) {
      setError(err.message || 'Analysis failed. Check your settings and try again.');
      setLoading(false);
      setProgress(null);
    }
  }, [text, pollForResult]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">AI Text Detection</h2>
        <p className="text-slate-600">
          Paste or import text below, then run the analysis to detect AI-generated content.
        </p>
      </div>

      <div className="space-y-4">
        <TextEditor value={text} onChange={setText} />

        {error && (
          <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleAnalyze}
            disabled={loading || !text.trim()}
            className="px-6 py-2.5 bg-primary-600 text-white font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
              </>
            ) : (
              <>🔍 Run Analysis</>
            )}
          </button>
          <span className="text-sm text-slate-500">
            {text.length > 0 && !loading ? `${text.split(/\s+/).filter(Boolean).length} words` : !loading ? 'No text entered' : ''}
          </span>
        </div>

        {/* Progress indicator */}
        {loading && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <svg className="animate-spin h-4 w-4 text-primary-600" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm font-medium text-slate-700">
                {progress
                  ? `Analyzing with models (${progress.completedModels}/${progress.totalModels} complete)...`
                  : 'Starting analysis...'}
              </span>
            </div>
            {progress?.modelStatuses && Object.keys(progress.modelStatuses).length > 0 && (
              <div className="space-y-1.5">
                {Object.entries(progress.modelStatuses).map(([model, status]) => (
                  <div key={model} className="flex items-center gap-2 text-xs">
                    {status === 'completed' ? (
                      <span className="text-green-500">✓</span>
                    ) : status === 'failed' ? (
                      <span className="text-red-500">✗</span>
                    ) : status === 'processing' ? (
                      <svg className="animate-spin h-3 w-3 text-primary-500" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : (
                      <span className="text-slate-300">○</span>
                    )}
                    <span className={
                      status === 'completed' ? 'text-green-700' :
                      status === 'failed' ? 'text-red-500' :
                      status === 'processing' ? 'text-primary-700 font-medium' :
                      'text-slate-400'
                    }>
                      {model}
                    </span>
                    <span className="text-slate-400 capitalize">
                      {status === 'processing' ? '— running...' : status === 'completed' ? '— done' : status === 'failed' ? '— failed' : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {analysis && <AnalysisResults analysis={analysis} inputText={text} />}
    </div>
  );
}
