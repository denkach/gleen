import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseResultUserStateRepository,
  ResultUserStateRepositoryError,
} from './user-state-repository';

const userId = '11111111-1111-4111-8111-111111111111';
const analysisId = '22222222-2222-4222-8222-222222222222';
const artifactRevision = '2026-07-18T10:00:00.000Z';

function query(result: unknown) {
  const value = {
    select: vi.fn(),
    upsert: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    then: vi.fn(
      (
        onfulfilled?: (settled: unknown) => unknown,
        onrejected?: (reason: unknown) => unknown,
      ) => Promise.resolve(result).then(onfulfilled, onrejected),
    ),
  };
  for (const method of ['select', 'upsert', 'eq', 'order'] as const) {
    value[method].mockReturnValue(value);
  }
  return value;
}

describe('Supabase result user-state repository', () => {
  it('returns safe defaults when no owner state exists', async () => {
    const stateQuery = query({ data: null, error: null });
    const reviewQuery = query({ data: [], error: null });
    const client = {
      from: vi
        .fn()
        .mockReturnValueOnce(stateQuery)
        .mockReturnValueOnce(reviewQuery),
      rpc: vi.fn(),
    };

    await expect(
      createSupabaseResultUserStateRepository(client).findOwned(
        userId,
        analysisId,
      ),
    ).resolves.toEqual({
      favorite: false,
      playbackPositionMs: 0,
      lastArtifact: 'overview',
      lastStudyAction: null,
      reviews: [],
    });

    expect(client.from).toHaveBeenNthCalledWith(1, 'analysis_result_states');
    expect(client.from).toHaveBeenNthCalledWith(
      2,
      'analysis_flashcard_reviews',
    );
    for (const ownedQuery of [stateQuery, reviewQuery]) {
      expect(ownedQuery.eq).toHaveBeenCalledWith('analysis_id', analysisId);
      expect(ownedQuery.eq).toHaveBeenCalledWith('user_id', userId);
    }
  });

  it('strictly maps persisted owner state and reviews', async () => {
    const stateQuery = query({
      data: {
        favorite: true,
        playback_position_ms: 12_345,
        last_artifact: 'flashcards',
        last_study_action: 'flashcards_reviewed',
      },
      error: null,
    });
    const reviewQuery = query({
      data: [
        {
          artifact_revision: artifactRevision,
          card_index: 3,
          rating: 'got_it',
        },
      ],
      error: null,
    });
    const client = {
      from: vi
        .fn()
        .mockReturnValueOnce(stateQuery)
        .mockReturnValueOnce(reviewQuery),
      rpc: vi.fn(),
    };

    await expect(
      createSupabaseResultUserStateRepository(client).findOwned(
        userId,
        analysisId,
      ),
    ).resolves.toEqual({
      favorite: true,
      playbackPositionMs: 12_345,
      lastArtifact: 'flashcards',
      lastStudyAction: 'flashcards_reviewed',
      reviews: [{ artifactRevision, cardIndex: 3, rating: 'got_it' }],
    });
  });

  it.each([
    ['a database error', { data: null, error: { code: '42501' } }],
    [
      'an invalid row',
      {
        data: {
          favorite: false,
          playback_position_ms: -1,
          last_artifact: 'overview',
          last_study_action: null,
        },
        error: null,
      },
    ],
  ])('maps %s to a safe repository error', async (_name, stateResult) => {
    const client = {
      from: vi
        .fn()
        .mockReturnValueOnce(query(stateResult))
        .mockReturnValueOnce(query({ data: [], error: null })),
      rpc: vi.fn(),
    };

    const promise = createSupabaseResultUserStateRepository(client).findOwned(
      userId,
      analysisId,
    );
    await expect(promise).rejects.toBeInstanceOf(
      ResultUserStateRepositoryError,
    );
    await expect(promise).rejects.toMatchObject({
      code: 'persistence_failure',
      message: 'Unable to persist result user state',
    });
  });

  it('upserts an explicit favorite through the owner composite key', async () => {
    const mutation = query({ data: null, error: null });
    const client = {
      from: vi.fn().mockReturnValue(mutation),
      rpc: vi.fn(),
    };
    const repository = createSupabaseResultUserStateRepository(client);

    await expect(
      repository.savePreference({ userId, analysisId, favorite: true }),
    ).resolves.toBeUndefined();

    expect(mutation.upsert).toHaveBeenCalledWith(
      { analysis_id: analysisId, user_id: userId, favorite: true },
      { onConflict: 'analysis_id,user_id' },
    );
    expect(mutation.eq).toHaveBeenCalledWith('analysis_id', analysisId);
    expect(mutation.eq).toHaveBeenCalledWith('user_id', userId);
  });

  it('persists playback through the strictly ordered owner RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const repository = createSupabaseResultUserStateRepository({
      from: vi.fn(),
      rpc,
    });

    await expect(
      repository.savePlaybackPosition({
        analysisId,
        positionMs: 213_000,
        revision: 1_752_844_800_001,
      }),
    ).resolves.toBe(true);

    expect(rpc).toHaveBeenCalledExactlyOnceWith(
      'save_owned_playback_position',
      {
        p_analysis_id: analysisId,
        p_position_ms: 213_000,
        p_revision: 1_752_844_800_001,
      },
    );
  });

  it('cannot regress a newer playback revision with an older RPC request', async () => {
    let stored = { positionMs: 0, revision: 0 };
    const rpc = vi.fn(
      async (
        _functionName: string,
        input: {
          p_position_ms: number;
          p_revision: number;
        },
      ) => {
        const applied = input.p_revision > stored.revision;
        if (applied) {
          stored = {
            positionMs: input.p_position_ms,
            revision: input.p_revision,
          };
        }
        return { data: applied, error: null };
      },
    );
    const repository = createSupabaseResultUserStateRepository({
      from: vi.fn(),
      rpc,
    });

    await repository.savePlaybackPosition({
      analysisId,
      positionMs: 20_000,
      revision: 2,
    });
    await expect(
      repository.savePlaybackPosition({
        analysisId,
        positionMs: 10_000,
        revision: 1,
      }),
    ).resolves.toBe(false);

    expect(stored).toEqual({ positionMs: 20_000, revision: 2 });
  });

  it('uses the full review composite key and owner filters', async () => {
    const mutation = query({ data: null, error: null });
    const repository = createSupabaseResultUserStateRepository({
      from: vi.fn().mockReturnValue(mutation),
      rpc: vi.fn(),
    });

    await repository.saveFlashcardReview({
      userId,
      analysisId,
      artifactRevision,
      cardIndex: 3,
      rating: 'hard',
    });

    expect(mutation.upsert).toHaveBeenCalledWith(
      {
        analysis_id: analysisId,
        user_id: userId,
        artifact_revision: artifactRevision,
        card_index: 3,
        rating: 'hard',
      },
      {
        onConflict: 'analysis_id,user_id,artifact_revision,card_index',
      },
    );
    expect(mutation.eq).toHaveBeenCalledWith('analysis_id', analysisId);
    expect(mutation.eq).toHaveBeenCalledWith('user_id', userId);
  });

  it('maps mutation failures to a safe repository error', async () => {
    const mutation = query({ data: null, error: { code: '42501' } });
    const repository = createSupabaseResultUserStateRepository({
      from: vi.fn().mockReturnValue(mutation),
      rpc: vi.fn(),
    });

    await expect(
      repository.savePreference({ userId, analysisId, favorite: false }),
    ).rejects.toBeInstanceOf(ResultUserStateRepositoryError);
  });
});
