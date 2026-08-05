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
    expect(appMessages.uk.processing.artifactStates.flashcards.queued).toBe(
      'Картки в черзі',
    );
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

  it('keeps actionable intake failures distinct in every locale', () => {
    for (const locale of supportedLocales) {
      expect(appMessages[locale].newAnalysis.errors).toMatchObject({
        live_not_ready: expect.any(String),
        unsupported_duration: expect.any(String),
        transcript_language_unavailable: expect.any(String),
      });
      expect(
        new Set([
          appMessages[locale].newAnalysis.errors.live_not_ready,
          appMessages[locale].newAnalysis.errors.unsupported_duration,
          appMessages[locale].newAnalysis.errors
            .transcript_language_unavailable,
        ]).size,
      ).toBe(3);
    }
  });

  it('authors artifact-state grammar per locale and artifact', () => {
    expect(appMessages.uk.processing).toMatchObject({
      artifactStates: {
        summary: { ready: 'Конспект готовий' },
        flashcards: { ready: 'Картки готові' },
      },
    });
    expect(appMessages.de.processing).toMatchObject({
      artifactStates: {
        summary: { ready: 'Die Zusammenfassung ist bereit' },
      },
    });
    expect(appMessages.es.processing).toMatchObject({
      artifactStates: {
        flashcards: { ready: 'Las tarjetas están listas' },
      },
    });
  });

  it('uses native product language in audited intake and recovery copy', () => {
    expect(appMessages.es.newAnalysis.advanced.description).toBe(
      'Elige los materiales de aprendizaje para este análisis.',
    );
    expect(appMessages.es.processing.presentations.artifacts.subtitle).toBe(
      'Creando tus materiales de aprendizaje.',
    );
    expect(appMessages.es.processing.stages.artifacts).toBe(
      'Creando materiales de aprendizaje',
    );
    expect(appMessages.de.newAnalysis.duplicate.noCredits).toBe(
      'Es wird kein Guthaben verbraucht.',
    );
    expect(appMessages.de.processing.errors.stopped).toBe(
      'Die Analyse wurde sicher beendet. Fertige Ergebnisse wurden gespeichert.',
    );
    expect(appMessages.de.readiness.back).toBe('← Zurück zur neuen Analyse');
  });
});
