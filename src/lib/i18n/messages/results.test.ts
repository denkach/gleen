import { describe, expect, test } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

import {
  formatKeyMomentsCount,
  formatResultMessage,
  resultMessages,
  type ResultMessages,
} from './results';

describe('resultMessages', () => {
  test('provides the complete English contract in every interface locale', () => {
    const englishKeys = Object.keys(resultMessages.en).sort();

    expect(Object.keys(resultMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    for (const locale of supportedLocales) {
      expect(Object.keys(resultMessages[locale]).sort()).toEqual(englishKeys);
      expect(Object.values(resultMessages[locale])).not.toContain('');
    }
  });

  test('keeps the dictionary closed and usable as the ResultMessages contract', () => {
    const copy: ResultMessages = resultMessages.uk;

    expect(copy.tabOverview).toBe('Огляд');
    expect(copy.favoriteAdd).toBeTruthy();
    expect(copy.sharePublicReadOnly).toBeTruthy();
    expect(copy.stateMalformed).toBeTruthy();
    expect(copy.sourceLabel).toBe('Джерело відео');
    expect(copy.currentChapter).toBe('Поточний розділ');
    expect(copy.keyMomentsCountOne).toContain('{count}');
    expect(copy.keyMomentsCountFew).toContain('{count}');
    expect(copy.keyMomentsCountMany).toContain('{count}');
    expect(copy.keyMomentsCountOther).toContain('{count}');
    expect(copy.playerProgressValue).toContain('{current}');
    expect(copy.playerVolumeValue).toContain('{percent}');
  });

  test('interpolates supplied result values without erasing missing tokens', () => {
    expect(
      formatResultMessage(resultMessages.de.playerProgressValue, {
        current: '1:15',
        duration: '3:00',
      }),
    ).toBe('1:15 von 3:00');
    expect(formatResultMessage(resultMessages.en.sourceThumbnail, {})).toBe(
      'Thumbnail for {title}',
    );
  });

  test.each([
    ['uk', 1, '1 ключовий момент'],
    ['uk', 2, '2 ключові моменти'],
    ['uk', 5, '5 ключових моментів'],
    ['ru', 1, '1 ключевой момент'],
    ['ru', 2, '2 ключевых момента'],
    ['ru', 5, '5 ключевых моментов'],
  ] as const)(
    'pluralizes %s key-moment count %i through shared locale rules',
    (locale, count, expected) => {
      expect(formatKeyMomentsCount(resultMessages[locale], count)).toBe(
        expected,
      );
    },
  );

  test('uses consistent native artifact terminology in audited result copy', () => {
    expect(resultMessages.en.exportIncludeMetadata).toBe(
      'AI-generated title & metadata',
    );
    expect(resultMessages.uk).toMatchObject({
      tabSummary: 'Конспект',
      overviewSummarySections: 'Розділи конспекту',
      overviewStartSummary: 'Почати з конспекту',
      summaryCopyFailed: 'Не вдалося скопіювати конспект',
      summaryEdit: 'Редагувати конспект',
      summaryOneSentence: 'Конспект одним реченням',
      summaryTitleField: 'Назва конспекту',
      summaryOverviewField: 'Огляд конспекту',
      summaryPointField: 'Пункт конспекту {count}',
      exportIncludeSummary: 'Конспект',
      exportIncludeSummaryDescription: 'Огляд і структурований конспект',
    });
    expect(resultMessages.ru.overviewRecommended).toBe('Рекомендуем далее');
    expect(resultMessages.es.summarySource).toBe('Abrir momento en el vídeo');
    expect(resultMessages.de).toMatchObject({
      overviewReviewed: 'Wiederholt',
      artifactNotRequestedTitle: 'Artefakt nicht angefordert',
      artifactNotRequestedBody:
        'Dieses Artefakt wurde für diese Analyse nicht ausgewählt.',
      artifactMissingTitle: 'Kein Artefaktinhalt',
      artifactMissingBody:
        'Diese Analyse hat keinen verwendbaren Inhalt für dieses Artefakt erzeugt.',
      artifactPendingTitle: 'Artefakt wird noch verarbeitet',
      artifactPendingBody:
        'Dieses Artefakt ist noch nicht fertig. Andere verfügbare Ergebnisse können weiter genutzt werden.',
      artifactMalformedTitle: 'Artefakt konnte nicht gelesen werden',
      artifactFailedTitle: 'Dieses Artefakt konnte nicht erstellt werden',
    });
  });
});
