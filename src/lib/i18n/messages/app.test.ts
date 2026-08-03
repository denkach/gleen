import { describe, expect, it } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

import { appIntakeErrorMessage, appUsageLabel } from '../app-format';
import { appMessages } from './app';

function messagePaths(value: unknown, path = ''): string[] {
  if (typeof value === 'string' || typeof value === 'function') return [path];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    messagePaths(child, path ? `${path}.${key}` : key),
  );
}

describe('appMessages', () => {
  it('provides every app-shell, intake, and processing message in five locales', () => {
    const englishPaths = messagePaths(appMessages.en).sort();

    expect(Object.keys(appMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    for (const locale of supportedLocales) {
      expect(messagePaths(appMessages[locale]).sort()).toEqual(englishPaths);
    }
  });

  it('keeps representative German shell and Ukrainian intake copy available', () => {
    expect(appMessages.de.shell.navigation.new.label).toBe('Neue Analyse');
    expect(appMessages.de.shell.usageUnavailable).toBe(
      'Nutzung mit Abrechnung verfügbar',
    );
    expect(appMessages.uk.newAnalysis.advanced.title).toBe(
      'Розширені налаштування',
    );
    expect(appMessages.uk.processing.stages.transcript).toBe(
      'Пошук транскрипту',
    );
    expect(appMessages.uk.processing.rails.flashcards).toBe('КАРТКИ');
  });

  it('formats localized usage plural forms through the shared formatter', () => {
    expect(appUsageLabel('en', appMessages.en, 1)).toBe('1 analysis left');
    expect(appUsageLabel('en', appMessages.en, 2)).toBe('2 analyses left');
    expect(appUsageLabel('uk', appMessages.uk, 1)).toBe('Залишився 1 аналіз');
    expect(appUsageLabel('uk', appMessages.uk, 2)).toBe('Залишилося 2 аналізи');
    expect(appUsageLabel('uk', appMessages.uk, 5)).toBe(
      'Залишилося 5 аналізів',
    );
  });

  it('maps stable intake codes to localized copy with a generic fallback', () => {
    expect(
      appIntakeErrorMessage(appMessages.uk, 'transcript_unavailable'),
    ).toBe('Для цього відео немає доступного транскрипту.');
    expect(appIntakeErrorMessage(appMessages.uk, 'provider_outage')).toBe(
      'Відеосервіс тимчасово недоступний. Спробуйте ще раз.',
    );
    expect(appIntakeErrorMessage(appMessages.uk, undefined)).toBe(
      'Не вдалося підготувати аналіз. Спробуйте ще раз.',
    );
  });
});
