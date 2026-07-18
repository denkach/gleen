import { describe, expect, it, vi } from 'vitest';

import {
  createSupabaseAnalysisRepository,
  type ResultArtifactRepository,
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
    expect(active.order).toHaveBeenCalledWith('updated_at', {
      ascending: false,
    });
    expect(active.limit).toHaveBeenCalledWith(1);
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
    expect(history.order).toHaveBeenCalledWith('updated_at', {
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
