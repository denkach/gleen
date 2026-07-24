import { describe, expect, test, vi } from 'vitest';

import type { AnalysisRepository } from './repository';
import { retryAnalysisWithDependencies } from './retry-actions';
import type { UsageLedger } from './usage-ledger';

const analysisId = '550e8400-e29b-41d4-a716-446655440000';

function form(value: string = analysisId) {
  const data = new FormData();
  data.set('analysisId', value);
  return data;
}

describe('retry analysis action', () => {
  test('authenticates, prepares selective retry, and starts its new attempt', async () => {
    const prepareRetry = vi
      .fn()
      .mockResolvedValue({ job: { id: 'job-2', attempt: 2 } });
    const start = vi.fn().mockResolvedValue({ runId: 'run-2' });
    const repository = { prepareRetry } as unknown as AnalysisRepository;
    const ledger = {} as UsageLedger;

    await expect(
      retryAnalysisWithDependencies(form(), {
        currentUserId: async () => 'user-1',
        repository,
        ledger,
        start,
      }),
    ).resolves.toEqual({ ok: true, attempt: 2 });

    expect(prepareRetry).toHaveBeenCalledWith('user-1', analysisId);
    expect(start).toHaveBeenCalledWith('job-2', repository, ledger);
  });

  test('does not access persistence for invalid or unauthenticated requests', async () => {
    const prepareRetry = vi.fn();
    const dependencies = {
      currentUserId: vi.fn(async () => null),
      repository: { prepareRetry } as unknown as AnalysisRepository,
      ledger: {} as UsageLedger,
      start: vi.fn(),
    };
    await expect(
      retryAnalysisWithDependencies(form('not-a-uuid'), dependencies),
    ).resolves.toEqual({ ok: false, error: 'invalid_request' });
    await expect(
      retryAnalysisWithDependencies(form(), dependencies),
    ).resolves.toEqual({ ok: false, error: 'unauthorized' });
    expect(prepareRetry).not.toHaveBeenCalled();
  });

  test('returns controlled copy instead of exposing persistence errors', async () => {
    const repository = {
      prepareRetry: vi.fn().mockRejectedValue(new Error('database details')),
    } as unknown as AnalysisRepository;
    await expect(
      retryAnalysisWithDependencies(form(), {
        currentUserId: async () => 'user-1',
        repository,
        ledger: {} as UsageLedger,
        start: vi.fn(),
      }),
    ).resolves.toEqual({ ok: false, error: 'retry_failed' });
  });
});
