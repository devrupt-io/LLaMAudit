// AI Detection Analysis - Structured Output Schema
// This schema defines the expected JSON output format from the LLM.
// Edit this file to modify what the AI model returns.

export const aiDetectionSchema = {
  type: 'json_schema' as const,
  json_schema: {
    name: 'ai_detection_analysis',
    strict: true,
    schema: {
      type: 'object',
      properties: {
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: {
                type: 'string',
                description: 'The exact text segment being analyzed',
              },
              ai_probability: {
                type: 'number',
                description: 'Probability (0.0-1.0) that this section was AI-generated',
              },
              rationale: {
                type: 'string',
                description: 'Brief explanation of why this section may or may not be AI-generated',
              },
              markers: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific linguistic markers detected (e.g. "formulaic transitions", "lack of personal voice", "perfect paragraph structure")',
              },
            },
            required: ['text', 'ai_probability', 'rationale', 'markers'],
            additionalProperties: false,
          },
          description: 'Analysis of each paragraph/section of the text',
        },
        overall_score: {
          type: 'number',
          description: 'Overall probability (0.0-1.0) that the text contains AI-generated content',
        },
        summary: {
          type: 'string',
          description: 'A brief overall assessment of the text',
        },
        title: {
          type: 'string',
          description: 'A short descriptive title (3-8 words) summarizing what this text is about',
        },
      },
      required: ['sections', 'overall_score', 'summary', 'title'],
      additionalProperties: false,
    },
  },
};

// Ollama-compatible format description (used when structured output isn't available)
export const DETECTION_FORMAT = {
  sections: [
    {
      text: 'string',
      ai_probability: 0.0,
      rationale: 'string',
      markers: ['string'],
    },
  ],
  overall_score: 0.0,
  summary: 'string',
  title: 'string',
};
