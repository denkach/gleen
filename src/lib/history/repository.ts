import type {
  AnalysisJobStatus,
  ArtifactKind,
} from '@/lib/analysis-pipeline/domain';
import type { HistoryQuery } from '@/lib/history/query';

export type HistoryDatabaseRow = Readonly<{
  id: string;
  youtubeVideoId: string;
  canonicalUrl: string;
  title: string;
  channelTitle: string | null;
  thumbnailUrl: string | null;
  transcriptLanguage: string | null;
  outputLocale: string;
  summaryPreset: 'balanced' | 'detailed' | null;
  durationSeconds: number | null;
  selectedArtifacts: readonly ArtifactKind[];
  readyArtifacts: readonly ArtifactKind[];
  status: AnalysisJobStatus;
  analyzedAt: string;
  lastOpenedAt: string | null;
  favorite: boolean;
  titleRevision: string;
}>;

export type HistoryStatus = Readonly<{
  key: 'ready' | 'partial' | 'processing' | 'failed';
  label: string;
}>;

export type HistoryItem = Readonly<{
  id: string;
  sourceId: string;
  href: string;
  title: string;
  channel: string | null;
  thumbnailUrl: string | null;
  source: string;
  language: string | null;
  outputLocale: string;
  summaryPresetLabel: string | null;
  durationSeconds: number | null;
  durationLabel: string | null;
  analyzedAt: string;
  analyzedAtLabel: string | null;
  lastOpenedAt: string | null;
  lastOpenedAtLabel: string | null;
  status: HistoryStatus;
  favorite: boolean;
  selectedArtifacts: readonly ArtifactKind[];
  readyArtifacts: readonly ArtifactKind[];
  canExport: boolean;
  titleRevision: string;
}>;

export type HistoryPage = Readonly<{
  items: readonly HistoryItem[];
  nextCursor: string | null;
}>;

export type HistoryFacets = Readonly<{
  languages: readonly string[];
  sources: readonly string[];
}>;

export interface HistoryRepository {
  listOwned(
    userId: string,
    query: HistoryQuery,
    limit: number,
  ): Promise<HistoryPage>;
  listFacets(userId: string): Promise<HistoryFacets>;
  findOwnedReusableDuplicate(
    userId: string,
    analysisId: string,
  ): Promise<HistoryItem | null>;
  deleteOwned(userId: string, analysisId: string): Promise<boolean>;
}
