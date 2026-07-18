import { z } from 'zod';

import {
  createSupabaseIntakeRepository,
  type SupabaseIntakeClient,
} from '@/lib/youtube-intake/supabase-repository';

import {
  createSupabaseResultUserStateRepository,
  type SupabaseResultUserStateClient,
} from './user-state-repository';

export const playbackPositionSchema = z
  .object({
    analysisId: z.uuid(),
    positionMs: z.number().int().nonnegative().safe(),
    revision: z.number().int().nonnegative().safe(),
  })
  .strict();

export type PlaybackPositionInput = z.infer<typeof playbackPositionSchema>;

export type PlaybackPersistenceState =
  Readonly<{ status: 'saved' }> | Readonly<{ status: 'conflict' | 'error' }>;

type PlaybackPersistenceClient = SupabaseIntakeClient &
  SupabaseResultUserStateClient;

export async function persistOwnedPlaybackPosition(
  client: PlaybackPersistenceClient,
  userId: string,
  input: PlaybackPositionInput,
): Promise<PlaybackPersistenceState> {
  try {
    const intake = await createSupabaseIntakeRepository(client).findOwned(
      userId,
      input.analysisId,
    );
    if (!intake) return { status: 'conflict' };

    const applied = await createSupabaseResultUserStateRepository(
      client,
    ).savePlaybackPosition({
      analysisId: input.analysisId,
      positionMs: Math.min(input.positionMs, intake.durationSeconds * 1000),
      revision: input.revision,
    });
    return applied ? { status: 'saved' } : { status: 'conflict' };
  } catch {
    return { status: 'error' };
  }
}
