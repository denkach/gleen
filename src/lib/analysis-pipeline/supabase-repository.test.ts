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
