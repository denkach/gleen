import type { TranscriptSegment } from '@/lib/youtube-intake/providers';
import { normalizeStoredSummaryMode } from '@/lib/summary-mode';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

import {
  generateFlashcards,
  generateSummary,
  generateTimestamps,
  SummaryGenerationError,
  type GeneratorContext,
  type SummaryGenerationMetadata,
} from './generators';
import type { AnalysisSnapshot } from './domain';
import { ProviderError, type StructuredGenerationProvider } from './provider';
import type { AnalysisRepository } from './repository';
import { transcriptArtifactV2Schema } from './artifact-schemas';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from './supabase-repository';
import { createUsageLedger, type UsageLedger } from './usage-ledger';
import { enrichTranscriptSegments } from './transcript-enrichment';

type PipelineDependencies = Readonly<{
  jobId: string;
  repository: AnalysisRepository;
  provider: StructuredGenerationProvider;
  ledger: UsageLedger;
  context: GeneratorContext;
  transcriptEnricher?: typeof enrichTranscriptSegments;
}>;

const stages = [
  'validating',
  'transcript',
  'structuring',
  'artifacts',
] as const;

async function recordStage(
  repository: AnalysisRepository,
  jobId: string,
  userId: string,
  attempt: number,
  stage: (typeof stages)[number] | 'complete',
) {
  await repository.setJobState(jobId, {
    status: stage === 'complete' ? 'complete' : 'running',
    stage,
    ...(stage === 'validating' ? { startedAt: new Date().toISOString() } : {}),
    ...(stage === 'complete' ? { completedAt: new Date().toISOString() } : {}),
  });
  await repository.recordEvent({
    jobId,
    userId,
    idempotencyKey: `attempt-${attempt}:${stage}:completed`,
    stage,
    status: 'completed',
    errorCode: null,
    metadata: {},
  });
}

async function recordSummaryGeneration(
  repository: AnalysisRepository,
  snapshot: AnalysisSnapshot,
  metadata: SummaryGenerationMetadata,
) {
  await repository.recordSummaryGenerationMetric({
    jobId: snapshot.job.id,
    attempt: snapshot.job.attempt,
    status: 'completed',
    errorCode: null,
    route: metadata.route,
    repairCount: metadata.repairCount,
    passes: metadata.passes,
    findingCounts: {},
  });
}

