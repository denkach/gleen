import type { AnalysisSnapshot } from './domain';
import type {
  ActiveAnalysisIntakeRepository,
  ActiveAnalysisRepository,
} from './recovery';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

const storageKey = 'gleen:handoff-fixture:active-analysis';

type StoredActiveAnalysis = Readonly<{
  intake: AnalysisIntake;
  snapshot: AnalysisSnapshot;
}>;

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem'>;

export function createSessionRecoveryRepositories(storage: RecoveryStorage): {
  intakeRepository: ActiveAnalysisIntakeRepository;
  analysisRepository: ActiveAnalysisRepository;
  saveActive(active: StoredActiveAnalysis): Promise<void>;
} {
  function read(): StoredActiveAnalysis | null {
    const value = storage.getItem(storageKey);
    if (!value) return null;
    try {
      return JSON.parse(value) as StoredActiveAnalysis;
    } catch {
      return null;
    }
  }

  return {
    intakeRepository: {
      async findOwned(userId, analysisId) {
        const active = read();
        return active?.intake.userId === userId &&
          active.intake.id === analysisId
          ? active.intake
          : null;
      },
    },
    analysisRepository: {
      async findOwnedSnapshot(userId, analysisId) {
        const active = read();
        return active?.intake.userId === userId &&
          active.snapshot.job.userId === userId &&
          active.snapshot.job.analysisId === analysisId
          ? active.snapshot
          : null;
      },
      async findMostRecentOwnedActive(userId) {
        const active = read();
        return active?.intake.userId === userId &&
          active.snapshot.job.userId === userId
          ? active
          : null;
      },
    },
    async saveActive(active) {
      storage.setItem(storageKey, JSON.stringify(active));
    },
  };
}
