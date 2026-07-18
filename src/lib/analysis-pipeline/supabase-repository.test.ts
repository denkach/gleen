import { describe, expect, it, vi } from 'vitest';

import { createSupabaseAnalysisRepository } from './supabase-repository';

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

describe('Supabase analysis repository', () => {
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
