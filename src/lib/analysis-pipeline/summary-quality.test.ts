import { describe, expect, it } from 'vitest';

import type {
  ComposedSummary,
  SummaryIdeaMap,
} from './summary-generation-schemas';
import type { SummaryGenerationPolicy } from './summary-policy';
import { requiresRepair, validateComposedSummary } from './summary-quality';

const policy: SummaryGenerationPolicy = {
  route: 'two-pass',
  sectionRange: { min: 8, max: 12 },
  signals: {
    durationSeconds: 1_200,
    wordCount: 4_000,
    segmentCount: 400,
  },
};

const ideaMap: SummaryIdeaMap = {
  ideas: [
    {
      id: 'idea-critical',
      importance: 'high',
      topic: 'Critical topic',
      claim: 'Critical claim',
      evidence: ['Grounded evidence'],
      caveats: [],
      relationships: [],
      sourceOffsetsMs: [0],
    },
    {
      id: 'idea-secondary',
      importance: 'medium',
      topic: 'Secondary topic',
      claim: 'Secondary claim',
      evidence: ['Secondary evidence'],
      caveats: [],
      relationships: [],
      sourceOffsetsMs: [1_000],
    },
  ],
};

const summary: ComposedSummary = {
  schemaVersion: 3,
  title: 'Title',
  outcome: 'Outcome',
  sections: [
    {
      title: 'Different topic',
      summary: 'A distinct short thesis.',
      details: 'A complete explanation that does not cover the critical idea.',
      supportingQuote: null,
      sourceOffsetMs: null,
      coveredIdeaIds: ['idea-secondary'],
    },
  ],
};

function idea(
  id: string,
  importance: 'high' | 'medium' = 'medium',
): SummaryIdeaMap['ideas'][number] {
  return {
    id,
    importance,
    topic: `Topic ${id}`,
    claim: `Claim ${id}`,
    evidence: [`Evidence ${id}`],
    caveats: [],
    relationships: [],
    sourceOffsetsMs: [0],
  };
}

function section(
  id: string,
  index: number,
): ComposedSummary['sections'][number] {
  return {
    title: `Section ${index}`,
    summary: `Distinct thesis ${index}`,
    details: `A complete and distinct explanation for section number ${index}.`,
    supportingQuote: null,
    sourceOffsetMs: index * 1_000,
    coveredIdeaIds: [id],
  };
}

