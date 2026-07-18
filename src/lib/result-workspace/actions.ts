'use server';

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

export type ResultSaveState =
  | Readonly<{ status: 'saved'; updatedAt: string }>
  | Readonly<{ status: 'conflict' | 'error' }>;

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
