import type { Locale } from './locales';
import { toBcp47 } from './locales';

type DateValue = Date | string | number;

export type FormatDateInput = Readonly<{
  value: DateValue;
  locale: Locale;
  fallback: string;
  options?: Intl.DateTimeFormatOptions;
}>;

export type FormatNumberInput = Readonly<{
  value: number;
  locale: Locale;
  options?: Intl.NumberFormatOptions;
}>;

export type FormatCurrencyInput = Readonly<{
  amountMinor: number;
  currency: string;
  locale: Locale;
}>;

export type FormatRelativeTimeInput = Readonly<{
  value: number;
  unit: Intl.RelativeTimeFormatUnit;
  locale: Locale;
  numeric?: Intl.RelativeTimeFormatNumeric;
  style?: Intl.RelativeTimeFormatStyle;
}>;

export type PluralForms = Readonly<
  { other: string } & Partial<Record<Intl.LDMLPluralRule, string>>
>;

function isValidDate(value: DateValue): value is Date | string | number {
  return !Number.isNaN(new Date(value).getTime());
}

function assertFiniteNumber(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number`);
  }
}

export function formatDate({
  value,
  locale,
  fallback,
  options,
}: FormatDateInput): string {
  if (!isValidDate(value)) return fallback;

  return new Intl.DateTimeFormat(toBcp47(locale), {
    dateStyle: 'medium',
    ...options,
  }).format(new Date(value));
}

export function formatNumber({
  value,
  locale,
  options,
}: FormatNumberInput): string {
  assertFiniteNumber(value, 'value');
  return new Intl.NumberFormat(toBcp47(locale), options).format(value);
}

export function formatCurrency({
  amountMinor,
  currency,
  locale,
}: FormatCurrencyInput): string {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new RangeError('amountMinor must be a safe integer');
  }

  const normalizedCurrency = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalizedCurrency)) {
    throw new RangeError('currency must be a three-letter ISO 4217 code');
  }

  const formatter = new Intl.NumberFormat(toBcp47(locale), {
    style: 'currency',
    currency: normalizedCurrency,
    currencyDisplay: 'narrowSymbol',
  });
  const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;

  return formatter.format(amountMinor / 10 ** fractionDigits);
}

export function formatRelativeTime({
  value,
  unit,
  locale,
  numeric,
  style,
}: FormatRelativeTimeInput): string {
  assertFiniteNumber(value, 'value');
  return new Intl.RelativeTimeFormat(toBcp47(locale), {
    numeric,
    style,
  }).format(value, unit);
}

export function selectPlural(
  locale: Locale,
  count: number,
  forms: PluralForms,
): string {
  assertFiniteNumber(count, 'count');
  const category = new Intl.PluralRules(toBcp47(locale)).select(count);
  const template = forms[category] ?? forms.other;

  return template.replaceAll('{count}', formatNumber({ value: count, locale }));
}
