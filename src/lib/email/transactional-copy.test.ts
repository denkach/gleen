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

type TransactionalEmailKind = TransactionalEmailInput['kind'];

const expectedLocaleMarkers = {
  uk: {
    magic_link: { heading: 'Увійдіть у Gleen', actionLabel: 'Увійти' },
    verify_email: {
      heading: 'Підтвердьте електронну адресу',
      actionLabel: 'Підтвердити адресу',
    },
    password_reset: {
      heading: 'Відновіть пароль',
      actionLabel: 'Відновити пароль',
    },
    analysis_ready: {
      heading: 'Ваш аналіз готовий',
      actionLabel: 'Відкрити аналіз',
    },
    payment_failed: {
      heading: 'Не вдалося обробити платіж',
      actionLabel: 'Перевірити оплату',
    },
    subscription_changed: {
      heading: 'Ваша підписка змінюється',
      actionLabel: 'Переглянути підписку',
    },
  },
  ru: {
    magic_link: { heading: 'Войдите в Gleen', actionLabel: 'Войти' },
    verify_email: {
      heading: 'Подтвердите адрес электронной почты',
      actionLabel: 'Подтвердить адрес',
    },
    password_reset: {
      heading: 'Сбросьте пароль',
      actionLabel: 'Сбросить пароль',
    },
    analysis_ready: {
      heading: 'Ваш анализ готов',
      actionLabel: 'Открыть анализ',
    },
    payment_failed: {
      heading: 'Не удалось обработать платёж',
      actionLabel: 'Проверить оплату',
    },
    subscription_changed: {
      heading: 'Ваша подписка меняется',
      actionLabel: 'Проверить подписку',
    },
  },
  en: {
    magic_link: { heading: 'Sign in to Gleen', actionLabel: 'Sign in' },
    verify_email: {
      heading: 'Verify your email',
      actionLabel: 'Verify email',
    },
    password_reset: {
      heading: 'Reset your password',
      actionLabel: 'Reset password',
    },
    analysis_ready: {
      heading: 'Your analysis is ready',
      actionLabel: 'Open analysis',
    },
    payment_failed: {
      heading: 'Your payment could not be processed',
      actionLabel: 'Review billing',
    },
    subscription_changed: {
      heading: 'Your subscription is changing',
      actionLabel: 'Review subscription',
    },
  },
  es: {
    magic_link: {
      heading: 'Inicia sesión en Gleen',
      actionLabel: 'Iniciar sesión',
    },
    verify_email: {
      heading: 'Verifica tu correo electrónico',
      actionLabel: 'Verificar correo',
    },
    password_reset: {
      heading: 'Restablece tu contraseña',
      actionLabel: 'Restablecer contraseña',
    },
    analysis_ready: {
      heading: 'Tu análisis está listo',
      actionLabel: 'Abrir análisis',
    },
    payment_failed: {
      heading: 'No se ha podido procesar el pago',
      actionLabel: 'Revisar facturación',
    },
    subscription_changed: {
      heading: 'Tu suscripción va a cambiar',
      actionLabel: 'Revisar suscripción',
    },
  },
  de: {
    magic_link: { heading: 'Bei Gleen anmelden', actionLabel: 'Anmelden' },
    verify_email: {
      heading: 'E-Mail-Adresse bestätigen',
      actionLabel: 'E-Mail bestätigen',
    },
    password_reset: {
      heading: 'Passwort zurücksetzen',
      actionLabel: 'Passwort zurücksetzen',
    },
    analysis_ready: {
      heading: 'Deine Analyse ist fertig',
      actionLabel: 'Analyse öffnen',
    },
    payment_failed: {
      heading: 'Deine Zahlung konnte nicht verarbeitet werden',
      actionLabel: 'Abrechnung prüfen',
    },
    subscription_changed: {
      heading: 'Dein Abonnement ändert sich',
      actionLabel: 'Abonnement prüfen',
    },
  },
} as const satisfies Record<
  Locale,
  Record<
    TransactionalEmailKind,
    Readonly<{ heading: string; actionLabel: string }>
  >
>;

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
    'selects %s copy for every transactional kind',
    (locale) => {
      const renderedLocaleMarkers = Object.fromEntries(
        inputsFor(locale).map((input) => {
          const { heading, actionLabel } = renderTransactionalEmailCopy(input);

          return [input.kind, { heading, actionLabel }];
        }),
      );

      expect(renderedLocaleMarkers).toEqual(expectedLocaleMarkers[locale]);
    },
  );

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
    'preserves dynamic values in every interpolated field in %s',
    (locale) => {
      const actionUrl = `https://gleen.example/action?locale=${locale}&token=a%2Bb`;
      const analysis = renderTransactionalEmailCopy({
        kind: 'analysis_ready',
        locale,
        actionUrl,
        title,
      });
      const payment = renderTransactionalEmailCopy({
        kind: 'payment_failed',
        locale,
        actionUrl,
        planName,
      });
      const subscription = renderTransactionalEmailCopy({
        kind: 'subscription_changed',
        locale,
        actionUrl,
        planName,
        effectiveAt,
      });

      expect(analysis.subject).toContain(title);
      expect(analysis.preview).toContain(title);
      expect(analysis.paragraphs[0]).toContain(title);
      expect(analysis.plainText).toContain(title);

      expect(payment.subject).toContain(planName);
      expect(payment.preview).toContain(planName);
      expect(payment.paragraphs[0]).toContain(planName);
      expect(payment.plainText).toContain(planName);

      expect(subscription.subject).toContain(planName);
      expect(subscription.preview).toContain(planName);
      expect(subscription.paragraphs[0]).toContain(planName);
      expect(subscription.paragraphs[0]).toContain(expectedDates[locale]);
      expect(subscription.plainText).toContain(planName);
      expect(subscription.plainText).toContain(expectedDates[locale]);
      expect(subscription.plainText).not.toContain(effectiveAt);
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
