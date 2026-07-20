import { z } from 'zod';

import {
  defaultResultUserState,
  flashcardRatingSchema,
  lastStudyActionSchema,
  resultArtifactSchema,
  type FlashcardRating,
  type ResultUserState,
} from './user-state';

type SupabaseError = Readonly<{ code?: string; message?: string }>;
type SupabaseResult = Readonly<{
  data: unknown;
  error: SupabaseError | null;
}>;

type Query = Readonly<{
  select(columns?: string): Query;
  upsert(
    values: Record<string, unknown>,
    options: Readonly<{ onConflict: string }>,
  ): Query;
  eq(column: string, value: unknown): Query;
  order(column: string, options: Readonly<{ ascending: boolean }>): Query;
  maybeSingle(): PromiseLike<SupabaseResult>;
  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?:
      ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}>;

export type SupabaseResultUserStateClient = Readonly<{
  from(table: 'analysis_result_states' | 'analysis_flashcard_reviews'): Query;
  rpc(
    functionName: 'save_owned_playback_position',
    input: Readonly<{
      p_analysis_id: string;
      p_position_ms: number;
      p_revision: number;
    }>,
  ): PromiseLike<SupabaseResult>;
}>;

type OwnerKey = Readonly<{ userId: string; analysisId: string }>;

export type ResultUserStateRepository = Readonly<{
  findOwned(userId: string, analysisId: string): Promise<ResultUserState>;
  savePreference(
    input: OwnerKey & Readonly<{ favorite: boolean }>,
  ): Promise<void>;
  savePlaybackPosition(
    input: Readonly<{
      analysisId: string;
      positionMs: number;
      revision: number;
    }>,
  ): Promise<boolean>;
  saveFlashcardReview(
    input: OwnerKey &
      Readonly<{
        artifactRevision: string;
        cardIndex: number;
        rating: FlashcardRating;
      }>,
  ): Promise<void>;
}>;

const stateRowSchema = z
  .object({
    favorite: z.boolean(),
    playback_position_ms: z.number().int().nonnegative().safe(),
    last_artifact: resultArtifactSchema,
    last_study_action: lastStudyActionSchema.nullable(),
  })
  .strict();

const reviewRowSchema = z
  .object({
    artifact_revision: z.iso.datetime({ offset: true }),
    card_index: z.number().int().nonnegative().safe(),
    rating: flashcardRatingSchema,
  })
  .strict();

export class ResultUserStateRepositoryError extends Error {
  readonly code = 'persistence_failure' as const;

  constructor() {
    super('Unable to persist result user state');
    this.name = 'ResultUserStateRepositoryError';
  }
}

function repositoryError(error: unknown): ResultUserStateRepositoryError {
  return error instanceof ResultUserStateRepositoryError
    ? error
    : new ResultUserStateRepositoryError();
}

function ensureSuccess(result: SupabaseResult): unknown {
  if (result.error) throw new ResultUserStateRepositoryError();
  return result.data;
}

function parseState(input: unknown): Omit<ResultUserState, 'reviews'> {
  if (input === null) {
    return {
      favorite: defaultResultUserState.favorite,
      playbackPositionMs: defaultResultUserState.playbackPositionMs,
      lastArtifact: defaultResultUserState.lastArtifact,
      lastStudyAction: defaultResultUserState.lastStudyAction,
    };
  }
  const parsed = stateRowSchema.safeParse(input);
  if (!parsed.success) throw new ResultUserStateRepositoryError();
  return {
    favorite: parsed.data.favorite,
    playbackPositionMs: parsed.data.playback_position_ms,
    lastArtifact: parsed.data.last_artifact,
    lastStudyAction: parsed.data.last_study_action,
  };
}

function parseReviews(input: unknown): ResultUserState['reviews'] {
  if (input === null) return [];
  const parsed = z.array(reviewRowSchema).safeParse(input);
  if (!parsed.success) throw new ResultUserStateRepositoryError();
  return parsed.data.map((review) => ({
    artifactRevision: review.artifact_revision,
    cardIndex: review.card_index,
    rating: review.rating,
  }));
}

async function ensureMutation(query: Query): Promise<void> {
  ensureSuccess(await query);
}

export function createSupabaseResultUserStateRepository(
  client: SupabaseResultUserStateClient,
): ResultUserStateRepository {
  return {
    async findOwned(userId, analysisId) {
      try {
        const [stateResult, reviewsResult] = await Promise.all([
          client
            .from('analysis_result_states')
            .select(
              'favorite,playback_position_ms,last_artifact,last_study_action',
            )
            .eq('analysis_id', analysisId)
            .eq('user_id', userId)
            .maybeSingle(),
          client
            .from('analysis_flashcard_reviews')
            .select('artifact_revision,card_index,rating')
            .eq('analysis_id', analysisId)
            .eq('user_id', userId)
            .order('artifact_revision', { ascending: true })
            .order('card_index', { ascending: true }),
        ]);

        return {
          ...parseState(ensureSuccess(stateResult)),
          reviews: parseReviews(ensureSuccess(reviewsResult)),
        };
      } catch (error) {
        throw repositoryError(error);
      }
    },

    async savePreference(input) {
      try {
        await ensureMutation(
          client
            .from('analysis_result_states')
            .upsert(
              {
                analysis_id: input.analysisId,
                user_id: input.userId,
                favorite: input.favorite,
              },
              { onConflict: 'analysis_id,user_id' },
            )
            .eq('analysis_id', input.analysisId)
            .eq('user_id', input.userId),
        );
      } catch (error) {
        throw repositoryError(error);
      }
    },

    async savePlaybackPosition(input) {
      try {
        const data = ensureSuccess(
          await client.rpc('save_owned_playback_position', {
            p_analysis_id: input.analysisId,
            p_position_ms: input.positionMs,
            p_revision: input.revision,
          }),
        );
        const parsed = z.boolean().safeParse(data);
        if (!parsed.success) throw new ResultUserStateRepositoryError();
        return parsed.data;
      } catch (error) {
        throw repositoryError(error);
      }
    },

    async saveFlashcardReview(input) {
      try {
        await ensureMutation(
          client
            .from('analysis_flashcard_reviews')
            .upsert(
              {
                analysis_id: input.analysisId,
                user_id: input.userId,
                artifact_revision: input.artifactRevision,
                card_index: input.cardIndex,
                rating: input.rating,
              },
              {
                onConflict: 'analysis_id,user_id,artifact_revision,card_index',
              },
            )
            .eq('analysis_id', input.analysisId)
            .eq('user_id', input.userId),
        );
      } catch (error) {
        throw repositoryError(error);
      }
    },
  };
}
