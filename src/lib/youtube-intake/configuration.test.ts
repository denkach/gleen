import { describe, expect, test } from 'vitest';
import {
  defaultArtifactSelection,
  normalizeIntakeConfiguration,
} from './configuration';

describe('intake configuration', () => {
  test('uses the approved artifact defaults', () => {
    expect(defaultArtifactSelection).toEqual([
      'summary',
      'timestamps',
      'transcript',
    ]);
  });

  test('requires at least one artifact and removes duplicates', () => {
    expect(() =>
      normalizeIntakeConfiguration({
        outputLocale: 'en',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
        artifacts: [],
        analysisContractVersion: 1,
      }),
    ).toThrow();
    expect(
      normalizeIntakeConfiguration({
        outputLocale: 'en',
        summaryPreset: 'detailed',
        flashcardPreset: 30,
        artifacts: ['transcript', 'summary', 'summary'],
        analysisContractVersion: 1,
      }),
    ).toMatchObject({
      artifacts: ['summary', 'transcript'],
      flashcardPreset: null,
    });
  });
});
