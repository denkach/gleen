import { z } from 'zod';

import { artifactSchema } from './configuration';
import type {
  AnalysisIntake,
  IntakeRepository,
  NewAnalysisIntake,
} from './repository';

type SupabaseError = Readonly<{ code?: string }>;
type SupabaseResult = Readonly<{
  data: unknown;
  error: SupabaseError | null;
}>;

type FilterQuery = Readonly<{
  select(columns?: string): FilterQuery;
  update(values: Record<string, unknown>): FilterQuery;
  eq(column: string, value: unknown): FilterQuery;
  neq(column: string, value: unknown): FilterQuery;
  order(column: string, options: { ascending: boolean }): FilterQuery;
  limit(count: number): FilterQuery;
  maybeSingle(): PromiseLike<SupabaseResult>;
}>;

type TableQuery = Readonly<{
  select(columns?: string): FilterQuery;
  update(values: Record<string, unknown>): FilterQuery;
  insert(values: Record<string, unknown>): Readonly<{
    select(columns?: string): Readonly<{
      single(): PromiseLike<SupabaseResult>;
    }>;
  }>;
}>;

export type SupabaseIntakeClient = Readonly<{
  from(table: 'analysis_intakes'): TableQuery;
  rpc(
    functionName: 'create_analysis_reattempt',
    arguments_: Readonly<{
      source_id: string;
      refreshed_snapshot: Record<string, unknown>;
    }>,
  ): PromiseLike<SupabaseResult>;
}>;

export type ResultTitleRepository = Readonly<{
  saveOwnedTitle(
    input: Readonly<{
      userId: string;
      analysisId: string;
      title: string;
      expectedUpdatedAt: string;
    }>,
  ): Promise<string | null>;
}>;

const transcriptSegmentSchema = z.object({
  text: z.string().min(1),
  offsetMs: z.number().int().nonnegative().safe(),
  durationMs: z.number().int().positive().safe(),
});

const intakeRowSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  youtube_video_id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
  canonical_url: z.url().startsWith('https://'),
  title: z.string().trim().min(1),
  channel_title: z.string().trim().min(1),
  duration_seconds: z.number().int().positive(),
  thumbnail_url: z.url().startsWith('https://'),
  transcript_language: z.string().trim().min(1),
  transcript_segments: z.array(transcriptSegmentSchema),
  output_locale: z.enum(['uk', 'ru', 'en', 'es', 'de']),
  summary_preset: z.enum(['balanced', 'detailed']).nullable(),
  flashcard_preset: z.union([z.literal(18), z.literal(30)]).nullable(),
  selected_artifacts: z.array(artifactSchema).min(1),
  analysis_contract_version: z.literal(1),
  duplicate_key: z.string().regex(/^[0-9a-f]{64}$/),
  attempt: z.number().int().positive(),
  status: z.enum(['ready', 'processing', 'complete', 'failed']),
  reanalysis_of: z.uuid().nullable(),
  created_at: z.iso.datetime({ offset: true }),
  updated_at: z.iso.datetime({ offset: true }),
});

export class IntakeRepositoryError extends Error {
  readonly code = 'persistence_failure' as const;

  constructor() {
    super('Unable to persist analysis intake');
    this.name = 'IntakeRepositoryError';
  }
}

