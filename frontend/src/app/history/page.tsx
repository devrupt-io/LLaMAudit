'use client';

import { useState, useEffect } from 'react';
import { AnalysisListItem } from '@/types';

export default function HistoryPage() {
  const [analyses, setAnalyses] = useState<AnalysisListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalyses();
  }, []);

  const loadAnalyses = async () => {
    try {
      const res = await fetch('/api/analysis');
      if (res.ok) {
        setAnalyses(await res.json());
      }
    } catch (err) {
      console.error('Failed to load analyses:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteAnalysis = async (id: string) => {
    try {
      const res = await fetch(`/api/analysis/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setAnalyses(prev => prev.filter(a => a.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete analysis:', err);
    }
  };

  function getScoreColor(score: number): string {
    if (score >= 0.7) return 'text-red-600';
    if (score >= 0.4) return 'text-amber-600';
    return 'text-green-600';
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Analysis History</h2>
        <p className="text-slate-600">View your previous text analyses.</p>
      </div>

      {analyses.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
          <p className="text-slate-500">No analyses yet. Go to the home page to analyze some text.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center justify-between hover:border-slate-300 transition-colors"
            >
              <a href={`/analysis/${analysis.id}`} className="flex-1">
                <div className="flex items-center gap-4">
                  {analysis.status === 'completed' ? (
                    <span className={`text-2xl font-bold ${getScoreColor(analysis.overallScore)}`}>
                      {Math.round(analysis.overallScore * 100)}%
                    </span>
                  ) : analysis.status === 'failed' ? (
                    <span className="text-2xl font-bold text-red-400">✗</span>
                  ) : (
                    <span className="text-2xl font-bold text-slate-400 animate-pulse">···</span>
                  )}
                  <div>
                    <h3 className="text-sm font-medium text-slate-800">{analysis.title}</h3>
                    <p className="text-xs text-slate-500">
                      {analysis.status !== 'completed' && <span className="capitalize">{analysis.status} · </span>}
                      {analysis.provider} · {analysis.models.join(', ')} · {new Date(analysis.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </a>
              <button
                onClick={() => deleteAnalysis(analysis.id)}
                className="px-3 py-1.5 text-xs text-slate-500 hover:text-danger-600 hover:bg-danger-50 rounded transition-colors"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
