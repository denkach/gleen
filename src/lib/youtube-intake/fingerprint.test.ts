import { describe, expect, test } from 'vitest';
import { createDuplicateKey } from './fingerprint';

const base = {
  outputLocale: 'en' as const,
  summaryPreset: 'balanced' as const,
  flashcardPreset: null,
  artifacts: ['summary', 'transcript'] as const,
  analysisContractVersion: 1 as const,
};

describe('createDuplicateKey', () => {
  test('is stable across artifact order and ignores inactive presets', () => {
    const first = createDuplicateKey('dQw4w9WgXcQ', base);
    const second = createDuplicateKey('dQw4w9WgXcQ', {
      ...base,
      artifacts: ['transcript', 'summary'],
      flashcardPreset: 30,
    });
    expect(first).toBe(second);
    expect(first).toMatch(/^[a-f0-9]{64}$/);

    const transcriptOnly = {
      ...base,
      artifacts: ['transcript'] as const,
      summaryPreset: 'balanced' as const,
      flashcardPreset: 18 as const,
    };
    expect(createDuplicateKey('dQw4w9WgXcQ', transcriptOnly)).toBe(
      createDuplicateKey('dQw4w9WgXcQ', {
        ...transcriptOnly,
        summaryPreset: 'detailed',
        flashcardPreset: 30,
      }),
    );
  });

  test('changes when a selected artifact or active preset changes', () => {
    expect(createDuplicateKey('dQw4w9WgXcQ', base)).not.toBe(
      createDuplicateKey('dQw4w9WgXcQ', { ...base, summaryPreset: 'detailed' }),
    );
    expect(createDuplicateKey('dQw4w9WgXcQ', base)).not.toBe(
      createDuplicateKey('dQw4w9WgXcQ', {
        ...base,
        artifacts: ['flashcards'],
        summaryPreset: null,
        flashcardPreset: 18,
      }),
    );
  });
});
