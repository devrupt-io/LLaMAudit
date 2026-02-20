'use client';

import { useState, useEffect, useRef } from 'react';
import AnalysisResults from '@/components/AnalysisResults';
import { AnalysisResponse } from '@/types';

export default function AnalysisDetailPage({ params }: { params: { id: string } }) {
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAnalysis();
    return () => {
      if (pollingRef.current) clearTimeout(pollingRef.current);
    };
  }, [params.id]);

  const loadAnalysis = async () => {
    try {
      const res = await fetch(`/api/analysis/${params.id}`);
      if (!res.ok) throw new Error('Analysis not found');

      const data = await res.json();
      setInputText(data.inputText || '');

      if (data.status === 'pending' || data.status === 'processing') {
        // Still in progress — poll
        pollingRef.current = setTimeout(loadAnalysis, 2000);
        setAnalysis(null);
        return;
      }

      if (data.status === 'failed') {
        setError(data.error || 'Analysis failed');
        setLoading(false);
        return;
      }

      setAnalysis({
        id: data.id,
        title: data.title,
        status: data.status,
        overallScore: data.overallScore,
        sections: data.sections,
        models: data.models,
        provider: data.provider,
        summary: data.summary,
        perModelResults: data.perModelResults || [],
        createdAt: data.createdAt,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading || (!analysis && !error)) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">
          {error ? error : 'Loading analysis...'}
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="bg-danger-50 border border-danger-200 text-danger-700 px-4 py-3 rounded-lg">
        {error || 'Analysis not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <a href="/history" className="text-sm text-primary-600 hover:text-primary-700">← Back to History</a>
        <h2 className="text-2xl font-bold text-slate-800">{analysis.title}</h2>
      </div>

      {inputText && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-3">Original Text</h3>
          <div className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed font-mono bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto">
            {inputText}
          </div>
        </div>
      )}

      <AnalysisResults analysis={analysis} inputText={inputText} />
    </div>
  );
}
