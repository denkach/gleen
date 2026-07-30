import { describe, expect, it } from 'vitest';

import { parseUsageRouteQuery, usagePeriodBounds } from './usage-query';

describe('usage query', () => {
  const period = {
    startsAt: '2026-07-01T00:00:00.000Z',
    endsAt: '2026-08-01T00:00:00.000Z',
  };

  it('falls back invalid closed values while preserving valid filters', () => {
    expect(
      parseUsageRouteQuery({
        search: ' retry ',
        eventType: 'technical_retry',
        range: 'future',
        cursor: 'bad',
      }),
    ).toEqual({
      search: 'retry',
      eventType: 'technical_retry',
      range: 'current',
      cursor: null,
    });
  });

  it('derives deterministic UTC boundaries for every date range', () => {
    expect(
      usagePeriodBounds('current', period, '2026-07-30T12:00:00.000Z'),
    ).toEqual({
      periodStart: period.startsAt,
      periodEnd: period.endsAt,
    });
    expect(
      usagePeriodBounds('last90', period, '2026-07-30T12:00:00.000Z'),
    ).toEqual({
      periodStart: '2026-05-01T12:00:00.000Z',
      periodEnd: '2026-07-30T12:00:00.000Z',
    });
    expect(
      usagePeriodBounds('all', period, '2026-07-30T12:00:00.000Z'),
    ).toEqual({ periodStart: null, periodEnd: null });
  });
});
