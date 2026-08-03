import { describe, expect, it } from 'vitest';

import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatRelativeTime,
  selectPlural,
} from '@/lib/i18n/format';

function normalizeSpacing(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, ' ');
}

describe('localized formatters', () => {
  it('formats numbers and minor currency amounts with the selected locale', () => {
    expect(formatNumber({ value: 1900.5, locale: 'de' })).toBe('1.900,5');
    expect(
      normalizeSpacing(
        formatCurrency({ amountMinor: 1900, currency: 'usd', locale: 'de' }),
      ),
    ).toBe('19,00 $');
  });

  it('formats valid dates and uses the caller fallback for invalid dates', () => {
    expect(
      formatDate({
        value: '2026-08-03T00:00:00.000Z',
        locale: 'de',
        fallback: 'Unbekannt',
        options: { timeZone: 'UTC' },
      }),
    ).toBe('03.08.2026');
    expect(
      formatDate({ value: 'not-a-date', locale: 'de', fallback: 'Unbekannt' }),
    ).toBe('Unbekannt');
  });

  it('formats relative time without embedding English copy', () => {
    expect(
      formatRelativeTime({
        value: -1,
        unit: 'day',
        locale: 'de',
        numeric: 'auto',
      }),
    ).toBe('gestern');
  });

  it('selects locale-specific plural forms and interpolates the count', () => {
    expect(
      selectPlural('uk', 2, {
        one: '{count} аналіз',
        few: '{count} аналізи',
        many: '{count} аналізів',
        other: '{count} аналізу',
      }),
    ).toBe('2 аналізи');
  });
});