export async function executeAnalysisPipeline({
  jobId,
  repository,
  provider,
  ledger,
  context,
  transcriptEnricher = enrichTranscriptSegments,
}: PipelineDependencies): Promise<void> {
  let snapshot = await repository.findSnapshotByJobId(jobId);
  for (const stage of stages) {
    await recordStage(
      repository,
      jobId,
      snapshot.job.userId,
      snapshot.job.attempt,
      stage,
    );
  }

  const generators = {
    flashcards: generateFlashcards,
    timestamps: generateTimestamps,
  } as const;

  const transcript = snapshot.artifacts.find(
    ({ kind }) => kind === 'transcript',
  );
  if (transcript && transcript.status !== 'ready') {
    let transcriptContent:
      | ReturnType<typeof transcriptArtifactV2Schema.parse>
      | {
          schemaVersion: 1;
          language: string;
          segments: readonly TranscriptSegment[];
        };
    try {
      const enrichedSegments = transcriptEnricher(context.transcriptSegments);
      if (enrichedSegments.length !== context.transcriptSegments.length)
        throw new Error('Transcript enrichment changed segment count');
      transcriptContent = transcriptArtifactV2Schema.parse({
        schemaVersion: 2,
        language: context.transcriptLanguage,
        segments: context.transcriptSegments.map((segment, index) => ({
          ...segment,
          segmentType: enrichedSegments[index]?.segmentType,
          speakerLabel: null,
        })),
      });
    } catch {
      transcriptContent = {
        schemaVersion: 1,
        language: context.transcriptLanguage,
        segments: context.transcriptSegments,
      };
    }
    await repository.saveArtifactReady({
      jobId,
      analysisId: snapshot.job.analysisId,
      kind: 'transcript',
      schemaVersion: transcriptContent.schemaVersion,
      content: transcriptContent,
    });
  }

  for (const artifact of snapshot.artifacts) {
    if (artifact.status === 'ready' || artifact.kind === 'transcript') continue;
    try {
      let result;
      if (artifact.kind === 'summary') {
        const summaryResult = await generateSummary(provider, context);
        await recordSummaryGeneration(
          repository,
          snapshot,
          summaryResult.metadata,
        );
        result = summaryResult;
      } else {
        result = await generators[artifact.kind](provider, context);
      }
      await repository.saveArtifactReady({
        jobId,
        analysisId: snapshot.job.analysisId,
        kind: artifact.kind,
        schemaVersion: result.value.schemaVersion,
        content: result.value,
      });
    } catch (error) {
      const errorCode =
        error instanceof ProviderError
          ? error.code
          : 'invalid_provider_response';
      if (
        artifact.kind === 'summary' &&
        error instanceof SummaryGenerationError
      ) {
        await repository.recordSummaryGenerationMetric({
          jobId: snapshot.job.id,
          attempt: snapshot.job.attempt,
          status: 'failed',
          errorCode,
          route: error.metadata.route,
          repairCount: error.metadata.repairCount,
          passes: error.metadata.passes,
          findingCounts: error.metadata.findingCounts,
        });
      }
      await repository.saveArtifactFailed({
        jobId,
        analysisId: snapshot.job.analysisId,
        kind: artifact.kind,
        errorCode,
      });
    }
  }

  snapshot = await repository.findSnapshotByJobId(jobId);
  const generated = snapshot.artifacts;
  const readyCount = generated.filter(
    ({ status }) => status === 'ready',
  ).length;
  const status =
    readyCount === generated.length
      ? 'complete'
      : readyCount > 0
        ? 'partial'
        : 'failed';

  if (status === 'complete' || status === 'partial') {
    if (status === 'complete') {
      await recordStage(
        repository,
        jobId,
        snapshot.job.userId,
        snapshot.job.attempt,
        'complete',
      );
    } else {
      await repository.setJobState(jobId, {
        status,
        stage: 'artifacts',
        errorCode: 'artifact_generation_failed',
        completedAt: new Date().toISOString(),
      });
    }
    await ledger.settle(jobId);
  } else {
    await repository.setJobState(jobId, {
      status,
      stage: 'artifacts',
      errorCode: 'artifact_generation_failed',
      completedAt: new Date().toISOString(),
    });
    await ledger.release(jobId);
  }
}

export async function loadGeneratorContext(
  client: ReturnType<typeof createAdminSupabaseClient>,
  analysisId: string,
): Promise<GeneratorContext> {
  const { data, error } = await client
    .from('analysis_intakes')
    .select(
      'output_locale,summary_preset,flashcard_preset,duration_seconds,transcript_language,transcript_segments',
    )
    .eq('id', analysisId)
    .single();
  if (error || !data) throw new Error('Unable to load analysis context');
  return {
    outputLocale: data.output_locale as GeneratorContext['outputLocale'],
    transcriptLanguage: data.transcript_language as string,
    summaryPreset:
      data.summary_preset === null
        ? null
        : normalizeStoredSummaryMode(data.summary_preset),
    flashcardPreset:
      data.flashcard_preset as GeneratorContext['flashcardPreset'],
    durationSeconds: data.duration_seconds as number,
    transcriptSegments: data.transcript_segments as TranscriptSegment[],
  };
}

async function executeProductionPipeline(jobId: string) {
  'use step';
  const { validateAnalysisProviderEnv } = await import('@/env');
  const { createOpenRouterProvider } = await import('./openrouter-provider');
  const client = createAdminSupabaseClient();
  const repository = createSupabaseAnalysisRepository(
    client as unknown as SupabaseAnalysisClient,
  );
  const snapshot = await repository.findSnapshotByJobId(jobId);
  const context = await loadGeneratorContext(client, snapshot.job.analysisId);
  const environment = validateAnalysisProviderEnv(process.env);
  await executeAnalysisPipeline({
    jobId,
    repository,
    ledger: createUsageLedger(repository),
    provider: createOpenRouterProvider({
      apiKey: environment.OPENROUTER_API_KEY,
      model: environment.OPENROUTER_MODEL,
    }),
    context,
  });
}

export async function runAnalysisWorkflow(input: { jobId: string }) {
  'use workflow';
  await executeProductionPipeline(input.jobId);
}
