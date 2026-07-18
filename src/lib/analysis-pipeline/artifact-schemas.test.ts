import { describe, expect, it } from 'vitest';

import {
  flashcardsArtifactSchema,
  summaryArtifactV1Schema,
  summaryArtifactV2Schema,
  summaryArtifactSchema,
  summaryJsonSchema,
  timestampsArtifactSchema,
} from './artifact-schemas';

describe('versioned artifact schemas', () => {
  it('keeps legacy summary v1 strings readable', () => {
    const summary = {
      schemaVersion: 1,
      title: 'Legacy',
      overview: 'Overview',
      keyPoints: ['A legacy point'],
    };

    expect(summaryArtifactV1Schema.parse(summary)).toBeDefined();
    expect(summaryArtifactSchema.parse(summary)).toBeDefined();
  });

  it('accepts summary v2 key points with non-negative integer source offsets', () => {
    const summary = {
      schemaVersion: 2,
      title: 'Current',
      overview: 'Overview',
      keyPoints: [{ text: 'A sourced point', sourceOffsetMs: 12_000 }],
    };

    expect(summaryArtifactV2Schema.parse(summary)).toBeDefined();
    expect(summaryArtifactSchema.parse(summary)).toBeDefined();
  });

  it('requires summary v2 key point source offsets while accepting zero', () => {
    expect(() =>
      summaryArtifactV2Schema.parse({
        schemaVersion: 2,
        title: 'Title',
        overview: 'Overview',
        keyPoints: [{ text: 'Grounded point' }],
      }),
    ).toThrow();

    expect(
      summaryArtifactV2Schema.parse({
        schemaVersion: 2,
        title: 'Title',
        overview: 'Overview',
        keyPoints: [{ text: 'Grounded point', sourceOffsetMs: 0 }],
      }),
    ).toBeDefined();
    expect(summaryJsonSchema.properties.keyPoints.items.required).toEqual([
      'text',
      'sourceOffsetMs',
    ]);
  });

  it('rejects invalid summary v2 source offsets', () => {
    expect(() =>
      summaryArtifactSchema.parse({
        schemaVersion: 2,
        title: 'Invalid',
        overview: 'Overview',
        keyPoints: [{ text: 'Bad source', sourceOffsetMs: -1 }],
      }),
    ).toThrow();
  });

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
