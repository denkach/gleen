import { describe, expect, it, vi } from 'vitest';

import type { AnalysisRepository } from './repository';
import { createUsageLedger } from './usage-ledger';

describe('UsageLedger', () => {
  it.each([
    ['settle', 'settled'],
    ['release', 'released'],
  ] as const)('persists %s as %s', async (method, status) => {
    const repository = {
      transitionReservation: vi.fn().mockResolvedValue(undefined),
    } as unknown as AnalysisRepository;
    const ledger = createUsageLedger(repository);

    await ledger[method]('job-id');

    expect(repository.transitionReservation).toHaveBeenCalledWith(
      'job-id',
      status,
    );
  });
});