export function parseIntakeRow(input: unknown): AnalysisIntake {
  const parsed = intakeRowSchema.safeParse(input);
  if (!parsed.success) throw new IntakeRepositoryError();
  const row = parsed.data;

  return {
    id: row.id,
    userId: row.user_id,
    youtubeVideoId: row.youtube_video_id,
    canonicalUrl: row.canonical_url,
    title: row.title,
    channelTitle: row.channel_title,
    durationSeconds: row.duration_seconds,
    thumbnailUrl: row.thumbnail_url,
    transcriptLanguage: row.transcript_language,
    transcriptSegments: row.transcript_segments,
    configuration: {
      outputLocale: row.output_locale,
      summaryPreset: row.summary_preset,
      flashcardPreset: row.flashcard_preset,
      artifacts: row.selected_artifacts,
      analysisContractVersion: row.analysis_contract_version,
    },
    duplicateKey: row.duplicate_key,
    attempt: row.attempt,
    status: row.status,
    reanalysisOf: row.reanalysis_of,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInsertRow(input: NewAnalysisIntake): Record<string, unknown> {
  return {
    user_id: input.userId,
    youtube_video_id: input.youtubeVideoId,
    canonical_url: input.canonicalUrl,
    title: input.title,
    channel_title: input.channelTitle,
    duration_seconds: input.durationSeconds,
    thumbnail_url: input.thumbnailUrl,
    transcript_language: input.transcriptLanguage,
    transcript_segments: input.transcriptSegments,
    output_locale: input.configuration.outputLocale,
    summary_preset: input.configuration.summaryPreset,
    flashcard_preset: input.configuration.flashcardPreset,
    selected_artifacts: input.configuration.artifacts,
    analysis_contract_version: input.configuration.analysisContractVersion,
    duplicate_key: input.duplicateKey,
    attempt: 1,
    status: 'ready',
  };
}

function unwrapNullable(result: SupabaseResult): AnalysisIntake | null {
  if (result.error) throw new IntakeRepositoryError();
  return result.data === null ? null : parseIntakeRow(result.data);
}

function unwrapRequired(result: SupabaseResult): AnalysisIntake {
  if (result.error || result.data === null) throw new IntakeRepositoryError();
  return parseIntakeRow(result.data);
}

export function createSupabaseIntakeRepository(
  client: SupabaseIntakeClient,
): IntakeRepository & ResultTitleRepository {
  const findReusable: IntakeRepository['findReusable'] = async (
    userId,
    duplicateKey,
  ) => {
    const result = await client
      .from('analysis_intakes')
      .select('*')
      .eq('user_id', userId)
      .eq('duplicate_key', duplicateKey)
      .neq('status', 'failed')
      .order('attempt', { ascending: false })
      .limit(1)
      .maybeSingle();
    return unwrapNullable(result);
  };

  return {
    findReusable,

    async saveOwnedTitle(input): Promise<string | null> {
      const result = await client
        .from('analysis_intakes')
        .update({ title: input.title })
        .eq('id', input.analysisId)
        .eq('user_id', input.userId)
        .eq('updated_at', input.expectedUpdatedAt)
        .select('updated_at')
        .maybeSingle();
      const data = ensureUpdatedAt(result);
      return data;
    },

    async insertReady(input) {
      const result = await client
        .from('analysis_intakes')
        .insert(toInsertRow(input))
        .select('*')
        .single();

      if (result.error?.code === '23505') {
        const winner = await findReusable(input.userId, input.duplicateKey);
        if (winner) return { kind: 'recovered', intake: winner };
        throw new IntakeRepositoryError();
      }
      return { kind: 'inserted', intake: unwrapRequired(result) };
    },

    async findOwned(userId, id) {
      const result = await client
        .from('analysis_intakes')
        .select('*')
        .eq('user_id', userId)
        .eq('id', id)
        .limit(1)
        .maybeSingle();
      return unwrapNullable(result);
    },

    async createReanalysis(userId, sourceId, refreshedSnapshot) {
      if (refreshedSnapshot.userId !== userId) {
        throw new IntakeRepositoryError();
      }

      const result = await client.rpc('create_analysis_reattempt', {
        source_id: sourceId,
        refreshed_snapshot: toInsertRow(refreshedSnapshot),
      });
      return unwrapRequired(result);
    },
  };
}

function ensureUpdatedAt(result: SupabaseResult): string | null {
  if (result.error) throw new IntakeRepositoryError();
  if (result.data === null) return null;
  const parsed = z
    .object({ updated_at: z.iso.datetime({ offset: true }) })
    .safeParse(result.data);
  if (!parsed.success) throw new IntakeRepositoryError();
  return parsed.data.updated_at;
}
