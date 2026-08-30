import { describe, expect, it } from 'vitest';

import { summaryArtifactV3Schema } from './artifact-schemas';
import {
  composedSummarySchema,
  summaryIdeaMapSchema,
  toSummaryArtifact,
} from './summary-generation-schemas';

describe('private summary generation schemas', () => {
  it('accepts grounded idea clusters with stable identifiers', () => {
    expect(
      summaryIdeaMapSchema.parse({
        ideas: [
          {
            id: 'idea-1',
            importance: 'high',
            topic: 'Cooperation',
            claim: 'Repeated interaction changes incentives.',
            evidence: ['Future encounters reward cooperation.'],
            caveats: ['This depends on recognizing the other participant.'],
            relationships: [],
            sourceOffsetsMs: [60_000],
          },
        ],
      }),
    ).toBeDefined();
  });

  it('rejects duplicate idea identifiers and invalid grounding', () => {
    const idea = {
      id: 'idea-1',
      importance: 'medium',
      topic: 'Topic',
      claim: 'Claim',
      evidence: ['Evidence'],
      caveats: [],
      relationships: [],
      sourceOffsetsMs: [0],
    };

    expect(
      summaryIdeaMapSchema.safeParse({ ideas: [idea, { ...idea }] }).success,
    ).toBe(false);
    expect(
      summaryIdeaMapSchema.safeParse({
        ideas: [{ ...idea, evidence: [], sourceOffsetsMs: [-1] }],
      }).success,
    ).toBe(false);
  });

  it('requires each composed section to declare covered idea IDs', () => {
    expect(() =>
      composedSummarySchema.parse({
        schemaVersion: 3,
        title: 'Title',
        outcome: 'Outcome',
        sections: [
          {
            title: 'Section',
            summary: 'Distinct thesis.',
            details: 'A complete explanation with evidence and caveats.',
            supportingQuote: null,
            sourceOffsetMs: null,
          },
        ],
      }),
    ).toThrow();
  });

  it('rejects duplicate coverage IDs within a section', () => {
    expect(
      composedSummarySchema.safeParse({
        schemaVersion: 3,
        title: 'Title',
        outcome: 'Outcome',
        sections: [
          {
            title: 'Section',
            summary: 'Distinct thesis.',
            details: 'A complete explanation with evidence and caveats.',
            supportingQuote: null,
            sourceOffsetMs: null,
            coveredIdeaIds: ['idea-1', 'idea-1'],
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('strips private coverage IDs before public artifact persistence', () => {
    const artifact = toSummaryArtifact(
      composedSummarySchema.parse({
        schemaVersion: 3,
        title: 'Title',
        outcome: 'Outcome',
        sections: [
          {
            title: 'Section',
            summary: 'Distinct thesis.',
            details: 'A complete explanation with evidence and caveats.',
            supportingQuote: null,
            sourceOffsetMs: 0,
            coveredIdeaIds: ['idea-1'],
          },
        ],
      }),
    );

    expect(artifact).toEqual({
      schemaVersion: 3,
      title: 'Title',
      outcome: 'Outcome',
      sections: [
        {
          title: 'Section',
          summary: 'Distinct thesis.',
          details: 'A complete explanation with evidence and caveats.',
          supportingQuote: null,
          sourceOffsetMs: 0,
        },
      ],
    });
    expect(summaryArtifactV3Schema.parse(artifact)).toEqual(artifact);
  });
});
