import { describe, expect, it } from 'vitest';

import { createDeterministicProvider } from './deterministic-provider';
import {
  generateFlashcards,
  generateSummary,
  generateTimestamps,
  SummaryGenerationError,
  type GeneratorContext,
} from './generators';

const context: GeneratorContext = {
  outputLocale: 'uk',
  transcriptLanguage: 'en',
  summaryPreset: 'deep',
  flashcardPreset: 18,
  durationSeconds: 120,
  transcriptSegments: [
    { text: 'First idea', offsetMs: 0, durationMs: 1_000 },
    { text: 'Second idea', offsetMs: 1_000, durationMs: 1_000 },
  ],
};

const validSummaryFixture = {
  schemaVersion: 3,
  title: 'Title',
  outcome: 'Outcome',
  sections: [
    {
      title: 'Point',
      summary: 'A distinct short thesis.',
      details:
        'A complete explanation adds evidence and context without repeating the thesis.',
      supportingQuote: 'First idea',
      sourceOffsetMs: 0,
    },
  ],
} as const;

const ideaMapFixture = {
  ideas: [
    {
      id: 'idea-critical',
      importance: 'high',
      topic: 'Critical topic',
      claim: 'Critical claim',
      evidence: ['First idea'],
      caveats: ['Keep the important caveat.'],
      relationships: [],
      sourceOffsetsMs: [0],
    },
    {
      id: 'idea-secondary',
      importance: 'medium',
      topic: 'Secondary topic',
      claim: 'Secondary claim',
      evidence: ['Second idea'],
      caveats: [],
      relationships: ['Supports idea-critical'],
      sourceOffsetsMs: [1_000],
    },
  ],
} as const;

const validCompositionFixture = {
  ...validSummaryFixture,
  sections: [
    {
      ...validSummaryFixture.sections[0],
      coveredIdeaIds: ['idea-critical', 'idea-secondary'],
    },
  ],
} as const;

function contextWithDuration(durationSeconds: number): GeneratorContext {
  return { ...context, durationSeconds, summaryPreset: 'balanced' };
}

function deepContextWithDuration(durationSeconds: number): GeneratorContext {
  return { ...context, durationSeconds, summaryPreset: 'deep' };
}

function compositionWithSections(sectionCount: number) {
  return {
    ...validCompositionFixture,
    sections: Array.from({ length: sectionCount }, (_, index) => ({
      ...validCompositionFixture.sections[0],
      title: `Chapter ${index + 1}`,
      summary: `Distinct thesis for chapter ${index + 1}.`,
      details: `Grounded evidence, context, and implications for distinct chapter ${index + 1}.`,
      supportingQuote: null,
      sourceOffsetMs: index % 2 === 0 ? 0 : 1_000,
      coveredIdeaIds: [index % 2 === 0 ? 'idea-critical' : 'idea-secondary'],
    })),
  };
}

