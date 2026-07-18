import {
  jobStatusSchema,
  parseAnalysisSnapshot,
  type ArtifactKind,
} from './domain';
import { parseIntakeRow } from '@/lib/youtube-intake/supabase-repository';
import type {
  FlashcardsArtifact,
  SummaryArtifact,
  TimestampsArtifact,
} from './artifact-schemas';
import type {
  AnalysisRepository,
  FailedArtifactWrite,
  JobStateUpdate,
  NewAnalysisEvent,
  ReadyArtifactWrite,
} from './repository';

type SupabaseError = Readonly<{ code?: string; message?: string }>;
type SupabaseResult = Readonly<{
  data: unknown;
  error: SupabaseError | null;
}>;

type Query = Readonly<{
  select(columns?: string): Query;
  insert(values: Record<string, unknown>): Query;
  upsert(
    values: Record<string, unknown>,
    options: Readonly<{ onConflict: string; ignoreDuplicates: boolean }>,
  ): PromiseLike<SupabaseResult>;
  update(values: Record<string, unknown>): Query;
  eq(column: string, value: unknown): Query;
  in(column: string, values: readonly unknown[]): Query;
  neq(column: string, value: unknown): Query;
  order(column: string, options: Readonly<{ ascending: boolean }>): Query;
  limit(count: number): Query;
  maybeSingle(): PromiseLike<SupabaseResult>;
  single(): PromiseLike<SupabaseResult>;
  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?:
      ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}>;

export type SupabaseAnalysisClient = Readonly<{
  from(table: string): Query;
  rpc(
    functionName: 'create_analysis_pipeline' | 'retry_analysis_pipeline',
    arguments_: Readonly<{ analysis_id: string }>,
  ): PromiseLike<SupabaseResult>;
}>;

export type ResultArtifactRepository = Readonly<{
  saveOwnedArtifact(
    input: Readonly<{
      userId: string;
      analysisId: string;
      expectedUpdatedAt: string;
    }> &
      (
        | Readonly<{ kind: 'summary'; content: SummaryArtifact }>
        | Readonly<{ kind: 'flashcards'; content: FlashcardsArtifact }>
        | Readonly<{ kind: 'timestamps'; content: TimestampsArtifact }>
      ),
  ): Promise<string | null>;
}>;

export class AnalysisRepositoryError extends Error {
  readonly code = 'persistence_failure' as const;

  constructor() {
    super('Unable to persist analysis pipeline');
    this.name = 'AnalysisRepositoryError';
  }
}

function ensureSuccess(result: SupabaseResult): unknown {
  if (result.error) throw new AnalysisRepositoryError();
  return result.data;
}

function ensureRequired(result: SupabaseResult): unknown {
  const data = ensureSuccess(result);
  if (data === null) throw new AnalysisRepositoryError();
  return data;
}

function updatedAtOrConflict(result: SupabaseResult): string | null {
  const data = ensureSuccess(result);
  if (data === null) return null;
  if (
    typeof data !== 'object' ||
    !('updated_at' in data) ||
    typeof data.updated_at !== 'string'
  ) {
    throw new AnalysisRepositoryError();
  }
  return data.updated_at;
}

