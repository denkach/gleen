'use server';

import { z } from 'zod';

import { validatePublicEnv } from '@/env';
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
import {
  persistOwnedPlaybackPosition,
  playbackPositionSchema,
} from './playback-persistence-server';
import { flashcardRatingSchema } from './user-state';
import {
  createSupabaseResultUserStateRepository,
  type SupabaseResultUserStateClient,
} from './user-state-repository';
import {
  createSupabaseResultShareRepository,
  type SupabaseResultShareClient,
} from './share-repository';

export type ResultSaveState =
  | Readonly<{ status: 'saved'; updatedAt: string }>
  | Readonly<{ status: 'conflict' | 'error' }>;

export type ResultMutationState =
  Readonly<{ status: 'saved' }> | Readonly<{ status: 'conflict' | 'error' }>;

export type ResultShareState =
  Readonly<{ status: 'created'; url: string }> | Readonly<{ status: 'error' }>;

const resultPreferenceSchema = z
  .object({
    analysisId: z.uuid(),
    favorite: z.boolean(),
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

const resultShareSchema = z.object({ analysisId: z.uuid() }).strict();

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
    return await persistOwnedPlaybackPosition(
      supabase as unknown as SupabaseIntakeClient &
        SupabaseResultUserStateClient,
      data.user.id,
      parsed.data,
    );
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

export async function createResultShare(
  input: unknown,
): Promise<ResultShareState> {
  const parsed = resultShareSchema.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { status: 'error' };
    const token = await createSupabaseResultShareRepository(
      supabase as unknown as SupabaseResultShareClient,
    ).createOwned({ userId: data.user.id, analysisId: parsed.data.analysisId });
    if (!token) return { status: 'error' };
    const env = validatePublicEnv(process.env);
    return {
      status: 'created',
      url: new URL(`/share/${token}`, env.NEXT_PUBLIC_APP_URL).toString(),
    };
  } catch {
    return { status: 'error' };
  }
}

export async function revokeResultShare(
  input: unknown,
): Promise<ResultMutationState> {
  const parsed = resultShareSchema.safeParse(input);
  if (!parsed.success) return { status: 'error' };

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase.auth.getUser();
    if (!data.user) return { status: 'error' };
    const revoked = await createSupabaseResultShareRepository(
      supabase as unknown as SupabaseResultShareClient,
    ).revokeOwned({ userId: data.user.id, analysisId: parsed.data.analysisId });
    return revoked ? { status: 'saved' } : { status: 'error' };
  } catch {
    return { status: 'error' };
  }
}
