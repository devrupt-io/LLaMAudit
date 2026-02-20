import React from 'react';
import { render, screen } from '@testing-library/react';
import AnalysisResults from '@/components/AnalysisResults';
import { AnalysisResponse } from '@/types';

const mockAnalysis: AnalysisResponse = {
  id: 'test-id',
  title: 'Test Analysis',
  overallScore: 0.65,
  sections: [
    {
      text: 'This paragraph appears to be AI generated.',
      ai_probability: 0.85,
      rationale: 'Formulaic structure detected',
      markers: ['formulaic transitions', 'perfect structure'],
    },
    {
      text: 'This one seems human written.',
      ai_probability: 0.15,
      rationale: 'Personal voice detected',
      markers: ['personal anecdote'],
    },
  ],
  models: ['test-model'],
  provider: 'openrouter',
  summary: 'Mixed content detected',
  perModelResults: [],
  createdAt: new Date().toISOString(),
};

describe('AnalysisResults', () => {
  it('renders overall score', () => {
    render(<AnalysisResults analysis={mockAnalysis} inputText="" />);
    expect(screen.getByText('65%')).toBeInTheDocument();
  });

  it('renders summary text', () => {
    render(<AnalysisResults analysis={mockAnalysis} inputText="" />);
    expect(screen.getByText('Mixed content detected')).toBeInTheDocument();
  });

  it('renders section cards', () => {
    render(<AnalysisResults analysis={mockAnalysis} inputText="" />);
    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
  });

  it('shows AI probability for sections', () => {
    render(<AnalysisResults analysis={mockAnalysis} inputText="" />);
    expect(screen.getByText('85% AI')).toBeInTheDocument();
    expect(screen.getByText('15% AI')).toBeInTheDocument();
  });

  it('displays markers', () => {
    render(<AnalysisResults analysis={mockAnalysis} inputText="" />);
    expect(screen.getByText('formulaic transitions')).toBeInTheDocument();
    expect(screen.getByText('personal anecdote')).toBeInTheDocument();
  });

  it('shows provider and model info', () => {
    render(<AnalysisResults analysis={mockAnalysis} inputText="" />);
    expect(screen.getByText(/openrouter/)).toBeInTheDocument();
    expect(screen.getByText(/test-model/)).toBeInTheDocument();
  });
});
