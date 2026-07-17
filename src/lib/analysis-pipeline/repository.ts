import type {
  AnalysisJobStage,
  AnalysisJobStatus,
  AnalysisSnapshot,
  ArtifactKind,
} from './domain';

export type NewAnalysisEvent = Readonly<{
  jobId: string;
  userId: string;
  idempotencyKey: string;
  stage: AnalysisJobStage;
  status: 'started' | 'completed' | 'retrying' | 'failed';
  errorCode: string | null;
  metadata: Readonly<Record<string, unknown>>;
}>;

export type JobStateUpdate = Readonly<{
  status: AnalysisJobStatus;
  stage: AnalysisJobStage;
  errorCode?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
}>;

export type ReadyArtifactWrite = Readonly<{
  jobId: string;
  analysisId: string;
  kind: ArtifactKind;
  schemaVersion: number;
  content: unknown;
}>;

export type FailedArtifactWrite = Readonly<{
  jobId: string;
  analysisId: string;
  kind: ArtifactKind;
  errorCode: string;
}>;

export type AnalysisRepository = Readonly<{
  createForAnalysis(
    userId: string,
    analysisId: string,
  ): Promise<AnalysisSnapshot>;
  findOwnedSnapshot(
    userId: string,
    analysisId: string,
  ): Promise<AnalysisSnapshot | null>;
  findSnapshotByJobId(jobId: string): Promise<AnalysisSnapshot>;
  attachWorkflowRun(jobId: string, runId: string): Promise<void>;
  recordEvent(input: NewAnalysisEvent): Promise<void>;
  setJobState(jobId: string, state: JobStateUpdate): Promise<void>;
  saveArtifactReady(input: ReadyArtifactWrite): Promise<void>;
  saveArtifactFailed(input: FailedArtifactWrite): Promise<void>;
  setReservationStatus(
    jobId: string,
    status: 'settled' | 'released',
  ): Promise<void>;
  prepareRetry(userId: string, analysisId: string): Promise<AnalysisSnapshot>;
}>;
