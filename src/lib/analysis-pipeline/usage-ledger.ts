import type { AnalysisRepository } from './repository';

export type UsageLedger = Readonly<{
  settle(jobId: string): Promise<void>;
  release(jobId: string): Promise<void>;
}>;

export function createNoopUsageLedger(
  repository: AnalysisRepository,
): UsageLedger {
  return {
    settle: (jobId) => repository.setReservationStatus(jobId, 'settled'),
    release: (jobId) => repository.setReservationStatus(jobId, 'released'),
  };
}
