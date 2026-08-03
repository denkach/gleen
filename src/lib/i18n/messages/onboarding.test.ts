import { describe, expect, it } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

import { onboardingErrorMessage, onboardingMessages } from './onboarding';

function messagePaths(value: unknown, path = ''): string[] {
  if (typeof value === 'string' || typeof value === 'function') return [path];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    messagePaths(child, path ? `${path}.${key}` : key),
  );
}

describe('onboardingMessages', () => {
  it('provides every onboarding message for each supported locale', () => {
    const englishPaths = messagePaths(onboardingMessages.en).sort();

    expect(Object.keys(onboardingMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    for (const locale of supportedLocales) {
      expect(messagePaths(onboardingMessages[locale]).sort()).toEqual(
        englishPaths,
      );
    }
  });

  it('keeps representative Ukrainian onboarding copy available', () => {
    expect(onboardingMessages.uk.steps.interface.title).toBe('Мова інтерфейсу');
    expect(onboardingMessages.uk.steps.output.title).toBe('Мова результатів');
    expect(onboardingMessages.uk.presets.summaryDetailed.title).toBe(
      'Докладний конспект',
    );
    expect(onboardingMessages.uk.actions.continue).toBe('Продовжити');
    expect(onboardingErrorMessage(onboardingMessages.uk, 'save_failed')).toBe(
      'Не вдалося зберегти налаштування. Спробуйте ще раз.',
    );
  });
});
