import { describe, expect, it } from 'vitest';

import {
  resultArtifactEditSchema,
  resultTitleEditSchema,
} from './edit-schemas';

const analysisId = '11111111-1111-4111-8111-111111111111';
const expectedUpdatedAt = '2026-07-18T10:00:00.000Z';

describe('result workspace edit schemas', () => {
  it('rejects invalid analysis ids', () => {
    expect(
      resultTitleEditSchema.safeParse({
        analysisId: 'not-a-uuid',
        title: 'Edited title',
        expectedUpdatedAt,
      }).success,
    ).toBe(false);
  });

  it.each(['transcript', 'unsupported'])(
    'rejects %s artifact edits',
    (kind) => {
      expect(
        resultArtifactEditSchema.safeParse({
          analysisId,
          kind,
          content: {},
          expectedUpdatedAt,
        }).success,
      ).toBe(false);
    },
  );

  it('rejects malformed artifact content', () => {
    expect(
      resultArtifactEditSchema.safeParse({
        analysisId,
        kind: 'flashcards',
        content: { schemaVersion: 1, cards: [] },
        expectedUpdatedAt,
      }).success,
    ).toBe(false);
  });

  it('parses content according to the editable artifact kind', () => {
    expect(
      resultArtifactEditSchema.parse({
        analysisId,
        kind: 'timestamps',
        content: {
          schemaVersion: 1,
          chapters: [
            { offsetMs: 0, title: 'Opening', description: 'Introduction' },
          ],
        },
        expectedUpdatedAt,
      }),
    ).toEqual({
      analysisId,
      kind: 'timestamps',
      content: {
        schemaVersion: 1,
        chapters: [
          { offsetMs: 0, title: 'Opening', description: 'Introduction' },
        ],
      },
      expectedUpdatedAt,
    });
  });

  it('accepts the same strict summary v3 contract for owner autosave', () => {
    const input = {
      analysisId,
      kind: 'summary' as const,
      content: {
        schemaVersion: 3 as const,
        title: 'Edited summary',
        outcome: 'Apply the grounded outcome.',
        sections: [
          {
            title: 'Grounding',
            summary: 'Use the original source.',
            details: 'The source provides the decision context.',
            supportingQuote: null,
            sourceOffsetMs: null,
          },
        ],
      },
      expectedUpdatedAt,
    };

    expect(resultArtifactEditSchema.parse(input)).toEqual(input);
    expect(
      resultArtifactEditSchema.safeParse({
        ...input,
        content: { ...input.content, unexpected: true },
      }).success,
    ).toBe(false);
  });
});
