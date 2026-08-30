import { describe, expect, it } from 'vitest';

import { normalizeStoredSummaryMode, summaryModeSchema } from './summary-mode';

describe('summary modes', () => {
  it.each([
    ['compact', 'compact'],
    ['balanced', 'balanced'],
    ['deep', 'deep'],
    ['detailed', 'deep'],
  ] as const)('normalizes stored %s to %s', (stored, expected) => {
    expect(normalizeStoredSummaryMode(stored)).toBe(expected);
  });

  it('rejects legacy modes for new application values', () => {
    expect(summaryModeSchema.safeParse('detailed').success).toBe(false);
  });
});
