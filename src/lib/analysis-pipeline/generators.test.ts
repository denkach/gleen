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
      gleen_summary_v1: {
        schemaVersion: 1,
        title: 'Title',
        overview: 'Overview',
        keyPoints: ['Point'],
      },
    });

    await generateSummary(provider, context);

    expect(provider.requests[0]).toMatchObject({ name: 'gleen_summary_v1' });
    expect(provider.requests[0]?.input).toContain('Output locale: uk');
    expect(provider.requests[0]?.input).toContain('Preset: detailed');
    expect(provider.requests[0]?.input).toContain('[0ms] First idea');
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
