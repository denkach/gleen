import { describe, expect, test } from 'vitest';

import { appMessages } from '@/lib/i18n/messages/app';

import { buildMonthlyUsageState, monthlyUsageBounds } from './monthly-usage';

describe('monthly usage presentation', () => {
  test('builds rolling daily bars and compares complete calendar months', () => {
    expect(monthlyUsageBounds('2026-09-06T12:00:00.000Z')).toEqual({
      currentStart: '2026-09-01T00:00:00.000Z',
      currentEnd: '2026-10-01T00:00:00.000Z',
      previousStart: '2026-08-01T00:00:00.000Z',
      previousEnd: '2026-09-01T00:00:00.000Z',
    });

    const state = buildMonthlyUsageState({
      locale: 'en',
      copy: appMessages.en.newAnalysis.monthly,
      now: '2026-09-06T12:00:00.000Z',
      used: 22,
      limit: 50,
      canUpgrade: true,
      currentEntries: [
        {
          eventType: 'settlement',
          quantity: -1,
          occurredAt: '2026-09-05T10:00:00.000Z',
        },
        {
          eventType: 'settlement',
          quantity: -2,
          occurredAt: '2026-09-06T10:00:00.000Z',
        },
      ],
      previousEntries: [
        {
          eventType: 'settlement',
          quantity: -2,
          occurredAt: '2026-08-05T10:00:00.000Z',
        },
      ],
    });

    expect(state.kind).toBe('ready');
    if (state.kind !== 'ready') throw new Error('Expected ready state');
    expect(state.points).toHaveLength(14);
    expect(state.points.at(-2)).toMatchObject({
      key: '2026-09-05',
      count: 1,
      countLabel: '1 analysis',
    });
    expect(state.points.at(-1)).toMatchObject({
      key: '2026-09-06',
      count: 2,
      countLabel: '2 analyses',
    });
    expect(state.trend).toEqual({
      direction: 'up',
      value: '+50%',
      label: 'vs last month',
    });
  });
});
