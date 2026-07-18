'use server';

import { z } from 'zod';

import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from '@/lib/analysis-pipeline/supabase-repository';
import {
  createSupabaseIntakeRepository,
  type SupabaseIntakeClient,
} from '@/lib/youtube-intake/supabase-repository';

import {
  resultArtifactEditSchema,
  resultTitleEditSchema,
} from './edit-schemas';
import { flashcardRatingSchema } from './user-state';
import {
  createSupabaseResultUserStateRepository,
  type SupabaseResultUserStateClient,
} from './user-state-repository';

export type ResultSaveState =
  | Readonly<{ status: 'saved'; updatedAt: string }>
  | Readonly<{ status: 'conflict' | 'error' }>;

export type ResultMutationState =
  Readonly<{ status: 'saved' }> | Readonly<{ status: 'conflict' | 'error' }>;

const resultPreferenceSchema = z
  .object({
    analysisId: z.uuid(),
    favorite: z.boolean(),
  })
  .strict();

const playbackPositionSchema = z
  .object({
    analysisId: z.uuid(),
    positionMs: z.number().int().nonnegative().safe(),
  })
  .strict();

const flashcardReviewSchema = z
  .object({
    analysisId: z.uuid(),
    artifactRevision: z.iso.datetime({ offset: true }),
    cardIndex: z.number().int().nonnegative().safe(),
    rating: flashcardRatingSchema,
  })
  .strict();

export async function saveResultTitle(
  input: unknown,
): Promise<ResultSaveState> {
  const parsed = resultTitleEditSchema.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { status: 'error' };
    const updatedAt = await createSupabaseIntakeRepository(
      supabase as unknown as SupabaseIntakeClient,
    ).saveOwnedTitle({ userId: data.user.id, ...parsed.data });
    return updatedAt ? { status: 'saved', updatedAt } : { status: 'conflict' };
  } catch {
    return { status: 'error' };
  }
}

export async function saveResultArtifact(
  input: unknown,
): Promise<ResultSaveState> {
  const parsed = resultArtifactEditSchema.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { status: 'error' };
    const updatedAt = await createSupabaseAnalysisRepository(
      supabase as unknown as SupabaseAnalysisClient,
    ).saveOwnedArtifact({ userId: data.user.id, ...parsed.data });
    return updatedAt ? { status: 'saved', updatedAt } : { status: 'conflict' };
  } catch {
    return { status: 'error' };
  }
}

export async function saveResultPreference(
  input: unknown,
): Promise<ResultMutationState> {
  const parsed = resultPreferenceSchema.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { status: 'error' };
    await createSupabaseResultUserStateRepository(
      supabase as unknown as SupabaseResultUserStateClient,
    ).savePreference({ userId: data.user.id, ...parsed.data });
    return { status: 'saved' };
  } catch {
    return { status: 'error' };
  }
}

export async function savePlaybackPosition(
  input: unknown,
): Promise<ResultMutationState> {
  const parsed = playbackPositionSchema.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { status: 'error' };
    const intake = await createSupabaseIntakeRepository(
      supabase as unknown as SupabaseIntakeClient,
    ).findOwned(data.user.id, parsed.data.analysisId);
    if (!intake) return { status: 'conflict' };

    await createSupabaseResultUserStateRepository(
      supabase as unknown as SupabaseResultUserStateClient,
    ).savePlaybackPosition({
      userId: data.user.id,
      analysisId: parsed.data.analysisId,
      positionMs: Math.min(
        parsed.data.positionMs,
        intake.durationSeconds * 1000,
      ),
    });
    return { status: 'saved' };
  } catch {
    return { status: 'error' };
  }
}

export async function saveFlashcardReview(
  input: unknown,
): Promise<ResultMutationState> {
  const parsed = flashcardReviewSchema.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { status: 'error' };
    await createSupabaseResultUserStateRepository(
      supabase as unknown as SupabaseResultUserStateClient,
    ).saveFlashcardReview({ userId: data.user.id, ...parsed.data });
    return { status: 'saved' };
  } catch {
    return { status: 'error' };
  }
}
