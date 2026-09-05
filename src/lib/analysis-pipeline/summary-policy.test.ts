import { describe, expect, it } from 'vitest';

import type { TranscriptSegment } from '@/lib/youtube-intake/providers';

import { selectSummaryPolicy, type SummaryPolicyInput } from './summary-policy';

function input(
  overrides: Partial<SummaryPolicyInput> & { wordCount?: number } = {},
): SummaryPolicyInput {
  const { wordCount = 20, ...policyOverrides } = overrides;
  return {
    durationSeconds: 600,
    mode: 'balanced',
    transcriptSegments: [
      {
        text: Array.from({ length: wordCount }, () => 'word').join(' '),
        offsetMs: 0,
        durationMs: 1_000,
      },
    ],
    ...policyOverrides,
  };
}

describe('selectSummaryPolicy', () => {
  it.each([
    [1199, 'one-pass'],
    [1200, 'two-pass'],
    [1201, 'two-pass'],
  ] as const)('routes %s seconds through %s', (durationSeconds, route) => {
    expect(selectSummaryPolicy(input({ durationSeconds })).route).toBe(route);
  });

  it.each([
    [1200, { min: 8, max: 12 }],
    [2700, { min: 10, max: 16 }],
    [5400, { min: 14, max: 20 }],
  ] as const)(
    'uses duration guidance at %s seconds',
    (durationSeconds, range) => {
      expect(
        selectSummaryPolicy(input({ durationSeconds })).sectionRange,
      ).toEqual(range);
    },
  );

  it.each([2700, 2883, 5399])(
    'strictly enforces 14–18 sections for a Deep video at %s seconds',
    (durationSeconds) => {
      expect(
        selectSummaryPolicy(input({ durationSeconds, mode: 'deep' })),
      ).toMatchObject({
        sectionRange: { min: 14, max: 18 },
        sectionRangeEnforcement: 'strict',
      });
    },
  );

  it.each([
    [2699, 'deep'],
    [2883, 'balanced'],
    [5400, 'deep'],
  ] as const)(
    'keeps the lower range adaptive at %s seconds in %s mode',
    (durationSeconds, mode) => {
      expect(
        selectSummaryPolicy(input({ durationSeconds, mode })),
      ).toMatchObject({ sectionRangeEnforcement: 'adaptive' });
    },
  );

  it('may escalate a dense 19:59 transcript without weakening the 20-minute rule', () => {
    expect(
      selectSummaryPolicy(input({ durationSeconds: 1199, wordCount: 12_000 }))
        .route,
    ).toBe('two-pass');
  });

  it('escalates a dense transcript with many segments', () => {
    const transcriptSegments: readonly TranscriptSegment[] = Array.from(
      { length: 1_000 },
      (_, index) => ({
        text: `segment ${index}`,
        offsetMs: index * 1_000,
        durationMs: 1_000,
      }),
    );

    expect(selectSummaryPolicy(input({ transcriptSegments })).route).toBe(
      'two-pass',
    );
  });

  it('escalates a dense Deep request', () => {
    expect(
      selectSummaryPolicy(input({ mode: 'deep', wordCount: 4_000 })).route,
    ).toBe('two-pass');
  });

  it('returns deterministic non-content transcript signals', () => {
    const transcriptSegments: readonly TranscriptSegment[] = [
      { text: '  one   two ', offsetMs: 0, durationMs: 1_000 },
      { text: 'three', offsetMs: 1_000, durationMs: 1_000 },
    ];

    expect(
      selectSummaryPolicy(input({ durationSeconds: 42, transcriptSegments })),
    ).toEqual({
      route: 'one-pass',
      sectionRange: { min: 4, max: 8 },
      sectionRangeEnforcement: 'adaptive',
      signals: { durationSeconds: 42, wordCount: 3, segmentCount: 2 },
    });
  });
});
