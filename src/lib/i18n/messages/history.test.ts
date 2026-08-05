import { describe, expect, it } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

import { historyMessages, historyResultCount } from './history';

function messagePaths(value: unknown, path = ''): string[] {
  if (typeof value === 'string' || typeof value === 'function') return [path];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    messagePaths(child, path ? `${path}.${key}` : key),
  );
}

describe('historyMessages', () => {
  it('provides the complete History presentation contract in five locales', () => {
    const englishPaths = messagePaths(historyMessages.en).sort();

    expect(Object.keys(historyMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    for (const locale of supportedLocales) {
      expect(messagePaths(historyMessages[locale]).sort()).toEqual(
        englishPaths,
      );
      expect(historyMessages[locale]).toMatchObject({
        presentation: {
          statuses: {
            ready: expect.any(String),
            partial: expect.any(String),
            processing: expect.any(String),
            failed: expect.any(String),
          },
          presets: {
            balanced: expect.any(String),
            detailed: expect.any(String),
          },
        },
        toolbar: {
          sorts: {
            newest: expect.any(String),
            oldest: expect.any(String),
            recent: expect.any(String),
            'title-asc': expect.any(String),
            'title-desc': expect.any(String),
          },
          views: {
            list: expect.any(String),
            grid: expect.any(String),
            gridUnavailable: expect.any(String),
          },
        },
        filters: {
          statuses: {
            ready: expect.any(String),
            processing: expect.any(String),
            failed: expect.any(String),
          },
          dates: {
            all: expect.any(String),
            today: expect.any(String),
            '7d': expect.any(String),
            '30d': expect.any(String),
            year: expect.any(String),
          },
        },
        empty: {
          search: { title: expect.any(Function) },
          filters: { title: expect.any(String) },
          initial: { title: expect.any(String) },
          error: { title: expect.any(String) },
        },
        actions: {
          favorite: expect.any(Object),
          rename: expect.any(Object),
          delete: expect.any(Object),
          duplicate: expect.any(Object),
          exportUnavailable: expect.any(String),
        },
        loadMore: expect.any(Object),
        toasts: expect.any(Object),
        errors: {
          unauthorized: expect.any(String),
          'not-found': expect.any(String),
          invalid: expect.any(String),
          conflict: expect.any(String),
          failed: expect.any(String),
        },
      });
    }
  });

  it('keeps representative German History copy available', () => {
    expect(historyMessages.de.presentation.statuses.ready).toBe('Bereit');
    expect(historyMessages.de.presentation.presets.detailed).toBe(
      'Detailliert',
    );
    expect(historyMessages.de.toolbar.sorts.recent).toBe('Zuletzt geöffnet');
    expect(historyMessages.de.filters.dates['30d']).toBe('Letzte 30 Tage');
    expect(historyMessages.de.actions.rename.save).toBe('Titel speichern');
    expect(historyMessages.de.actions.duplicate.openSaved).toBe(
      'Gespeichertes Ergebnis öffnen',
    );
    expect(historyMessages.de.loadMore.more(2)).toBe(
      '2 weitere gespeicherte Analysen geladen.',
    );
  });

  it.each([
    ['uk', 2, '2 збережені аналізи'],
    ['uk', 5, '5 збережених аналізів'],
    ['uk', 21, '21 збережений аналіз'],
    ['ru', 2, '2 сохранённых анализа'],
    ['ru', 5, '5 сохранённых анализов'],
    ['ru', 21, '21 сохранённый анализ'],
  ] as const)(
    'formats %s result-count announcements for %d items',
    (locale, count, expected) => {
      expect(historyResultCount(locale, historyMessages[locale], count)).toBe(
        expected,
      );
    },
  );

  it.each([
    ['en', 0, 'No saved analyses'],
    ['en', 1, '1 saved analysis'],
    ['en', 2, '2 saved analyses'],
    ['es', 1, '1 análisis guardado'],
    ['es', 2, '2 análisis guardados'],
    ['de', 1, '1 gespeicherte Analyse'],
    ['de', 2, '2 gespeicherte Analysen'],
  ] as const)(
    'preserves %s result-count copy for %d items',
    (locale, count, expected) => {
      expect(historyResultCount(locale, historyMessages[locale], count)).toBe(
        expected,
      );
    },
  );

  it('uses native quota and retry language without moving interpolated data', () => {
    expect(historyMessages.uk.actions.duplicate.reassurance('Докладний')).toBe(
      'Відкрийте збережену версію: Докладний. Новий аналіз не буде використано.',
    );
    expect(historyMessages.es.actions.duplicate.reassurance('Detallado')).toBe(
      'Abre la versión guardada: Detallado. No se consumirá otro análisis.',
    );
    expect(historyMessages.es.loadMore.retry).toBe(
      'Volver a intentar cargar más',
    );
    expect(
      historyMessages.de.actions.duplicate.reassurance('Detailliert'),
    ).toBe(
      'Öffne die gespeicherte Version: Detailliert. Es wird keine weitere Analyse verbraucht.',
    );
  });
});
