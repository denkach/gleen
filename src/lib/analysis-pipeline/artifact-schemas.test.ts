import { describe, expect, it } from 'vitest';

import {
  flashcardsArtifactSchema,
  summaryArtifactV1Schema,
  summaryArtifactV2Schema,
  summaryArtifactV3Schema,
  summaryArtifactSchema,
  summaryJsonSchema,
  timestampsArtifactSchema,
  transcriptArtifactSchema,
  transcriptArtifactV1Schema,
  transcriptArtifactV2Schema,
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

  it('rejects timestamp chapters that are not strictly chronological', () => {
    expect(
      timestampsArtifactSchema.safeParse({
        schemaVersion: 1,
        chapters: [
          { offsetMs: 10_000, title: 'Later', description: 'Later chapter' },
          { offsetMs: 5_000, title: 'Earlier', description: 'Out of order' },
        ],
      }).success,
    ).toBe(false);
    expect(
      timestampsArtifactSchema.safeParse({
        schemaVersion: 1,
        chapters: [
          { offsetMs: 5_000, title: 'First', description: 'First chapter' },
          { offsetMs: 5_000, title: 'Duplicate', description: 'Same offset' },
        ],
      }).success,
    ).toBe(false);
  });

  it('strictly accepts summary v3 sections with nullable grounding', () => {
    const summary = {
      schemaVersion: 3,
      title: 'Current summary',
      outcome: 'Use the source to make a grounded decision.',
      sections: [
        {
          title: 'Ground the decision',
          summary: 'The source provides the decision context.',
          details: 'Check the original explanation before acting.',
          supportingQuote: null,
          sourceOffsetMs: 0,
        },
      ],
    };

    expect(summaryArtifactV3Schema.parse(summary)).toEqual(summary);
    expect(summaryArtifactSchema.parse(summary)).toEqual(summary);
    expect(
      summaryArtifactV3Schema.safeParse({ ...summary, fabricated: true })
        .success,
    ).toBe(false);
    expect(summaryJsonSchema.properties.schemaVersion).toEqual({
      type: 'integer',
      const: 3,
    });
    expect(summaryJsonSchema.required).toEqual([
      'schemaVersion',
      'title',
      'outcome',
      'sections',
    ]);
  });

  it('preserves transcript v1 and strictly accepts classified transcript v2', () => {
    const legacy = {
      schemaVersion: 1,
      language: 'en',
      segments: [{ text: 'Legacy text', offsetMs: 0, durationMs: 1_000 }],
    };
    const current = {
      schemaVersion: 2,
      language: 'en',
      segments: [
        {
          text: 'Is this grounded?',
          offsetMs: 1_000,
          durationMs: 500,
          segmentType: 'question',
          speakerLabel: null,
        },
      ],
    };

    expect(transcriptArtifactV1Schema.parse(legacy)).toEqual(legacy);
    expect(transcriptArtifactV2Schema.parse(current)).toEqual(current);
    expect(transcriptArtifactSchema.parse(legacy)).toEqual(legacy);
    expect(transcriptArtifactSchema.parse(current)).toEqual(current);
    expect(
      transcriptArtifactV2Schema.safeParse({
        ...current,
        segments: [{ ...current.segments[0], speakerLabel: '' }],
      }).success,
    ).toBe(false);
  });

  it('validates transcript source text without trimming or rewriting it', () => {
    const sourceText = '  Keep source spacing exactly.  ';
    const current = transcriptArtifactV2Schema.parse({
      schemaVersion: 2,
      language: 'en',
      segments: [
        {
          text: sourceText,
          offsetMs: 0,
          durationMs: 1_000,
          segmentType: 'other',
          speakerLabel: null,
        },
      ],
    });

    expect(current.segments[0]?.text).toBe(sourceText);
    expect(
      transcriptArtifactV1Schema.safeParse({
        schemaVersion: 1,
        language: 'en',
        segments: [{ text: '   ', offsetMs: 0, durationMs: 1_000 }],
      }).success,
    ).toBe(false);
    expect(
      transcriptArtifactV2Schema.safeParse({
        schemaVersion: 2,
        language: 'en',
        segments: [
          {
            text: '\n\t',
            offsetMs: 0,
            durationMs: 1_000,
            segmentType: 'other',
            speakerLabel: null,
          },
        ],
      }).success,
    ).toBe(false);
  });
});
