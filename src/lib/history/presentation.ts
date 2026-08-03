import type { HistoryDatabaseRow, HistoryItem } from './repository';
import { formatDate } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/locales';
import type { HistoryMessages } from '@/lib/i18n/messages/history';

export type HistoryPresentationOptions = Readonly<{
  locale: Locale;
  copy: HistoryMessages;
  timeZone?: string;
}>;

const statusKeys = {
  complete: 'ready',
  partial: 'partial',
  queued: 'processing',
  running: 'processing',
  failed: 'failed',
} as const satisfies Record<
  HistoryDatabaseRow['status'],
  'ready' | 'partial' | 'processing' | 'failed'
>;

function formatDuration(durationSeconds: number | null): string | null {
  if (durationSeconds === null) return null;

  const totalSeconds = Math.max(0, Math.floor(durationSeconds));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const minuteSeconds = `${minutes}:${seconds.toString().padStart(2, '0')}`;

  return hours
    ? `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`
    : minuteSeconds;
}

function formatHistoryDate(
  value: string | null,
  options: HistoryPresentationOptions,
): string | null {
  if (value === null) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;

  return formatDate({
    value: date,
    locale: options.locale,
    fallback: options.copy.presentation.dateUnavailable,
    options: { timeStyle: 'short', timeZone: options.timeZone },
  });
}

function historyHref(id: string, status: HistoryDatabaseRow['status']): string {
  const encodedId = encodeURIComponent(id);

  return status === 'queued' || status === 'running' || status === 'failed'
    ? `/app?analysis=${encodedId}`
    : `/app/video/${encodedId}`;
}

export function toHistoryItem(
  row: HistoryDatabaseRow,
  options: HistoryPresentationOptions,
): HistoryItem {
  const statusKey = statusKeys[row.status];

  return {
    id: row.id,
    sourceId: row.youtubeVideoId,
    href: historyHref(row.id, row.status),
    title: row.title,
    channel: row.channelTitle,
    thumbnailUrl: row.thumbnailUrl,
    source: row.canonicalUrl,
    language: row.transcriptLanguage,
    outputLocale: row.outputLocale,
    summaryPresetLabel:
      row.summaryPreset === null
        ? null
        : row.summaryPreset === 'detailed'
          ? options.copy.presentation.presets.detailed
          : options.copy.presentation.presets.balanced,
    durationSeconds: row.durationSeconds,
    durationLabel: formatDuration(row.durationSeconds),
    analyzedAt: row.analyzedAt,
    analyzedAtLabel: formatHistoryDate(row.analyzedAt, options),
    lastOpenedAt: row.lastOpenedAt,
    lastOpenedAtLabel: formatHistoryDate(row.lastOpenedAt, options),
    status: {
      key: statusKey,
      label: options.copy.presentation.statuses[statusKey],
    },
    favorite: row.favorite,
    selectedArtifacts: [...row.selectedArtifacts],
    readyArtifacts: [...row.readyArtifacts],
    canExport:
      (row.status === 'complete' || row.status === 'partial') &&
      row.readyArtifacts.length > 0,
    titleRevision: row.titleRevision,
  };
}
