import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseAnalysisRepository,
  type ResultArtifactRepository,
  type SupabaseAnalysisClient,
} from './supabase-repository';

function queryReturning(result: unknown) {
  const query = {
    select: vi.fn(),
    update: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
  };
  for (const method of ['select', 'update', 'eq', 'neq'] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

function chainReturning(result: unknown) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    in: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  for (const method of ['select', 'eq', 'in', 'order', 'limit'] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

describe('Supabase analysis repository', () => {
  it('selects the newest owned queued or running analysis', async () => {
    const active = chainReturning({ data: null, error: null });
    const client = { from: vi.fn().mockReturnValue(active), rpc: vi.fn() };

    await expect(
      createSupabaseAnalysisRepository(client).findMostRecentOwnedActive(
        'user-id',
      ),
    ).resolves.toBeNull();

    expect(client.from).toHaveBeenCalledWith('analysis_jobs');
    expect(active.eq).toHaveBeenCalledWith('user_id', 'user-id');
    expect(active.eq).toHaveBeenCalledWith(
      'analysis_intakes.user_id',
      'user-id',
    );
    expect(active.in).toHaveBeenCalledWith('status', ['queued', 'running']);
    expect(active.order).toHaveBeenNthCalledWith(1, 'updated_at', {
      ascending: false,
    });
    expect(active.order).toHaveBeenNthCalledWith(2, 'analysis_id', {
      ascending: false,
    });
    expect(active.limit).toHaveBeenCalledWith(1);
  });

  it('ignores an active candidate that hydrates as terminal', async () => {
    const analysisId = '22222222-2222-4222-8222-222222222222';
    const userId = '11111111-1111-4111-8111-111111111111';
    const active = chainReturning({
      data: {
        analysis_id: analysisId,
        analysis_intakes: {
          id: analysisId,
          user_id: userId,
          youtube_video_id: 'dQw4w9WgXcQ',
          canonical_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          title: 'Terminal race',
          channel_title: 'Channel',
          duration_seconds: 213,
          thumbnail_url: 'https://i.ytimg.com/example.jpg',
          transcript_language: 'en',
          transcript_segments: [],
          output_locale: 'en',
          summary_preset: 'balanced',
          flashcard_preset: null,
          selected_artifacts: ['summary'],
          analysis_contract_version: 1,
          duplicate_key: 'a'.repeat(64),
          attempt: 1,
          status: 'ready',
          reanalysis_of: null,
          created_at: '2026-07-18T10:00:00.000Z',
          updated_at: '2026-07-18T10:00:00.000Z',
        },
      },
      error: null,
    });
    const job = chainReturning({
      data: {
        id: 'job-1',
        analysis_id: analysisId,
        user_id: userId,
        workflow_run_id: null,
        status: 'complete',
        stage: 'complete',
        attempt: 1,
        revision: 2,
        error_code: null,
        started_at: '2026-07-18T10:00:00.000Z',
        completed_at: '2026-07-18T10:01:00.000Z',
        created_at: '2026-07-18T10:00:00.000Z',
        updated_at: '2026-07-18T10:01:00.000Z',
      },
      error: null,
    });
    const events = chainReturning({ data: [], error: null });
    const artifacts = chainReturning({ data: [], error: null });
    const reservation = chainReturning({
      data: {
        id: 'reservation-1',
        job_id: 'job-1',
        user_id: userId,
        status: 'settled',
        updated_at: '2026-07-18T10:01:00.000Z',
      },
      error: null,
    });
    const client = {
      from: vi.fn((table: string) => {
        if (table === 'analysis_jobs')
          return client.from.mock.calls.length === 1 ? active : job;
        if (table === 'analysis_job_events') return events;
        if (table === 'analysis_artifacts') return artifacts;
        return reservation;
      }),
      rpc: vi.fn(),
    };

    await expect(
      createSupabaseAnalysisRepository(
        client as unknown as SupabaseAnalysisClient,
      ).findMostRecentOwnedActive(userId),
    ).resolves.toBeNull();
  });

  it('lists only owned history newest first and caps the request at 50', async () => {
    const history = chainReturning({
      data: [
        {
          analysis_id: 'analysis-id',
          status: 'complete',
          updated_at: '2026-07-18T10:00:00.000Z',
          analysis_intakes: { title: 'Owned analysis' },
        },
      ],
      error: null,
    });
    const client = { from: vi.fn().mockReturnValue(history), rpc: vi.fn() };

    await expect(
      createSupabaseAnalysisRepository(client).listOwnedHistory('user-id', 75),
    ).resolves.toEqual([
      {
        id: 'analysis-id',
        title: 'Owned analysis',
        status: 'complete',
        updatedAt: '2026-07-18T10:00:00.000Z',
      },
    ]);

    expect(history.eq).toHaveBeenCalledWith('user_id', 'user-id');
    expect(history.eq).toHaveBeenCalledWith(
      'analysis_intakes.user_id',
      'user-id',
    );
    expect(history.order).toHaveBeenNthCalledWith(1, 'updated_at', {
      ascending: false,
    });
    expect(history.order).toHaveBeenNthCalledWith(2, 'analysis_id', {
      ascending: false,
    });
    expect(history.limit).toHaveBeenCalledWith(50);
  });
  it('exposes a kind-discriminated artifact save contract', () => {
    type SaveInput = Parameters<
      ResultArtifactRepository['saveOwnedArtifact']
    >[0];
    const identity = {
      userId: 'user-id',
      analysisId: 'analysis-id',
      expectedUpdatedAt: '2026-07-18T10:00:00.000Z',
    };
    const valid: SaveInput = {
      ...identity,
      kind: 'summary',
      content: {
        schemaVersion: 1,
        title: 'T',
        overview: 'O',
        keyPoints: ['P'],
      },
    };
    expect(valid.kind).toBe('summary');

    const mismatched: SaveInput = {
      ...identity,
      kind: 'summary',
      // @ts-expect-error flashcard content cannot be saved under the summary kind
      content: { schemaVersion: 1, cards: [{ front: 'Q', back: 'A' }] },
    };
    expect(mismatched.kind).toBe('summary');
  });
  it('updates ready artifact content only for the owner and expected revision', async () => {
    const updatedAt = '2026-07-18T10:00:01.000Z';
    const query = queryReturning({
      data: { updated_at: updatedAt },
      error: null,
    });
    const client = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };
    const repository = createSupabaseAnalysisRepository(client);
    const content = {
      schemaVersion: 1 as const,
      cards: [{ front: 'Question', back: 'Answer' }],
    };

    await expect(
      repository.saveOwnedArtifact({
        userId: 'user-id',
        analysisId: 'analysis-id',
        kind: 'flashcards',
        content,
        expectedUpdatedAt: '2026-07-18T10:00:00.000Z',
      }),
    ).resolves.toBe(updatedAt);

    expect(query.update).toHaveBeenCalledWith({ content });
    expect(query.eq).toHaveBeenCalledWith('analysis_id', 'analysis-id');
    expect(query.eq).toHaveBeenCalledWith('user_id', 'user-id');
    expect(query.eq).toHaveBeenCalledWith('kind', 'flashcards');
    expect(query.eq).toHaveBeenCalledWith('status', 'ready');
    expect(query.eq).toHaveBeenCalledWith(
      'updated_at',
      '2026-07-18T10:00:00.000Z',
    );
    expect(query.select).toHaveBeenCalledWith('updated_at');
  });

  it('returns null for a stale or cross-user artifact update', async () => {
    const query = queryReturning({ data: null, error: null });
    const client = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };

    await expect(
      createSupabaseAnalysisRepository(client).saveOwnedArtifact({
        userId: 'other-user',
        analysisId: 'analysis-id',
        kind: 'summary',
        content: {
          schemaVersion: 1,
          title: 'T',
          overview: 'O',
          keyPoints: ['P'],
        },
        expectedUpdatedAt: '2026-07-18T10:00:00.000Z',
      }),
    ).resolves.toBeNull();
  });
  it('does not replace an already ready artifact', async () => {
    const query = queryReturning({
      data: {
        status: 'ready',
      },
      error: null,
    });
    const client = { from: vi.fn().mockReturnValue(query), rpc: vi.fn() };
    const repository = createSupabaseAnalysisRepository(client);

    await repository.saveArtifactReady({
      jobId: 'job-id',
      analysisId: 'analysis-id',
      kind: 'summary',
      schemaVersion: 1,
      content: { schemaVersion: 1, overview: 'Ready' },
    });

    expect(query.update).not.toHaveBeenCalled();
    expect(query.eq).toHaveBeenCalledWith('analysis_id', 'analysis-id');
    expect(query.eq).toHaveBeenCalledWith('kind', 'summary');
  });

  it('writes events idempotently using their job-scoped key', async () => {
    const upsert = vi.fn().mockResolvedValue({ data: null, error: null });
    const client = {
      from: vi.fn().mockReturnValue({ upsert }),
      rpc: vi.fn(),
    };
    const repository = createSupabaseAnalysisRepository(client);

    await repository.recordEvent({
      jobId: 'job-id',
      userId: 'user-id',
      idempotencyKey: 'attempt-1:validating:started',
      stage: 'validating',
      status: 'started',
      errorCode: null,
      metadata: {},
    });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        job_id: 'job-id',
        idempotency_key: 'attempt-1:validating:started',
      }),
      {
        onConflict: 'job_id,idempotency_key',
        ignoreDuplicates: true,
      },
    );
  });
});
