import { z } from 'zod';

export const jobStatusSchema = z.enum([
  'queued',
  'running',
  'partial',
  'complete',
  'failed',
]);
export const jobStageSchema = z.enum([
  'validating',
  'transcript',
  'structuring',
  'artifacts',
  'complete',
]);
export const artifactKindSchema = z.enum([
  'transcript',
  'summary',
  'flashcards',
  'timestamps',
]);

export type AnalysisJobStatus = z.infer<typeof jobStatusSchema>;
export type AnalysisJobStage = z.infer<typeof jobStageSchema>;
export type ArtifactKind = z.infer<typeof artifactKindSchema>;

const nullableString = z.string().nullable();

const jobRowSchema = z
  .object({
    id: z.string(),
    analysis_id: z.string(),
    user_id: z.string(),
    workflow_run_id: nullableString,
    status: jobStatusSchema,
    stage: jobStageSchema,
    attempt: z.number().int().positive(),
    revision: z.number().int().positive(),
    error_code: nullableString,
    started_at: nullableString,
    completed_at: nullableString,
    created_at: z.string(),
    updated_at: z.string(),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    analysisId: row.analysis_id,
    userId: row.user_id,
    workflowRunId: row.workflow_run_id,
    status: row.status,
    stage: row.stage,
    attempt: row.attempt,
    revision: row.revision,
    errorCode: row.error_code,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

const eventRowSchema = z
  .object({
    id: z.string(),
    job_id: z.string(),
    user_id: z.string(),
    idempotency_key: z.string(),
    stage: jobStageSchema,
    status: z.enum(['started', 'completed', 'retrying', 'failed']),
    error_code: nullableString,
    metadata: z.record(z.string(), z.unknown()),
    created_at: z.string(),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    idempotencyKey: row.idempotency_key,
    stage: row.stage,
    status: row.status,
    errorCode: row.error_code,
    metadata: row.metadata,
    createdAt: row.created_at,
  }));

const artifactRowSchema = z
  .object({
    id: z.string(),
    analysis_id: z.string(),
    user_id: z.string(),
    kind: artifactKindSchema,
    status: z.enum(['pending', 'ready', 'failed']),
    schema_version: z.number().int().positive(),
    content: z.unknown().nullable(),
    error_code: nullableString,
    generated_at: nullableString,
    updated_at: z.string(),
  })
  .strict()
  .superRefine((artifact, context) => {
    const valid =
      (artifact.status === 'ready' &&
        artifact.content !== null &&
        artifact.error_code === null) ||
      (artifact.status === 'failed' &&
        artifact.content === null &&
        artifact.error_code !== null) ||
      (artifact.status === 'pending' &&
        artifact.content === null &&
        artifact.error_code === null);
    if (!valid)
      context.addIssue({
        code: 'custom',
        message: 'Artifact content does not match status',
      });
  })
  .transform((row) => ({
    id: row.id,
    analysisId: row.analysis_id,
    userId: row.user_id,
    kind: row.kind,
    status: row.status,
    schemaVersion: row.schema_version,
    content: row.content,
    errorCode: row.error_code,
    generatedAt: row.generated_at,
    updatedAt: row.updated_at,
  }));

const reservationRowSchema = z
  .object({
    id: z.string(),
    job_id: z.string(),
    user_id: z.string(),
    status: z.enum(['reserved', 'settled', 'released']),
    updated_at: z.string(),
  })
  .strict()
  .transform((row) => ({
    id: row.id,
    jobId: row.job_id,
    userId: row.user_id,
    status: row.status,
    updatedAt: row.updated_at,
  }));

const snapshotRowSchema = z
  .object({
    job: jobRowSchema,
    events: z.array(eventRowSchema),
    artifacts: z.array(artifactRowSchema),
    usage_reservation: reservationRowSchema,
  })
  .strict()
  .transform((row) => ({
    job: row.job,
    events: row.events,
    artifacts: row.artifacts,
    usageReservation: row.usage_reservation,
  }));

export type AnalysisJob = Readonly<z.output<typeof jobRowSchema>>;
export type AnalysisJobEvent = Readonly<z.output<typeof eventRowSchema>>;
export type AnalysisArtifact = Readonly<z.output<typeof artifactRowSchema>>;
export type UsageReservation = Readonly<z.output<typeof reservationRowSchema>>;
export type AnalysisSnapshot = Readonly<{
  job: AnalysisJob;
  events: readonly AnalysisJobEvent[];
  artifacts: readonly AnalysisArtifact[];
  usageReservation: UsageReservation;
}>;

export function parseAnalysisSnapshot(input: unknown): AnalysisSnapshot {
  return snapshotRowSchema.parse(input);
}