describe('validateComposedSummary', () => {
  it('rejects an omitted high-importance idea even when section count is in range', () => {
    const inRangeSummary: ComposedSummary = {
      ...summary,
      sections: Array.from({ length: 8 }, (_, index) =>
        section('idea-secondary', index),
      ),
    };

    expect(
      validateComposedSummary({ ideaMap, summary: inRangeSummary, policy }),
    ).toContainEqual(
      expect.objectContaining({
        code: 'missing_high_importance',
        ideaIds: ['idea-critical'],
      }),
    );
  });

  it('rejects covered idea IDs that are absent from the idea map', () => {
    const findings = validateComposedSummary({
      ideaMap,
      summary: {
        ...summary,
        sections: [
          {
            ...summary.sections[0],
            coveredIdeaIds: ['idea-critical', 'idea-unknown'],
          },
        ],
      },
      policy,
    });

    expect(findings).toContainEqual({
      code: 'unknown_idea',
      ideaIds: ['idea-unknown'],
    });
  });

  it('flags normalized thesis and detail repetition', () => {
    const repeatedSummary: ComposedSummary = {
      ...summary,
      sections: [
        {
          ...summary.sections[0],
          summary:
            'Repeated normalized section text with enough comparison tokens.',
          details:
            'ＲＥＰＥＡＴＥＤ  normalized section text—with enough comparison tokens!',
          coveredIdeaIds: ['idea-critical'],
        },
      ],
    };

    expect(
      validateComposedSummary({ ideaMap, summary: repeatedSummary, policy }),
    ).toContainEqual({
      code: 'duplicate_section_text',
      sectionIndexes: [0],
    });
  });

  it('flags nonempty exact normalized repetition below the similarity token floor', () => {
    const findings = validateComposedSummary({
      ideaMap,
      summary: {
        ...summary,
        sections: [
          {
            ...summary.sections[0],
            summary: 'Same short thesis.',
            details: 'ＳＡＭＥ short thesis!',
            coveredIdeaIds: ['idea-critical'],
          },
        ],
      },
      policy,
    });

    expect(findings).toContainEqual({
      code: 'duplicate_section_text',
      sectionIndexes: [0],
    });
  });

  it('flags near-duplicate thesis and details at the Jaccard threshold', () => {
    const findings = validateComposedSummary({
      ideaMap,
      summary: {
        ...summary,
        sections: [
          {
            ...summary.sections[0],
            summary: 'one two three four five six seven eight nine ten eleven',
            details: 'one two three four five six seven eight nine ten twelve',
            coveredIdeaIds: ['idea-critical'],
          },
        ],
      },
      policy,
    });

    expect(findings).toContainEqual({
      code: 'duplicate_section_text',
      sectionIndexes: [0],
    });
  });

  it('does not apply Jaccard similarity below eight tokens', () => {
    const findings = validateComposedSummary({
      ideaMap,
      summary: {
        ...summary,
        sections: [
          {
            ...summary.sections[0],
            summary: 'same short text appears here',
            details: 'same short text changes here',
            coveredIdeaIds: ['idea-critical'],
          },
          {
            ...summary.sections[0],
            title: 'Distinct explanation',
            summary: 'one two three four five six seven eight',
            details: 'nine ten eleven twelve thirteen fourteen fifteen sixteen',
            coveredIdeaIds: ['idea-secondary'],
          },
        ],
      },
      policy,
    });

    expect(findings.map(({ code }) => code)).not.toContain(
      'duplicate_section_text',
    );
  });

  it('flags repeated details in adjacent sections', () => {
    const details =
      'The same complete explanation contains enough tokens for duplicate comparison.';
    const findings = validateComposedSummary({
      ideaMap,
      summary: {
        ...summary,
        sections: [
          {
            ...summary.sections[0],
            title: 'First title',
            details,
            coveredIdeaIds: ['idea-critical'],
          },
          {
            ...summary.sections[0],
            title: 'Second title',
            details,
            coveredIdeaIds: ['idea-secondary'],
          },
        ],
      },
      policy,
    });

    expect(findings).toContainEqual({
      code: 'duplicate_adjacent_section',
      sectionIndexes: [0, 1],
    });
  });

  it('reports a lower structural range only when enough ideas can fill it', () => {
    const enoughIdeas: SummaryIdeaMap = {
      ideas: Array.from({ length: 8 }, (_, index) => idea(`idea-${index}`)),
    };
    const coveredSummary: ComposedSummary = {
      ...summary,
      sections: [section('idea-0', 0)],
    };

    expect(
      validateComposedSummary({
        ideaMap: enoughIdeas,
        summary: coveredSummary,
        policy,
      }),
    ).toContainEqual({
      code: 'structural_range',
      sectionIndexes: [0],
    });

    expect(
      validateComposedSummary({ ideaMap, summary: coveredSummary, policy }).map(
        ({ code }) => code,
      ),
    ).not.toContain('structural_range');
  });

  it('reports an upper structural range when high-importance coverage can remain', () => {
    const roomyIdeaMap: SummaryIdeaMap = {
      ideas: Array.from({ length: 13 }, (_, index) =>
        idea(`idea-${index}`, index === 0 ? 'high' : 'medium'),
      ),
    };
    const roomySummary: ComposedSummary = {
      ...summary,
      sections: Array.from({ length: 13 }, (_, index) =>
        section(`idea-${index}`, index),
      ),
    };

    expect(
      validateComposedSummary({
        ideaMap: roomyIdeaMap,
        summary: roomySummary,
        policy,
      }),
    ).toContainEqual({
      code: 'structural_range',
      sectionIndexes: Array.from({ length: 13 }, (_, index) => index),
    });
  });

  it('reports an upper range when multiple retained sections jointly cover every high-importance idea', () => {
    const setCoverIdeaMap: SummaryIdeaMap = {
      ideas: [
        idea('idea-high-1', 'high'),
        idea('idea-high-2', 'high'),
        idea('idea-high-3', 'high'),
        idea('idea-medium', 'medium'),
      ],
    };
    const setCoverSummary: ComposedSummary = {
      ...summary,
      sections: [
        {
          ...section('idea-high-1', 0),
          coveredIdeaIds: ['idea-high-1', 'idea-high-2'],
        },
        section('idea-high-3', 1),
        section('idea-medium', 2),
      ],
    };

    expect(
      validateComposedSummary({
        ideaMap: setCoverIdeaMap,
        summary: setCoverSummary,
        policy: { ...policy, sectionRange: { min: 1, max: 2 } },
      }),
    ).toContainEqual({
      code: 'structural_range',
      sectionIndexes: [0, 1, 2],
    });
  });

  it('does not use the upper range to drop required coverage', () => {
    const criticalIdeaMap: SummaryIdeaMap = {
      ideas: Array.from({ length: 13 }, (_, index) =>
        idea(`idea-${index}`, 'high'),
      ),
    };
    const criticalSummary: ComposedSummary = {
      ...summary,
      sections: Array.from({ length: 13 }, (_, index) =>
        section(`idea-${index}`, index),
      ),
    };

    expect(
      validateComposedSummary({
        ideaMap: criticalIdeaMap,
        summary: criticalSummary,
        policy,
      }).map(({ code }) => code),
    ).not.toContain('structural_range');
  });
});

describe('requiresRepair', () => {
  it('requires repair for every quality finding including unknown ideas', () => {
    expect(requiresRepair([])).toBe(false);
    expect(
      requiresRepair([{ code: 'unknown_idea', ideaIds: ['idea-unknown'] }]),
    ).toBe(true);
  });
});
