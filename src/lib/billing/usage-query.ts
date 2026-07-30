import { z } from 'zod';

import {
  billingPeriodSchema,
  usageEventTypeSchema,
  type BillingPeriod,
} from './domain';

export const usageDateRangeSchema = z.enum(['current', 'last90', 'all']);
export type UsageDateRange = z.infer<typeof usageDateRangeSchema>;

export type UsageRouteQuery = Readonly<{
  search: string;
  eventType: z.infer<typeof usageEventTypeSchema> | null;
  cursor: string | null;
  range: UsageDateRange;
}>;

function scalar(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

export function parseUsageRouteQuery(
  raw: Record<string, string | string[] | undefined>,
): UsageRouteQuery {
  const eventValue = scalar(raw.eventType);
  return {
    search: z
      .string()
      .trim()
      .max(200)
      .catch('')
      .parse(scalar(raw.search) ?? ''),
    eventType:
      eventValue === undefined || eventValue === 'all'
        ? null
        : usageEventTypeSchema.nullable().catch(null).parse(eventValue),
    cursor: z
      .string()
      .regex(/^(0|[1-9]\d*)$/)
      .nullable()
      .catch(null)
      .parse(scalar(raw.cursor) ?? null),
    range: usageDateRangeSchema
      .catch('current')
      .parse(scalar(raw.range) ?? 'current'),
  };
}

export type UsagePeriodBounds = Readonly<{
  periodStart: string | null;
  periodEnd: string | null;
}>;

export function usagePeriodBounds(
  range: UsageDateRange,
  currentPeriod: BillingPeriod,
  now: string,
): UsagePeriodBounds {
  const parsedRange = usageDateRangeSchema.parse(range);
  const period = billingPeriodSchema.parse(currentPeriod);
  const nowTimestamp = z.iso.datetime({ offset: true }).parse(now);

  if (parsedRange === 'all') {
    return { periodStart: null, periodEnd: null };
  }
  if (parsedRange === 'current') {
    return { periodStart: period.startsAt, periodEnd: period.endsAt };
  }
  return {
    periodStart: new Date(
      Date.parse(nowTimestamp) - 90 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    periodEnd: new Date(nowTimestamp).toISOString(),
  };
}
