import type {
  HistoryDatabaseRow,
  HistoryItem,
  HistoryStatus,
} from './repository';

export type HistoryPresentationOptions = Readonly<{
  locale?: string;
  timeZone?: string;
}>;

const statuses = {
  complete: { key: 'ready', label: 'Ready' },
  partial: { key: 'partial', label: 'Partial' },
  queued: { key: 'processing', label: 'Processing' },
  running: { key: 'processing', label: 'Processing' },
  failed: { key: 'failed', label: 'Failed' },
} as const satisfies Record<HistoryDatabaseRow['status'], HistoryStatus>;

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

function formatDate(
  value: string | null,
  formatter: Intl.DateTimeFormat,
): string | null {
  if (value === null) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : formatter.format(date);
}

function historyHref(id: string, status: HistoryDatabaseRow['status']): string {
  const encodedId = encodeURIComponent(id);

  return status === 'queued' || status === 'running' || status === 'failed'
    ? `/app?analysis=${encodedId}`
    : `/app/video/${encodedId}`;
}

export function toHistoryItem(
  row: HistoryDatabaseRow,
  options: HistoryPresentationOptions = {},
): HistoryItem {
  const dateFormatter = new Intl.DateTimeFormat(options.locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: options.timeZone,
  });

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
    durationSeconds: row.durationSeconds,
    durationLabel: formatDuration(row.durationSeconds),
    analyzedAt: row.analyzedAt,
    analyzedAtLabel: formatDate(row.analyzedAt, dateFormatter),
    lastOpenedAt: row.lastOpenedAt,
    lastOpenedAtLabel: formatDate(row.lastOpenedAt, dateFormatter),
    status: statuses[row.status],
    favorite: row.favorite,
    selectedArtifacts: [...row.selectedArtifacts],
    readyArtifacts: [...row.readyArtifacts],
    canExport: row.readyArtifacts.length > 0,
    titleRevision: row.titleRevision,
  };
}
