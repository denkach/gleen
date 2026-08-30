import { describe, expect, it } from 'vitest';

import { summaryArtifactV3Schema } from './artifact-schemas';
import {
  composedSummarySchema,
  composedSummaryJsonSchema,
  summaryIdeaMapSchema,
  summaryIdeaMapJsonSchema,
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

  it('rejects whitespace-only private idea text', () => {
    const idea = {
      id: 'idea-1',
      importance: 'medium',
      topic: 'Topic',
      claim: 'Claim',
      evidence: ['Evidence'],
      caveats: ['Caveat'],
      relationships: ['Relationship'],
      sourceOffsetsMs: [0],
    };

    for (const invalidIdea of [
      { ...idea, id: '  ' },
      { ...idea, topic: '  ' },
      { ...idea, claim: '  ' },
      { ...idea, evidence: ['  '] },
      { ...idea, caveats: ['  '] },
      { ...idea, relationships: ['  '] },
    ]) {
      expect(
        summaryIdeaMapSchema.safeParse({ ideas: [invalidIdea] }).success,
      ).toBe(false);
    }
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

  it('rejects whitespace-only composed text and coverage IDs', () => {
    const summary = {
      schemaVersion: 3,
      title: 'Title',
      outcome: 'Outcome',
      sections: [
        {
          title: 'Section',
          summary: 'Distinct thesis.',
          details: 'A complete explanation with evidence and caveats.',
          supportingQuote: 'Supporting quote.',
          sourceOffsetMs: 0,
          coveredIdeaIds: ['idea-1'],
        },
      ],
    } as const;

    for (const invalidSummary of [
      { ...summary, title: '  ' },
      { ...summary, outcome: '  ' },
      { ...summary, sections: [{ ...summary.sections[0], title: '  ' }] },
      { ...summary, sections: [{ ...summary.sections[0], summary: '  ' }] },
      { ...summary, sections: [{ ...summary.sections[0], details: '  ' }] },
      {
        ...summary,
        sections: [{ ...summary.sections[0], supportingQuote: '  ' }],
      },
      {
        ...summary,
        sections: [{ ...summary.sections[0], coveredIdeaIds: ['  '] }],
      },
    ]) {
      expect(composedSummarySchema.safeParse(invalidSummary).success).toBe(
        false,
      );
    }
  });

  it('requires non-whitespace text throughout private JSON schemas', () => {
    const ideaProperties =
      summaryIdeaMapJsonSchema.properties.ideas.items.properties;
    const sectionProperties =
      composedSummaryJsonSchema.properties.sections.items.properties;
    const textSchemas = [
      ideaProperties.id,
      ideaProperties.topic,
      ideaProperties.claim,
      ideaProperties.evidence.items,
      ideaProperties.caveats.items,
      ideaProperties.relationships.items,
      composedSummaryJsonSchema.properties.title,
      composedSummaryJsonSchema.properties.outcome,
      sectionProperties.title,
      sectionProperties.summary,
      sectionProperties.details,
      sectionProperties.supportingQuote.anyOf[0],
      sectionProperties.coveredIdeaIds.items,
    ];

    for (const schema of textSchemas) {
      expect(schema).toMatchObject({
        type: 'string',
        minLength: 1,
        pattern: '\\S',
      });
    }
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
