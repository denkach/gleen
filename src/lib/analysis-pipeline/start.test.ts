import { describe, expect, it, vi } from 'vitest';

import type { AnalysisRepository } from './repository';
import type { UsageLedger } from './usage-ledger';
import { startAnalysisWithDependencies } from './start';

describe('analysis workflow starter', () => {
  it('attaches the durable run id to the job', async () => {
    const repository = {
      attachWorkflowRun: vi.fn(async () => undefined),
      setJobState: vi.fn(async () => undefined),
    } as unknown as AnalysisRepository;
    const ledger = {
      settle: vi.fn(),
      release: vi.fn(async () => undefined),
    } as UsageLedger;

    await expect(
      startAnalysisWithDependencies('job-id', {
        repository,
        ledger,
        startRun: vi.fn(async () => ({ runId: 'run-id' })),
      }),
    ).resolves.toEqual({ runId: 'run-id' });
    expect(repository.attachWorkflowRun).toHaveBeenCalledWith(
      'job-id',
      'run-id',
    );
  });

  it('persists a safe failure and releases reservation when start fails', async () => {
    const repository = {
      attachWorkflowRun: vi.fn(),
      setJobState: vi.fn(async () => undefined),
    } as unknown as AnalysisRepository;
    const ledger = {
      settle: vi.fn(),
      release: vi.fn(async () => undefined),
    } as UsageLedger;

    await expect(
      startAnalysisWithDependencies('job-id', {
        repository,
        ledger,
        startRun: vi.fn(async () => {
          throw new Error('raw infrastructure error');
        }),
      }),
    ).rejects.toThrow('Unable to start analysis workflow');
    expect(repository.setJobState).toHaveBeenCalledWith('job-id', {
      status: 'failed',
      stage: 'validating',
      errorCode: 'workflow_start_failed',
      completedAt: expect.any(String),
    });
    expect(ledger.release).toHaveBeenCalledWith('job-id');
  });
});
