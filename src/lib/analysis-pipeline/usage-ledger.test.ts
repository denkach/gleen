import { describe, expect, it, vi } from 'vitest';

import type { AnalysisRepository } from './repository';
import { createNoopUsageLedger } from './usage-ledger';

describe('NoopUsageLedger', () => {
  it.each([
    ['settle', 'settled'],
    ['release', 'released'],
  ] as const)('persists %s as %s', async (method, status) => {
    const repository = {
      setReservationStatus: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalysisRepository;
    const ledger = createNoopUsageLedger(repository);

    await ledger[method]('job-id');

    expect(repository.setReservationStatus).toHaveBeenCalledWith(
      'job-id',
      status,
    );
  });
});
