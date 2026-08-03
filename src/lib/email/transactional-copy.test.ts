import { describe, expect, it } from 'vitest';

import { supportedLocales, type Locale } from '@/lib/i18n/locales';

import {
  renderTransactionalEmailCopy,
  type TransactionalEmailInput,
} from './transactional-copy';

const expectedDates: Record<Locale, string> = {
  uk: '3 серп. 2026 р.',
  ru: '3 авг. 2026 г.',
  en: '3 Aug 2026',
  es: '3 ago 2026',
  de: '03.08.2026',
};

const title = '<The Prism> & «Світло»';
const planName = 'Prism Pro / Команда';
const effectiveAt = '2026-08-03T00:00:00.000Z';

function inputsFor(locale: Locale): readonly TransactionalEmailInput[] {
  const actionUrl = `https://gleen.example/action?locale=${locale}&token=a%2Bb`;

  return [
    { kind: 'magic_link', locale, actionUrl },
    { kind: 'verify_email', locale, actionUrl },
    { kind: 'password_reset', locale, actionUrl },
    { kind: 'analysis_ready', locale, actionUrl, title },
    { kind: 'payment_failed', locale, actionUrl, planName },
    {
      kind: 'subscription_changed',
      locale,
      actionUrl,
      planName,
      effectiveAt,
    },
  ];
}

describe('renderTransactionalEmailCopy', () => {
  it.each(supportedLocales)(
    'renders every transactional kind as complete plain-text copy in %s',
    (locale) => {
      for (const input of inputsFor(locale)) {
        const copy = renderTransactionalEmailCopy(input);

        expect(copy.subject).not.toHaveLength(0);
        expect(copy.preview).not.toHaveLength(0);
        expect(copy.heading).not.toHaveLength(0);
        expect(copy.paragraphs.length).toBeGreaterThan(0);
        expect(copy.paragraphs.every((paragraph) => paragraph.length > 0)).toBe(
          true,
        );
        expect(copy.actionLabel).not.toHaveLength(0);
        expect(copy.plainText).toContain(input.actionUrl);
        expect(copy.plainText).toBe(
          [
            copy.heading,
            ...copy.paragraphs,
            `${copy.actionLabel}: ${input.actionUrl}`,
          ].join('\n\n'),
        );
      }
    },
  );

  it.each(supportedLocales)(
    'preserves video and plan values while formatting dates in %s',
    (locale) => {
      const rendered = inputsFor(locale).map((input) => ({
        input,
        copy: renderTransactionalEmailCopy(input),
      }));
      const analysis = rendered.find(
        (entry) => entry.input.kind === 'analysis_ready',
      );
      const payment = rendered.find(
        (entry) => entry.input.kind === 'payment_failed',
      );
      const subscription = rendered.find(
        (entry) => entry.input.kind === 'subscription_changed',
      );

      expect(analysis?.copy.plainText).toContain(title);
      expect(payment?.copy.plainText).toContain(planName);
      expect(subscription?.copy.plainText).toContain(planName);
      expect(subscription?.copy.plainText).toContain(expectedDates[locale]);
      expect(subscription?.copy.plainText).not.toContain(effectiveAt);
    },
  );

  it('rejects an unsupported locale before reading or formatting template data', () => {
    const guardedInput = {
      kind: 'subscription_changed',
      locale: 'fr',
      get actionUrl(): string {
        throw new Error('actionUrl was read before locale validation');
      },
      get planName(): string {
        throw new Error('planName was read before locale validation');
      },
      get effectiveAt(): string {
        throw new Error('effectiveAt was read before locale validation');
      },
    } as unknown as TransactionalEmailInput;

    expect(() => renderTransactionalEmailCopy(guardedInput)).toThrow();
  });
});
