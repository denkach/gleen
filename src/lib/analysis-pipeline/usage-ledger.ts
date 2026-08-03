import type { AnalysisRepository } from './repository';

export type UsageLedger = Readonly<{
  settle(jobId: string): Promise<void>;
  release(jobId: string): Promise<void>;
}>;

export function createUsageLedger(
  repository: Pick<AnalysisRepository, 'transitionReservation'>,
): UsageLedger {
  return {
    settle: (jobId) => repository.transitionReservation(jobId, 'settled'),
    release: (jobId) => repository.transitionReservation(jobId, 'released'),
  };
}