describe('artifact generators', () => {
  it('passes locale and preset to focused summary generation', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_v3: {
        schemaVersion: 3,
        title: 'Title',
        outcome: 'Outcome',
        sections: [
          {
            title: 'Point',
            summary: 'Second idea',
            details: 'Grounded details',
            supportingQuote: 'Second idea',
            sourceOffsetMs: 1_000,
          },
        ],
      },
    });

    const result = await generateSummary(provider, context);

    expect(provider.requests[0]).toMatchObject({
      name: 'gleen_summary_v3',
      jsonSchema: {
        properties: { schemaVersion: { type: 'integer', const: 3 } },
      },
    });
    expect(provider.requests[0]?.input).toContain('Output locale: uk');
    expect(provider.requests[0]?.input).toContain('Transcript language: en');
    expect(provider.requests[0]?.input).toContain('Preset: deep');
    expect(provider.requests[0]?.input).toContain('[0ms] First idea');
    expect(provider.requests[0]?.system).toContain('sourceOffsetMs');
    expect(provider.requests[0]?.system).toContain('supportingQuote');
    expect(result.value.sections[0]).toMatchObject({
      supportingQuote: 'Second idea',
      sourceOffsetMs: 1_000,
    });
  });

  it('nulls ungrounded quotes and section offsets outside the duration', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_v3: {
        schemaVersion: 3,
        title: 'Title',
        outcome: 'Outcome',
        sections: [
          {
            title: 'Point',
            summary: 'A summary',
            details: 'Details for ungrounded quote handling.',
            supportingQuote: 'This was never said',
            sourceOffsetMs: 120_001,
          },
          {
            title: 'Normalized grounding',
            summary: 'A summary',
            details: 'Details for normalized quote handling.',
            supportingQuote: '  SECOND   IDEA ',
            sourceOffsetMs: null,
          },
          {
            title: 'Fabricated in-range offset',
            summary: 'A summary',
            details: 'Details for fabricated offset handling.',
            supportingQuote: null,
            sourceOffsetMs: 500,
          },
          {
            title: 'Quote at the wrong real segment',
            summary: 'A summary',
            details: 'Details for a real but incorrect segment.',
            supportingQuote: 'Second idea',
            sourceOffsetMs: 0,
          },
        ],
      },
    });

    const result = await generateSummary(provider, context);

    expect(result.value.sections).toEqual([
      expect.objectContaining({
        supportingQuote: null,
        sourceOffsetMs: null,
      }),
      expect.objectContaining({
        supportingQuote: 'SECOND   IDEA',
        sourceOffsetMs: null,
      }),
      expect.objectContaining({
        supportingQuote: null,
        sourceOffsetMs: null,
      }),
      expect.objectContaining({
        supportingQuote: 'Second idea',
        sourceOffsetMs: null,
      }),
    ]);
  });

  it('uses one call at 19:59 and mandatory idea-map plus composition at 20:00', async () => {
    const shortProvider = createDeterministicProvider({
      gleen_summary_v3: validSummaryFixture,
    });
    await generateSummary(shortProvider, contextWithDuration(1_199));
    expect(shortProvider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_v3',
    ]);

    const longProvider = createDeterministicProvider({
      gleen_summary_idea_map_v1: ideaMapFixture,
      gleen_summary_compose_v3: validCompositionFixture,
    });
    const result = await generateSummary(
      longProvider,
      contextWithDuration(1_200),
    );

    expect(longProvider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_idea_map_v1',
      'gleen_summary_compose_v3',
    ]);
    expect(result.metadata).toEqual({
      route: 'two-pass',
      repairCount: 0,
      passes: [
        {
          name: 'gleen_summary_idea_map_v1',
          requestId: 'deterministic:gleen_summary_idea_map_v1',
          model: 'deterministic',
          usage: null,
          latencyMs: expect.any(Number),
        },
        {
          name: 'gleen_summary_compose_v3',
          requestId: 'deterministic:gleen_summary_compose_v3',
          model: 'deterministic',
          usage: null,
          latencyMs: expect.any(Number),
        },
      ],
    });
    expect(JSON.stringify(result.metadata)).not.toContain('Critical claim');
    expect(JSON.stringify(result.metadata)).not.toContain(
      validCompositionFixture.sections[0].details,
    );
  });

  it('asks a 90-minute Balanced composition for 14–20 complete sections', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_idea_map_v1: ideaMapFixture,
      gleen_summary_compose_v3: validCompositionFixture,
    });

    await generateSummary(provider, contextWithDuration(5_400));

    expect(provider.requests[1]?.system).toContain('14–20');
    expect(provider.requests[1]?.system).toContain(
      'must not omit high-importance',
    );
    expect(provider.requests[1]?.system).toContain('all high-importance IDs');
    expect(provider.requests[1]?.input).toContain('"id":"idea-critical"');
  });

  it('repairs a 48-minute Deep composition below the strict floor', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_idea_map_v1: ideaMapFixture,
      gleen_summary_compose_v3: compositionWithSections(12),
      gleen_summary_repair_v3: compositionWithSections(14),
    });

    const result = await generateSummary(
      provider,
      deepContextWithDuration(2_883),
    );

    expect(provider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_idea_map_v1',
      'gleen_summary_compose_v3',
      'gleen_summary_repair_v3',
    ]);
    expect(provider.requests[0]?.system).toContain('at least 14');
    expect(provider.requests[1]?.system).toContain('mandatory');
    expect(provider.requests[2]?.input).toContain('structural_range');
    expect(result.value.sections).toHaveLength(14);
  });

  it('rejects a repaired 48-minute Deep composition that remains below the strict floor', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_idea_map_v1: ideaMapFixture,
      gleen_summary_compose_v3: compositionWithSections(12),
      gleen_summary_repair_v3: compositionWithSections(13),
    });

    const error = await generateSummary(
      provider,
      deepContextWithDuration(2_883),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SummaryGenerationError);
    expect(error).toMatchObject({
      code: 'invalid_provider_response',
      retryable: true,
      metadata: {
        route: 'two-pass',
        repairCount: 1,
        findingCounts: { structural_range: 1 },
      },
    });
    expect(provider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_idea_map_v1',
      'gleen_summary_compose_v3',
      'gleen_summary_repair_v3',
    ]);
  });

  it.each([
    [
      'compact',
      'Compress aggressively, but preserve every main conclusion and material caveat.',
    ],
    [
      'balanced',
      'Preserve conclusions, arguments, important context, representative examples, and caveats.',
    ],
    [
      'deep',
      'Preserve full argument structure, causal links, significant examples, exceptions, and practical implications.',
    ],
  ] as const)(
    'includes the exact %s coverage promise',
    async (mode, promise) => {
      const provider = createDeterministicProvider({
        gleen_summary_v3: validSummaryFixture,
      });

      await generateSummary(provider, {
        ...context,
        summaryPreset: mode,
        durationSeconds: 120,
      });

      expect(provider.requests[0]?.system).toContain(promise);
      expect(provider.requests[0]?.system).toContain('4–8');
      expect(provider.requests[0]?.system).toContain(
        'one complete main paragraph per section',
      );
      expect(provider.requests[0]?.system).toContain(
        'must not omit high-importance',
      );
    },
  );

  it('repairs one-pass thesis/detail duplication before publishing', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_v3: {
        ...validSummaryFixture,
        sections: [
          {
            ...validSummaryFixture.sections[0],
            summary:
              'Repeated section explanation contains enough words for duplicate comparison.',
            details:
              'Repeated section explanation contains enough words for duplicate comparison.',
          },
        ],
      },
      gleen_summary_repair_v3: validSummaryFixture,
    });

    const result = await generateSummary(provider, contextWithDuration(120));

    expect(provider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_v3',
      'gleen_summary_repair_v3',
    ]);
    expect(provider.requests[1]?.input).toContain('duplicate_section_text');
    expect(result.metadata.repairCount).toBe(1);
  });

  it('repairs a composition that omits high-importance coverage', async () => {
    const provider = createDeterministicProvider({
      gleen_summary_idea_map_v1: ideaMapFixture,
      gleen_summary_compose_v3: {
        ...validCompositionFixture,
        sections: [
          {
            ...validCompositionFixture.sections[0],
            coveredIdeaIds: ['idea-secondary'],
          },
        ],
      },
      gleen_summary_repair_v3: validCompositionFixture,
    });

    const result = await generateSummary(provider, contextWithDuration(1_200));

    expect(provider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_idea_map_v1',
      'gleen_summary_compose_v3',
      'gleen_summary_repair_v3',
    ]);
    expect(provider.requests[2]?.input).toContain('missing_high_importance');
    expect(provider.requests[2]?.input).toContain('idea-critical');
    expect(result.metadata.repairCount).toBe(1);
  });

  it('rejects an invalid repaired composition without making a second repair call', async () => {
    const invalidComposition = {
      ...validCompositionFixture,
      sections: [
        {
          ...validCompositionFixture.sections[0],
          coveredIdeaIds: ['idea-secondary'],
        },
      ],
    } as const;
    const provider = createDeterministicProvider({
      gleen_summary_idea_map_v1: ideaMapFixture,
      gleen_summary_compose_v3: invalidComposition,
      gleen_summary_repair_v3: invalidComposition,
    });

    const error = await generateSummary(
      provider,
      contextWithDuration(1_200),
    ).catch((value: unknown) => value);

    expect(error).toBeInstanceOf(SummaryGenerationError);
    expect(error).toMatchObject({
      code: 'invalid_provider_response',
      retryable: true,
      metadata: {
        route: 'two-pass',
        repairCount: 1,
        passes: [
          expect.objectContaining({ name: 'gleen_summary_idea_map_v1' }),
          expect.objectContaining({ name: 'gleen_summary_compose_v3' }),
          expect.objectContaining({ name: 'gleen_summary_repair_v3' }),
        ],
        findingCounts: { missing_high_importance: 1 },
      },
    });
    expect(JSON.stringify(error)).not.toMatch(
      /Critical claim|Secondary claim|complete explanation|idea-critical/i,
    );
    expect(provider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_idea_map_v1',
      'gleen_summary_compose_v3',
      'gleen_summary_repair_v3',
    ]);
  });

  it('rejects adjacent duplication that survives the only one-pass repair', async () => {
    const repeatedDetails =
      'Repeated adjacent explanation contains enough words for reliable duplicate comparison.';
    const invalidSummary = {
      ...validSummaryFixture,
      sections: [
        {
          ...validSummaryFixture.sections[0],
          title: 'First point',
          details: repeatedDetails,
        },
        {
          ...validSummaryFixture.sections[0],
          title: 'Second point',
          details: repeatedDetails,
        },
      ],
    } as const;
    const provider = createDeterministicProvider({
      gleen_summary_v3: invalidSummary,
      gleen_summary_repair_v3: invalidSummary,
    });

    const error = await generateSummary(
      provider,
      contextWithDuration(120),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SummaryGenerationError);
    expect(error).toMatchObject({
      code: 'invalid_provider_response',
      retryable: true,
      metadata: {
        route: 'one-pass',
        repairCount: 1,
        passes: [
          expect.objectContaining({ name: 'gleen_summary_v3' }),
          expect.objectContaining({ name: 'gleen_summary_repair_v3' }),
        ],
        findingCounts: { duplicate_adjacent_section: 1 },
      },
    });
    expect(provider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_v3',
      'gleen_summary_repair_v3',
    ]);
  });

  it('carries billed pass metrics and finding counts when the bounded repair provider fails', async () => {
    const provider = createDeterministicProvider(
      {
        gleen_summary_v3: {
          ...validSummaryFixture,
          sections: [
            {
              ...validSummaryFixture.sections[0],
              summary: 'Same short text.',
              details: 'Same short text.',
            },
          ],
        },
      },
      {
        gleen_summary_repair_v3: {
          count: 1,
          code: 'provider_unavailable',
          retryable: true,
        },
      },
    );

    const error = await generateSummary(
      provider,
      contextWithDuration(120),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SummaryGenerationError);
    expect(error).toMatchObject({
      code: 'provider_unavailable',
      retryable: true,
      metadata: {
        route: 'one-pass',
        repairCount: 1,
        passes: [expect.objectContaining({ name: 'gleen_summary_v3' })],
        findingCounts: { duplicate_section_text: 1 },
      },
    });
    expect(provider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_v3',
      'gleen_summary_repair_v3',
    ]);
  });

  it('carries completed idea-map metrics when composition fails', async () => {
    const provider = createDeterministicProvider(
      { gleen_summary_idea_map_v1: ideaMapFixture },
      {
        gleen_summary_compose_v3: {
          count: 1,
          code: 'provider_unavailable',
          retryable: true,
        },
      },
    );

    const error = await generateSummary(
      provider,
      contextWithDuration(1_200),
    ).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SummaryGenerationError);
    expect(error).toMatchObject({
      code: 'provider_unavailable',
      retryable: true,
      metadata: {
        route: 'two-pass',
        repairCount: 0,
        passes: [
          expect.objectContaining({ name: 'gleen_summary_idea_map_v1' }),
        ],
        findingCounts: {},
      },
    });
    expect(provider.requests.map(({ name }) => name)).toEqual([
      'gleen_summary_idea_map_v1',
      'gleen_summary_compose_v3',
    ]);
  });

  it.each([
    ['one-pass', 'thesis-details', 'duplicate_section_text'],
    ['one-pass', 'adjacent-details', 'duplicate_adjacent_section'],
    ['two-pass', 'thesis-details', 'duplicate_section_text'],
    ['two-pass', 'adjacent-details', 'duplicate_adjacent_section'],
  ] as const)(
    'repairs short exact %s %s duplication',
    async (route, defect, findingCode) => {
      const duplicateSection = {
        ...validSummaryFixture.sections[0],
        summary:
          defect === 'thesis-details'
            ? 'Same short text.'
            : validSummaryFixture.sections[0].summary,
        details: 'ＳＡＭＥ short text!',
      };
      const duplicateSections =
        defect === 'adjacent-details'
          ? [
              { ...duplicateSection, title: 'First short section' },
              { ...duplicateSection, title: 'Second short section' },
            ]
          : [duplicateSection];
      const provider = createDeterministicProvider(
        route === 'one-pass'
          ? {
              gleen_summary_v3: {
                ...validSummaryFixture,
                sections: duplicateSections,
              },
              gleen_summary_repair_v3: validSummaryFixture,
            }
          : {
              gleen_summary_idea_map_v1: ideaMapFixture,
              gleen_summary_compose_v3: {
                ...validCompositionFixture,
                sections: duplicateSections.map((section) => ({
                  ...section,
                  coveredIdeaIds: ['idea-critical', 'idea-secondary'],
                })),
              },
              gleen_summary_repair_v3: validCompositionFixture,
            },
      );

      const result = await generateSummary(
        provider,
        contextWithDuration(route === 'one-pass' ? 120 : 1_200),
      );

      expect(provider.requests.map(({ name }) => name).at(-1)).toBe(
        'gleen_summary_repair_v3',
      );
      expect(provider.requests.at(-1)?.input).toContain(findingCode);
      expect(result.metadata.repairCount).toBe(1);
    },
  );

  it('passes the requested card count to flashcard generation', async () => {
    const provider = createDeterministicProvider({
      gleen_flashcards_v1: {
        schemaVersion: 1,
        cards: [{ front: 'Q', back: 'A' }],
      },
    });

    await generateFlashcards(provider, context);

    expect(provider.requests[0]?.input).toContain('Card count: 18');
    expect(provider.requests[0]?.input).toContain('Output locale: uk');
    expect(provider.requests[0]?.input).toContain('Video duration: 120s');
    expect(provider.requests[0]?.input).toContain('[0ms] First idea');
    expect(provider.requests[0]?.input).not.toContain('Transcript language:');
  });

  it('rejects chapters outside the video duration after provider parsing', async () => {
    const provider = createDeterministicProvider({
      gleen_timestamps_v1: {
        schemaVersion: 1,
        chapters: [
          { offsetMs: 120_001, title: 'Late', description: 'Too late' },
        ],
      },
    });

    await expect(generateTimestamps(provider, context)).rejects.toThrow(
      'Timestamp exceeds video duration',
    );
    expect(provider.requests[0]?.input).toContain('Output locale: uk');
    expect(provider.requests[0]?.input).toContain('Video duration: 120s');
    expect(provider.requests[0]?.input).toContain('[0ms] First idea');
    expect(provider.requests[0]?.input).not.toContain('Transcript language:');
  });
});
