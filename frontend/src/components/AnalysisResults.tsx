'use client';

import { AnalysisResponse, SectionAnalysis } from '@/types';

interface AnalysisResultsProps {
  analysis: AnalysisResponse;
  inputText: string;
}

function getScoreColor(score: number): string {
  if (score >= 0.7) return 'text-danger-600';
  if (score >= 0.4) return 'text-amber-600';
  return 'text-success-600';
}

function getScoreBg(score: number): string {
  if (score >= 0.7) return 'bg-danger-50 border-danger-200';
  if (score >= 0.4) return 'bg-amber-50 border-amber-200';
  return 'bg-success-50 border-success-200';
}

function getScoreLabel(score: number): string {
  if (score >= 0.8) return 'Very likely AI-generated';
  if (score >= 0.6) return 'Likely AI-generated';
  if (score >= 0.4) return 'Possibly AI-generated';
  if (score >= 0.2) return 'Likely human-written';
  return 'Very likely human-written';
}

function getHighlightClass(prob: number): string {
  if (prob >= 0.7) return 'highlight-high';
  if (prob >= 0.4) return 'highlight-medium';
  return 'highlight-low';
}

function ScoreGauge({ score }: { score: number }) {
  const percentage = Math.round(score * 100);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference - (score * circumference);

  return (
    <div className="flex flex-col items-center">
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r="54" fill="none" stroke="#e2e8f0" strokeWidth="8" />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke={score >= 0.7 ? '#ef4444' : score >= 0.4 ? '#f59e0b' : '#22c55e'}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center w-32 h-32">
        <span className={`text-3xl font-bold ${getScoreColor(score)}`}>{percentage}%</span>
        <span className="text-xs text-slate-500">AI Score</span>
      </div>
    </div>
  );
}

function SectionCard({ section, index }: { section: SectionAnalysis; index: number }) {
  const prob = Math.round(section.ai_probability * 100);

  return (
    <div className={`p-4 rounded-lg border ${getScoreBg(section.ai_probability)} animate-fade-in`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-xs font-medium text-slate-500">Section {index + 1}</span>
        <span className={`text-sm font-bold ${getScoreColor(section.ai_probability)}`}>
          {prob}% AI
        </span>
      </div>
      <p className={`text-sm text-slate-700 mb-2 leading-relaxed ${getHighlightClass(section.ai_probability)} inline`}>
        {section.text}
      </p>
      <p className="text-xs text-slate-600 mt-2 italic">{section.rationale}</p>
      {section.markers.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {section.markers.map((marker, i) => (
            <span key={i} className="px-2 py-0.5 text-xs bg-white/60 rounded-full text-slate-600 border border-slate-200">
              {marker}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalysisResults({ analysis, inputText }: AnalysisResultsProps) {
  return (
    <div className="space-y-6 animate-slide-up">
      {/* Overall Score */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-center gap-8">
          <div className="relative">
            <ScoreGauge score={analysis.overallScore} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-800 mb-1">
              {getScoreLabel(analysis.overallScore)}
            </h3>
            <p className="text-sm text-slate-600 mb-3">{analysis.summary}</p>
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span>Provider: {analysis.provider}</span>
              <span>Models: {analysis.models.join(', ')}</span>
              <span>{new Date(analysis.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Highlighted Text View */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Highlighted Analysis</h3>
        <div className="prose prose-sm max-w-none">
          {analysis.sections.map((section, i) => (
            <span key={i} className={`${getHighlightClass(section.ai_probability)} cursor-help`} title={`${Math.round(section.ai_probability * 100)}% AI - ${section.rationale}`}>
              {section.text}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-4 mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded highlight-high" />
            <span className="text-xs text-slate-600">High probability</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded highlight-medium" />
            <span className="text-xs text-slate-600">Medium probability</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded highlight-low" />
            <span className="text-xs text-slate-600">Low probability</span>
          </div>
        </div>
      </div>

      {/* Section Details */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-800 mb-4">Section-by-Section Analysis</h3>
        <div className="space-y-3">
          {analysis.sections.map((section, i) => (
            <SectionCard key={i} section={section} index={i} />
          ))}
        </div>
      </div>

      {/* Per-Model Breakdown */}
      {analysis.perModelResults && analysis.perModelResults.length > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4">Per-Model Comparison</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.perModelResults.map((result, i) => (
              <div key={i} className="p-4 rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-slate-700">{result.model}</span>
                  <span className={`text-lg font-bold ${getScoreColor(result.overall_score)}`}>
                    {Math.round(result.overall_score * 100)}%
                  </span>
                </div>
                <p className="text-xs text-slate-600">{result.summary}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
