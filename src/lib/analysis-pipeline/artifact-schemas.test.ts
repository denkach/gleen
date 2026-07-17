import { describe, expect, it } from 'vitest';

import {
  flashcardsArtifactSchema,
  summaryArtifactSchema,
  timestampsArtifactSchema,
} from './artifact-schemas';

describe('versioned artifact schemas', () => {
  it('rejects a flashcard without a front or back', () => {
    expect(
      flashcardsArtifactSchema.safeParse({
        schemaVersion: 1,
        cards: [{ front: '', back: 'A' }],
      }).success,
    ).toBe(false);
  });

  it('rejects empty summary content and unsupported schema versions', () => {
    expect(
      summaryArtifactSchema.safeParse({
        schemaVersion: 2,
        title: 'Title',
        overview: '',
        keyPoints: [],
      }).success,
    ).toBe(false);
  });

  it('accepts only non-negative integral timestamp offsets', () => {
    expect(
      timestampsArtifactSchema.safeParse({
        schemaVersion: 1,
        chapters: [{ offsetMs: 0.5, title: 'Start', description: 'Overview' }],
      }).success,
    ).toBe(false);
  });
});
