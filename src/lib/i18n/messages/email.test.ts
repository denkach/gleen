import { describe, expect, it } from 'vitest';

import { supportedLocales } from '../locales';
import { emailMessages } from './email';

describe('emailMessages', () => {
  it('provides every transactional-email namespace in every locale', () => {
    expect(Object.keys(emailMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );

    for (const locale of supportedLocales) {
      const copy = emailMessages[locale];

      expect(copy.magicLink.actionLabel).not.toHaveLength(0);
      expect(copy.verifyEmail.actionLabel).not.toHaveLength(0);
      expect(copy.passwordReset.actionLabel).not.toHaveLength(0);
      expect(copy.analysisReady.actionLabel).not.toHaveLength(0);
      expect(copy.paymentFailed.actionLabel).not.toHaveLength(0);
      expect(copy.subscriptionChanged.actionLabel).not.toHaveLength(0);
    }
  });

  it('localizes representative copy without changing interpolated values', () => {
    const title = '<The Prism> & «Світло»';
    const planName = 'Prism Pro / Команда';

    expect(emailMessages.uk.analysisReady.paragraphs.intro(title)).toBe(
      `Ваш аналіз відео ${title} готовий.`,
    );
    expect(emailMessages.ru.magicLink.heading).toBe('Войдите в Gleen');
    expect(emailMessages.en.verifyEmail.actionLabel).toBe('Verify email');
    expect(emailMessages.es.paymentFailed.paragraphs.intro(planName)).toBe(
      `No hemos podido procesar el pago de ${planName}.`,
    );
    expect(
      emailMessages.de.subscriptionChanged.paragraphs.intro(
        planName,
        '03.08.2026',
      ),
    ).toBe(`Dein Abonnement wechselt am 03.08.2026 zu ${planName}.`);
  });
});
