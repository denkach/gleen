import { describe, expect, test } from 'vitest';

import { historyMessages } from '@/lib/i18n/messages/history';

import { toHistoryItem } from './presentation';
import type { HistoryDatabaseRow } from './repository';

function row(overrides: Partial<HistoryDatabaseRow> = {}): HistoryDatabaseRow {
  return {
    id: 'a-1',
    youtubeVideoId: 'video-1',
    canonicalUrl: 'https://www.youtube.com/watch?v=video-1',
    title: 'Systems thinking',
    channelTitle: 'Knowledge Channel',
    thumbnailUrl: 'https://i.ytimg.com/vi/video-1/hqdefault.jpg',
    transcriptLanguage: 'en',
    outputLocale: 'en',
    summaryPreset: 'balanced',
    durationSeconds: 900,
    selectedArtifacts: ['summary', 'flashcards'],
    readyArtifacts: ['summary', 'flashcards'],
    status: 'complete',
    analyzedAt: '2026-07-24T14:35:00.000Z',
    lastOpenedAt: '2026-07-24T16:05:00.000Z',
    favorite: false,
    titleRevision: '2026-07-24T14:35:00.000Z',
    ...overrides,
  };
}

const formatOptions = {
  locale: 'en',
  copy: historyMessages.en,
  timeZone: 'UTC',
} as const;

describe('history presentation', () => {
  test.each([
    ['complete', { key: 'ready', label: 'Ready' }],
    ['partial', { key: 'partial', label: 'Partial' }],
    ['queued', { key: 'processing', label: 'Processing' }],
    ['running', { key: 'processing', label: 'Processing' }],
    ['failed', { key: 'failed', label: 'Failed' }],
  ] as const)('maps %s to its semantic status', (status, expected) => {
    expect(toHistoryItem(row({ status }), formatOptions).status).toEqual(
      expected,
    );
  });

  test.each(['queued', 'running', 'failed'] as const)(
    'reopens %s through the no-credit analysis route',
    (status) => {
      expect(
        toHistoryItem(row({ id: 'a/1', status }), formatOptions).href,
      ).toBe('/app?analysis=a%2F1');
    },
  );

  test.each(['complete', 'partial'] as const)(
    'opens %s saved results directly',
    (status) => {
      expect(
        toHistoryItem(row({ id: 'a/1', status }), formatOptions).href,
      ).toBe('/app/video/a%2F1');
    },
  );

  test('allows export only when at least one artifact is ready', () => {
    expect(
      toHistoryItem(row({ readyArtifacts: ['summary'] }), formatOptions)
        .canExport,
    ).toBe(true);
    expect(
      toHistoryItem(row({ readyArtifacts: [] }), formatOptions).canExport,
    ).toBe(false);
  });

  test.each(['queued', 'running', 'failed'] as const)(
    'does not expose Export for %s even when an artifact is already ready',
    (status) => {
      expect(
        toHistoryItem(
          row({ status, readyArtifacts: ['summary'] }),
          formatOptions,
        ).canExport,
      ).toBe(false);
    },
  );

  test.each([
    [2058, '34:18'],
    [3723, '1:02:03'],
  ] as const)('formats %i seconds as %s', (durationSeconds, expected) => {
    expect(
      toHistoryItem(row({ durationSeconds }), formatOptions).durationLabel,
    ).toBe(expected);
  });

  test('formats dates with the injected locale and time zone', () => {
    const item = toHistoryItem(row(), formatOptions);

    expect(item.analyzedAt).toBe('2026-07-24T14:35:00.000Z');
    expect(item.analyzedAtLabel).toBe('24 Jul 2026, 14:35');
    expect(item.lastOpenedAt).toBe('2026-07-24T16:05:00.000Z');
    expect(item.lastOpenedAtLabel).toBe('24 Jul 2026, 16:05');
  });

  test('localizes German status, preset, and date presentation without changing source data', () => {
    const item = toHistoryItem(
      row({
        title: 'Systems thinking',
        channelTitle: 'Knowledge Channel',
        transcriptLanguage: 'en',
        summaryPreset: 'deep',
      }),
      { locale: 'de', copy: historyMessages.de, timeZone: 'UTC' },
    );

    expect(item).toMatchObject({
      title: 'Systems thinking',
      channel: 'Knowledge Channel',
      language: 'en',
      summaryPresetLabel: 'Detailliert',
      analyzedAtLabel: '24.07.2026, 14:35',
      status: { key: 'ready', label: 'Bereit' },
    });
  });

  test('preserves source values and keeps missing metadata absent', () => {
    const item = toHistoryItem(
      row({
        channelTitle: null,
        thumbnailUrl: null,
        transcriptLanguage: null,
        summaryPreset: null,
        durationSeconds: null,
        lastOpenedAt: null,
      }),
      formatOptions,
    );

    expect(item).toMatchObject({
      id: 'a-1',
      sourceId: 'video-1',
      source: 'https://www.youtube.com/watch?v=video-1',
      title: 'Systems thinking',
      channel: null,
      thumbnailUrl: null,
      language: null,
      durationSeconds: null,
      durationLabel: null,
      lastOpenedAt: null,
      lastOpenedAtLabel: null,
      outputLocale: 'en',
      summaryPresetLabel: null,
      selectedArtifacts: ['summary', 'flashcards'],
      readyArtifacts: ['summary', 'flashcards'],
      titleRevision: '2026-07-24T14:35:00.000Z',
    });
  });

  test.each([
    ['balanced', 'Balanced'],
    ['deep', 'Detailed'],
  ] as const)(
    'maps the persisted %s summary preset to safe copy',
    (preset, label) => {
      expect(
        toHistoryItem(row({ summaryPreset: preset }), formatOptions)
          .summaryPresetLabel,
      ).toBe(label);
    },
  );
});
