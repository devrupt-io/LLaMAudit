import { aggregateResults } from '../src/services/analyzer';
import { DetectionResult } from '../src/services/openrouter';

describe('Analyzer Service', () => {
  const sampleResult: DetectionResult = {
    sections: [
      {
        text: 'This is a test paragraph.',
        ai_probability: 0.8,
        rationale: 'Formulaic structure',
        markers: ['formulaic'],
      },
      {
        text: 'Another human paragraph here.',
        ai_probability: 0.2,
        rationale: 'Personal voice detected',
        markers: ['personal'],
      },
    ],
    overall_score: 0.5,
    summary: 'Mixed content detected',
    model: 'test-model',
  };

  it('returns empty result for no inputs', () => {
    const result = aggregateResults([]);
    expect(result.overallScore).toBe(0);
    expect(result.sections).toEqual([]);
  });

  it('returns single result unchanged', () => {
    const result = aggregateResults([sampleResult]);
    expect(result.overallScore).toBe(0.5);
    expect(result.sections).toHaveLength(2);
    expect(result.sections[0].ai_probability).toBe(0.8);
  });

  it('averages scores across multiple models', () => {
    const result2: DetectionResult = {
      sections: [
        {
          text: 'This is a test paragraph.',
          ai_probability: 0.6,
          rationale: 'Somewhat formulaic',
          markers: ['transitions'],
        },
        {
          text: 'Another human paragraph here.',
          ai_probability: 0.4,
          rationale: 'Some AI markers',
          markers: ['hedging'],
        },
      ],
      overall_score: 0.5,
      summary: 'Moderate AI content',
      model: 'test-model-2',
    };

    const result = aggregateResults([sampleResult, result2]);
    expect(result.overallScore).toBe(0.5);
    expect(result.sections[0].ai_probability).toBe(0.7); // avg of 0.8 and 0.6
    expect(result.sections[1].ai_probability).toBeCloseTo(0.3); // avg of 0.2 and 0.4
    expect(result.sections[0].markers).toContain('formulaic');
    expect(result.sections[0].markers).toContain('transitions');
  });
});
