import type { AnalysisSnapshot } from './domain';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

type Continuation = Readonly<{ rawUrl: string }>;
type ActiveAnalysis = Readonly<{
  intake: AnalysisIntake;
  snapshot: AnalysisSnapshot;
}>;

export type ActiveAnalysisIntakeRepository = Readonly<{
  findOwned(userId: string, analysisId: string): Promise<AnalysisIntake | null>;
}>;

export type ActiveAnalysisRepository = Readonly<{
  findOwnedSnapshot(
    userId: string,
    analysisId: string,
  ): Promise<AnalysisSnapshot | null>;
  findMostRecentOwnedActive(userId: string): Promise<ActiveAnalysis | null>;
}>;

const activeStatuses = new Set<AnalysisSnapshot['job']['status']>([
  'queued',
  'running',
]);

function isActiveStatus(status: AnalysisSnapshot['job']['status']): boolean {
  return activeStatuses.has(status);
}

export async function resolveOwnedActiveAnalysis(
  input: Readonly<{
    userId: string;
    requestedAnalysisId: string | null;
    continuation: Continuation | null;
    intakeRepository: ActiveAnalysisIntakeRepository;
    analysisRepository: ActiveAnalysisRepository;
  }>,
): Promise<
  Readonly<{
    initialAnalysis: ActiveAnalysis | null;
    continuation: Continuation | null;
  }>
> {
  if (input.requestedAnalysisId) {
    const intake = await input.intakeRepository.findOwned(
      input.userId,
      input.requestedAnalysisId,
    );
    const snapshot = intake
      ? await input.analysisRepository.findOwnedSnapshot(
          input.userId,
          intake.id,
        )
      : null;
    if (intake && snapshot && isActiveStatus(snapshot.job.status))
      return { initialAnalysis: { intake, snapshot }, continuation: null };
  }

  if (input.continuation)
    return { initialAnalysis: null, continuation: input.continuation };

  const recent = await input.analysisRepository.findMostRecentOwnedActive(
    input.userId,
  );
  return {
    initialAnalysis:
      recent && isActiveStatus(recent.snapshot.job.status) ? recent : null,
    continuation: null,
  };
}

const statusLabels = {
  queued: 'Processing',
  running: 'Processing',
  partial: 'Partial',
  complete: 'Complete',
  failed: 'Failed',
} as const;

export function historyEntryPresentation(
  row: Readonly<{
    id: string;
    status: AnalysisSnapshot['job']['status'];
  }>,
  paths: Readonly<{
    app: string;
    result: string;
  }> = { app: '/app', result: '/app/video' },
): Readonly<{ href: string; statusLabel: string }> {
  const id = encodeURIComponent(row.id);
  return {
    href: isActiveStatus(row.status)
      ? `${paths.app}?analysis=${id}`
      : `${paths.result}/${id}`,
    statusLabel: statusLabels[row.status],
  };
}
