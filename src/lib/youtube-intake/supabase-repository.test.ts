import { describe, expect, it, vi } from 'vitest';

import type { NewAnalysisIntake } from './repository';
import {
  createSupabaseIntakeRepository,
  IntakeRepositoryError,
} from './supabase-repository';

const userId = '11111111-1111-4111-8111-111111111111';
const intakeId = '22222222-2222-4222-8222-222222222222';
const duplicateKey = 'a'.repeat(64);

const input: NewAnalysisIntake = {
  userId,
  youtubeVideoId: 'dQw4w9WgXcQ',
  canonicalUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  title: 'Fresh title',
  channelTitle: 'Channel',
  durationSeconds: 213,
  thumbnailUrl: 'https://i.ytimg.com/example.jpg',
  transcriptLanguage: 'en',
  transcriptSegments: [{ text: 'Hello', offsetMs: 0, durationMs: 1200 }],
  configuration: {
    outputLocale: 'en',
    summaryPreset: 'balanced',
    flashcardPreset: null,
    artifacts: ['summary', 'transcript'],
    analysisContractVersion: 1,
  },
  duplicateKey,
};

const row = {
  id: intakeId,
  user_id: userId,
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
  duplicate_key: duplicateKey,
  attempt: 2,
  status: 'ready',
  reanalysis_of: null,
  created_at: '2026-07-12T12:00:00.000Z',
  updated_at: '2026-07-12T12:00:00.000Z',
};

function selectQuery(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  for (const method of ['select', 'eq', 'neq', 'order', 'limit'] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

function insertQuery(result: unknown) {
  const query = {
    insert: vi.fn(),
    select: vi.fn(),
    single: vi.fn().mockResolvedValue(result),
  };
  query.insert.mockReturnValue(query);
  query.select.mockReturnValue(query);
  return query;
}

function updateQuery(result: unknown) {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  for (const method of ['update', 'eq', 'select'] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

describe('Supabase intake repository', () => {
  it('updates a title only for the owner at the expected revision', async () => {
    const updatedAt = '2026-07-18T10:00:01.000Z';
    const query = updateQuery({
      data: { updated_at: updatedAt },
      error: null,
    });
    const client = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };

    await expect(
      createSupabaseIntakeRepository(client).saveOwnedTitle({
        userId,
        analysisId: intakeId,
        title: 'Edited title',
        expectedUpdatedAt: '2026-07-18T10:00:00.000Z',
      }),
    ).resolves.toBe(updatedAt);

    expect(query.update).toHaveBeenCalledWith({ title: 'Edited title' });
    expect(query.eq).toHaveBeenCalledWith('id', intakeId);
    expect(query.eq).toHaveBeenCalledWith('user_id', userId);
    expect(query.eq).toHaveBeenCalledWith(
      'updated_at',
      '2026-07-18T10:00:00.000Z',
    );
    expect(query.select).toHaveBeenCalledWith('updated_at');
  });

  it('returns null when an owned title compare-and-set finds no row', async () => {
    const query = updateQuery({ data: null, error: null });
    const client = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };

    await expect(
      createSupabaseIntakeRepository(client).saveOwnedTitle({
        userId,
        analysisId: intakeId,
        title: 'Edited title',
        expectedUpdatedAt: '2026-07-18T10:00:00.000Z',
      }),
    ).resolves.toBeNull();
  });
  it('filters reusable rows by owner and excludes failed attempts', async () => {
    const query = selectQuery({ data: row, error: null });
    const client = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };

    await expect(
      createSupabaseIntakeRepository(client).findReusable(userId, duplicateKey),
    ).resolves.toMatchObject({
      id: intakeId,
      userId,
      configuration: { artifacts: ['summary', 'transcript'] },
      transcriptSegments: [{ offsetMs: 0, durationMs: 1200 }],
    });

    expect(query.eq).toHaveBeenCalledWith('user_id', userId);
    expect(query.eq).toHaveBeenCalledWith('duplicate_key', duplicateKey);
    expect(query.neq).toHaveBeenCalledWith('status', 'failed');
    expect(query.order).toHaveBeenCalledWith('attempt', { ascending: false });
    expect(query.limit).toHaveBeenCalledWith(1);
  });

  it('always filters owned lookup by both user and id', async () => {
    const query = selectQuery({ data: row, error: null });
    const client = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };

    await createSupabaseIntakeRepository(client).findOwned(userId, intakeId);

    expect(query.eq).toHaveBeenCalledWith('user_id', userId);
    expect(query.eq).toHaveBeenCalledWith('id', intakeId);
  });

  it('classifies a successful insert as inserted', async () => {
    const insert = insertQuery({ data: row, error: null });
    const client = { from: vi.fn().mockReturnValue(insert), rpc: vi.fn() };

    await expect(
      createSupabaseIntakeRepository(client).insertReady(input),
    ).resolves.toEqual({
      kind: 'inserted',
      intake: expect.objectContaining({ id: intakeId }),
    });

    expect(client.from).toHaveBeenCalledTimes(1);
  });

  it('maps inserts to snake case and recovers a unique race by re-querying', async () => {
    const insert = insertQuery({ data: null, error: { code: '23505' } });
    const reusable = selectQuery({ data: row, error: null });
    const client = {
      from: vi.fn().mockReturnValueOnce(insert).mockReturnValueOnce(reusable),
      rpc: vi.fn(),
    };

    await expect(
      createSupabaseIntakeRepository(client).insertReady(input),
    ).resolves.toEqual({
      kind: 'recovered',
      intake: expect.objectContaining({ id: intakeId, attempt: 2 }),
    });

    expect(insert.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: userId,
        youtube_video_id: input.youtubeVideoId,
        selected_artifacts: ['summary', 'transcript'],
        transcript_segments: input.transcriptSegments,
        attempt: 1,
        status: 'ready',
      }),
    );
    expect(reusable.eq).toHaveBeenCalledWith('user_id', userId);
    expect(reusable.neq).toHaveBeenCalledWith('status', 'failed');
  });

  it('passes the fresh validated snapshot to the atomic re-analysis RPC', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: row, error: null });
    const client = { from: vi.fn(), rpc };

    await createSupabaseIntakeRepository(client).createReanalysis(
      userId,
      intakeId,
      input,
    );

    expect(rpc).toHaveBeenCalledWith('create_analysis_reattempt', {
      source_id: intakeId,
      refreshed_snapshot: expect.objectContaining({
        title: 'Fresh title',
        transcript_segments: input.transcriptSegments,
        duplicate_key: duplicateKey,
      }),
    });
  });

  it('rejects mismatched ownership before invoking re-analysis', async () => {
    const rpc = vi.fn();
    const client = { from: vi.fn(), rpc };

    await expect(
      createSupabaseIntakeRepository(client).createReanalysis(
        '33333333-3333-4333-8333-333333333333',
        intakeId,
        input,
      ),
    ).rejects.toMatchObject({ code: 'persistence_failure' });
    expect(rpc).not.toHaveBeenCalled();
  });

  it.each([
    ['invalid database rows', { data: { ...row, attempt: 0 }, error: null }],
    ['non-unique database failures', { data: null, error: { code: '42501' } }],
  ])('wraps %s in a safe typed error', async (_name, result) => {
    const query = selectQuery(result);
    const client = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };

    const promise = createSupabaseIntakeRepository(client).findOwned(
      userId,
      intakeId,
    );
    await expect(promise).rejects.toBeInstanceOf(IntakeRepositoryError);
    await expect(promise).rejects.toMatchObject({
      code: 'persistence_failure',
      message: 'Unable to persist analysis intake',
    });
  });
});
