import { formatNumber, selectPlural } from '@/lib/i18n/format';
import type { AppMessages } from '@/lib/i18n/messages/app';
import { toBcp47, type Locale } from '@/lib/i18n/locales';

const chartDayCount = 14;

type MonthlyUsageEntry = Readonly<{
  eventType: string;
  quantity: number;
  occurredAt: string;
}>;

export type MonthlyUsageState =
  | Readonly<{ kind: 'unavailable' }>
  | Readonly<{
      kind: 'ready';
      used: number;
      limit: number;
      canUpgrade: boolean;
      points: readonly Readonly<{
        key: string;
        dateLabel: string;
        count: number;
        countLabel: string;
      }>[];
      trend: Readonly<{
        direction: 'up' | 'down' | 'flat';
        value: string;
        label: string;
      }> | null;
    }>;

function utcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

export function monthlyUsageBounds(now: string) {
  const date = new Date(now);
  if (Number.isNaN(date.getTime())) throw new RangeError('Invalid date');
  const currentStart = utcMonthStart(date);
  const currentEnd = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1),
  );
  const previousStart = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() - 1, 1),
  );
  return {
    currentStart: currentStart.toISOString(),
    currentEnd: currentEnd.toISOString(),
    previousStart: previousStart.toISOString(),
    previousEnd: currentStart.toISOString(),
  };
}

function consumed(entry: MonthlyUsageEntry): number {
  return entry.eventType === 'settlement' ? Math.max(0, -entry.quantity) : 0;
}

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function buildMonthlyUsageState({
  locale,
  copy,
  now,
  used,
  limit,
  canUpgrade,
  currentEntries,
  previousEntries,
}: Readonly<{
  locale: Locale;
  copy: AppMessages['newAnalysis']['monthly'];
  now: string;
  used: number;
  limit: number;
  canUpgrade: boolean;
  currentEntries: readonly MonthlyUsageEntry[];
  previousEntries: readonly MonthlyUsageEntry[];
}>): MonthlyUsageState {
  const today = new Date(now);
  if (Number.isNaN(today.getTime())) throw new RangeError('Invalid date');
  const counts = new Map<string, number>();
  for (const entry of [...previousEntries, ...currentEntries]) {
    const count = consumed(entry);
    if (count === 0) continue;
    const key = dayKey(new Date(entry.occurredAt));
    counts.set(key, (counts.get(key) ?? 0) + count);
  }

  const formatter = new Intl.DateTimeFormat(toBcp47(locale), {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
  const points = Array.from({ length: chartDayCount }, (_, index) => {
    const date = new Date(
      Date.UTC(
        today.getUTCFullYear(),
        today.getUTCMonth(),
        today.getUTCDate() - (chartDayCount - 1 - index),
      ),
    );
    const key = dayKey(date);
    const count = counts.get(key) ?? 0;
    return {
      key,
      dateLabel: formatter.format(date),
      count,
      countLabel: selectPlural(locale, count, copy.analysisCount),
    };
  });

  const currentTotal = currentEntries.reduce(
    (total, entry) => total + consumed(entry),
    0,
  );
  const previousTotal = previousEntries.reduce(
    (total, entry) => total + consumed(entry),
    0,
  );
  const percent =
    previousTotal === 0
      ? null
      : Math.round(((currentTotal - previousTotal) / previousTotal) * 100);
  const direction: 'up' | 'down' | 'flat' =
    percent === null || percent === 0 ? 'flat' : percent > 0 ? 'up' : 'down';
  const trend =
    percent === null
      ? null
      : {
          direction,
          value: `${percent > 0 ? '+' : percent < 0 ? '−' : ''}${formatNumber({ value: Math.abs(percent), locale })}%`,
          label: copy.vsLastMonth,
        };

  return {
    kind: 'ready',
    used,
    limit,
    canUpgrade,
    points,
    trend,
  };
}
