import { describe, expect, it } from 'vitest';

import { createDeterministicProvider } from './deterministic-provider';
import {
  generateFlashcards,
  generateSummary,
  generateTimestamps,
  type GeneratorContext,
} from './generators';

const context: GeneratorContext = {
  outputLocale: 'uk',
  transcriptLanguage: 'en',
  summaryPreset: 'detailed',
  flashcardPreset: 18,
  durationSeconds: 120,
  transcriptSegments: [
    { text: 'First idea', offsetMs: 0, durationMs: 1_000 },
    { text: 'Second idea', offsetMs: 1_000, durationMs: 1_000 },
  ],
};

describe('artifact generators', () => {
  it('passes locale and preset to focused summary generation', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_v3: {
        schemaVersion: 3,
        title: 'Title',
        outcome: 'Outcome',
        sections: [
          {
            title: 'Point',
            summary: 'Second idea',
            details: 'Grounded details',
            supportingQuote: 'Second idea',
            sourceOffsetMs: 1_000,
          },
        ],
      },
    });

    const result = await generateSummary(provider, context);

    expect(provider.requests[0]).toMatchObject({
      name: 'gleen_summary_v3',
      jsonSchema: {
        properties: { schemaVersion: { type: 'integer', const: 3 } },
      },
    });
    expect(provider.requests[0]?.input).toContain('Output locale: uk');
    expect(provider.requests[0]?.input).toContain('Preset: detailed');
    expect(provider.requests[0]?.input).toContain('[0ms] First idea');
    expect(provider.requests[0]?.system).toContain('sourceOffsetMs');
    expect(provider.requests[0]?.system).toContain('supportingQuote');
    expect(result.value.sections[0]).toMatchObject({
      supportingQuote: 'Second idea',
      sourceOffsetMs: 1_000,
    });
  });

  it('nulls ungrounded quotes and section offsets outside the duration', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_v3: {
        schemaVersion: 3,
        title: 'Title',
        outcome: 'Outcome',
        sections: [
          {
            title: 'Point',
            summary: 'A summary',
            details: 'Details',
            supportingQuote: 'This was never said',
            sourceOffsetMs: 120_001,
          },
          {
            title: 'Normalized grounding',
            summary: 'A summary',
            details: 'Details',
            supportingQuote: '  SECOND   IDEA ',
            sourceOffsetMs: null,
          },
          {
            title: 'Fabricated in-range offset',
            summary: 'A summary',
            details: 'Details',
            supportingQuote: null,
            sourceOffsetMs: 500,
          },
          {
            title: 'Quote at the wrong real segment',
            summary: 'A summary',
            details: 'Details',
            supportingQuote: 'Second idea',
            sourceOffsetMs: 0,
          },
        ],
      },
    });

    const result = await generateSummary(provider, context);

    expect(result.value.sections).toEqual([
      expect.objectContaining({
        supportingQuote: null,
        sourceOffsetMs: null,
      }),
      expect.objectContaining({
        supportingQuote: 'SECOND   IDEA',
        sourceOffsetMs: null,
      }),
      expect.objectContaining({
        supportingQuote: null,
        sourceOffsetMs: null,
      }),
      expect.objectContaining({
        supportingQuote: 'Second idea',
        sourceOffsetMs: null,
      }),
    ]);
  });

  it('passes the requested card count to flashcard generation', async () => {
    const provider = createDeterministicProvider({
      gleen_flashcards_v1: {
        schemaVersion: 1,
        cards: [{ front: 'Q', back: 'A' }],
      },
    });

    await generateFlashcards(provider, context);

    expect(provider.requests[0]?.input).toContain('Card count: 18');
  });

  it('rejects chapters outside the video duration after provider parsing', async () => {
    const provider = createDeterministicProvider({
      gleen_timestamps_v1: {
        schemaVersion: 1,
        chapters: [
          { offsetMs: 120_001, title: 'Late', description: 'Too late' },
        ],
      },
    });

    await expect(generateTimestamps(provider, context)).rejects.toThrow(
      'Timestamp exceeds video duration',
    );
  });
});