export function createSupabaseAnalysisRepository(
  client: SupabaseAnalysisClient,
): AnalysisRepository & ResultArtifactRepository {
  async function findSnapshot(
    column: 'analysis_id' | 'id',
    value: string,
    userId?: string,
  ) {
    let jobQuery = client.from('analysis_jobs').select('*').eq(column, value);
    if (userId) jobQuery = jobQuery.eq('user_id', userId);
    const job = ensureSuccess(await jobQuery.maybeSingle());
    if (job === null) return null;
    if (typeof job !== 'object' || job === null || !('id' in job)) {
      throw new AnalysisRepositoryError();
    }
    const jobRow = job as Record<string, unknown>;
    const analysisId = jobRow.analysis_id;
    const jobId = jobRow.id;
    if (typeof analysisId !== 'string' || typeof jobId !== 'string') {
      throw new AnalysisRepositoryError();
    }

    const [eventsResult, artifactsResult, reservationResult] =
      await Promise.all([
        client
          .from('analysis_job_events')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', userId ?? jobRow.user_id)
          .order('created_at', { ascending: true }),
        client
          .from('analysis_artifacts')
          .select('*')
          .eq('analysis_id', analysisId)
          .eq('user_id', userId ?? jobRow.user_id)
          .order('kind', { ascending: true }),
        client
          .from('analysis_usage_reservations')
          .select('*')
          .eq('job_id', jobId)
          .eq('user_id', userId ?? jobRow.user_id)
          .single(),
      ]);

    try {
      return parseAnalysisSnapshot({
        job: jobRow,
        events: ensureRequired(eventsResult),
        artifacts: ensureRequired(artifactsResult),
        usage_reservation: ensureRequired(reservationResult),
      });
    } catch (error) {
      if (error instanceof AnalysisRepositoryError) throw error;
      throw new AnalysisRepositoryError();
    }
  }

  async function updateRequired(query: Query): Promise<void> {
    const result = await query.select('id').maybeSingle();
    ensureRequired(result);
  }

  async function loadArtifact(analysisId: string, kind: ArtifactKind) {
    const result = await client
      .from('analysis_artifacts')
      .select('status')
      .eq('analysis_id', analysisId)
      .eq('kind', kind)
      .maybeSingle();
    const data = ensureRequired(result);
    if (
      typeof data !== 'object' ||
      data === null ||
      !('status' in data) ||
      !['pending', 'ready', 'failed'].includes(String(data.status))
    ) {
      throw new AnalysisRepositoryError();
    }
    return data.status as 'pending' | 'ready' | 'failed';
  }

  async function saveArtifactReady(input: ReadyArtifactWrite) {
    if ((await loadArtifact(input.analysisId, input.kind)) === 'ready') return;
    await updateRequired(
      client
        .from('analysis_artifacts')
        .update({
          status: 'ready',
          schema_version: input.schemaVersion,
          content: input.content,
          error_code: null,
          generated_at: new Date().toISOString(),
        })
        .eq('analysis_id', input.analysisId)
        .eq('kind', input.kind)
        .neq('status', 'ready'),
    );
  }

  async function createOrRetry(
    functionName: 'create_analysis_pipeline' | 'retry_analysis_pipeline',
    userId: string,
    analysisId: string,
  ) {
    ensureRequired(await client.rpc(functionName, { analysis_id: analysisId }));
    const snapshot = await findSnapshot('analysis_id', analysisId, userId);
    if (!snapshot) throw new AnalysisRepositoryError();
    return snapshot;
  }

  return {
    async findMostRecentOwnedActive(userId) {
      const result = await client
        .from('analysis_jobs')
        .select('*, analysis_intakes(*)')
        .eq('user_id', userId)
        .eq('analysis_intakes.user_id', userId)
        .in('status', ['queued', 'running'])
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      const row = ensureSuccess(result);
      if (row === null) return null;
      if (
        typeof row !== 'object' ||
        !('analysis_id' in row) ||
        typeof row.analysis_id !== 'string' ||
        !('analysis_intakes' in row)
      )
        throw new AnalysisRepositoryError();
      const snapshot = await findSnapshot(
        'analysis_id',
        row.analysis_id,
        userId,
      );
      if (!snapshot) throw new AnalysisRepositoryError();
      try {
        return { intake: parseIntakeRow(row.analysis_intakes), snapshot };
      } catch {
        throw new AnalysisRepositoryError();
      }
    },

    async listOwnedHistory(userId, requestedLimit) {
      const result = await client
        .from('analysis_jobs')
        .select('analysis_id,status,updated_at,analysis_intakes(title)')
        .eq('user_id', userId)
        .eq('analysis_intakes.user_id', userId)
        .order('updated_at', { ascending: false })
        .limit(Math.min(Math.max(Math.trunc(requestedLimit), 0), 50));
      const data = ensureSuccess(result);
      if (!Array.isArray(data)) throw new AnalysisRepositoryError();
      try {
        return data.map((candidate) => {
          if (typeof candidate !== 'object' || candidate === null)
            throw new AnalysisRepositoryError();
          const row = candidate as Record<string, unknown>;
          const intake = row.analysis_intakes;
          if (
            typeof row.analysis_id !== 'string' ||
            typeof row.updated_at !== 'string' ||
            typeof intake !== 'object' ||
            intake === null ||
            !('title' in intake) ||
            typeof intake.title !== 'string'
          )
            throw new AnalysisRepositoryError();
          return {
            id: row.analysis_id,
            title: intake.title,
            status: jobStatusSchema.parse(row.status),
            updatedAt: row.updated_at,
          };
        });
      } catch {
        throw new AnalysisRepositoryError();
      }
    },

    async saveOwnedArtifact(input): Promise<string | null> {
      const result = await client
        .from('analysis_artifacts')
        .update({ content: input.content })
        .eq('analysis_id', input.analysisId)
        .eq('user_id', input.userId)
        .eq('kind', input.kind)
        .eq('status', 'ready')
        .eq('updated_at', input.expectedUpdatedAt)
        .select('updated_at')
        .maybeSingle();
      return updatedAtOrConflict(result);
    },

    createForAnalysis: (userId, analysisId) =>
      createOrRetry('create_analysis_pipeline', userId, analysisId),

    findOwnedSnapshot: (userId, analysisId) =>
      findSnapshot('analysis_id', analysisId, userId),

    async findSnapshotByJobId(jobId) {
      const snapshot = await findSnapshot('id', jobId);
      if (!snapshot) throw new AnalysisRepositoryError();
      return snapshot;
    },

    async attachWorkflowRun(jobId, runId) {
      await updateRequired(
        client
          .from('analysis_jobs')
          .update({ workflow_run_id: runId })
          .eq('id', jobId),
      );
    },

    async recordEvent(input: NewAnalysisEvent) {
      ensureSuccess(
        await client.from('analysis_job_events').upsert(
          {
            job_id: input.jobId,
            user_id: input.userId,
            idempotency_key: input.idempotencyKey,
            stage: input.stage,
            status: input.status,
            error_code: input.errorCode,
            metadata: input.metadata,
          },
          {
            onConflict: 'job_id,idempotency_key',
            ignoreDuplicates: true,
          },
        ),
      );
    },

    async setJobState(jobId, state: JobStateUpdate) {
      await updateRequired(
        client
          .from('analysis_jobs')
          .update({
            status: state.status,
            stage: state.stage,
            ...(state.errorCode !== undefined
              ? { error_code: state.errorCode }
              : {}),
            ...(state.startedAt !== undefined
              ? { started_at: state.startedAt }
              : {}),
            ...(state.completedAt !== undefined
              ? { completed_at: state.completedAt }
              : {}),
          })
          .eq('id', jobId),
      );
    },

    saveArtifactReady,

    async saveArtifactFailed(input: FailedArtifactWrite) {
      if ((await loadArtifact(input.analysisId, input.kind)) === 'ready')
        return;
      await updateRequired(
        client
          .from('analysis_artifacts')
          .update({
            status: 'failed',
            content: null,
            error_code: input.errorCode,
            generated_at: null,
          })
          .eq('analysis_id', input.analysisId)
          .eq('kind', input.kind)
          .neq('status', 'ready'),
      );
    },

    async setReservationStatus(jobId, status) {
      await updateRequired(
        client
          .from('analysis_usage_reservations')
          .update({ status })
          .eq('job_id', jobId),
      );
    },

    prepareRetry: (userId, analysisId) =>
      createOrRetry('retry_analysis_pipeline', userId, analysisId),
  };
}
