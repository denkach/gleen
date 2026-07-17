import type { NormalizedIntakeConfiguration } from './configuration';
import type { TranscriptSegment } from './providers';

export type AnalysisIntake = Readonly<{
  id: string;
  userId: string;
  youtubeVideoId: string;
  canonicalUrl: string;
  title: string;
  channelTitle: string;
  durationSeconds: number;
  thumbnailUrl: string;
  transcriptLanguage: string;
  transcriptSegments: readonly TranscriptSegment[];
  configuration: NormalizedIntakeConfiguration;
  duplicateKey: string;
  attempt: number;
  status: 'ready' | 'processing' | 'complete' | 'failed';
  reanalysisOf: string | null;
  createdAt: string;
}>;

export type NewAnalysisIntake = Omit<
  AnalysisIntake,
  'id' | 'attempt' | 'status' | 'reanalysisOf' | 'createdAt'
>;

export type InsertReadyResult =
  | Readonly<{ kind: 'inserted'; intake: AnalysisIntake }>
  | Readonly<{ kind: 'recovered'; intake: AnalysisIntake }>;

export type IntakeRepository = Readonly<{
  findReusable(
    userId: string,
    duplicateKey: string,
  ): Promise<AnalysisIntake | null>;
  insertReady(input: NewAnalysisIntake): Promise<InsertReadyResult>;
  findOwned(userId: string, id: string): Promise<AnalysisIntake | null>;
  createReanalysis(
    userId: string,
    sourceId: string,
    refreshedSnapshot: NewAnalysisIntake,
  ): Promise<AnalysisIntake>;
}>;
