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
        summaryPreset: 'deep',
        flashcardPreset: 30,
        artifacts: ['transcript', 'summary', 'summary'],
        analysisContractVersion: 1,
      }),
    ).toMatchObject({
      artifacts: ['summary', 'transcript'],
      flashcardPreset: null,
    });
  });

  test('accepts only canonical summary presets for new intakes', () => {
    expect(() =>
      normalizeIntakeConfiguration({
        outputLocale: 'en',
        summaryPreset: 'detailed',
        flashcardPreset: 18,
        artifacts: ['summary'],
        analysisContractVersion: 1,
      }),
    ).toThrow();
  });
});
