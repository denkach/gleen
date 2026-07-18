import { describe, expect, test } from 'vitest';

import type { AnalysisSnapshot } from './domain';
import { createSessionRecoveryRepositories } from './session-recovery-repository';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

describe('createSessionRecoveryRepositories', () => {
  test('exposes saved recovery data only to its owner', async () => {
    const storage = window.sessionStorage;
    storage.clear();
    const repositories = createSessionRecoveryRepositories(storage);
    await repositories.saveActive({
      intake: { id: 'active', userId: 'fixture-user' } as AnalysisIntake,
      snapshot: {
        job: {
          analysisId: 'active',
          userId: 'fixture-user',
          status: 'running',
        },
      } as AnalysisSnapshot,
    });

    await expect(
      repositories.intakeRepository.findOwned('fixture-user', 'active'),
    ).resolves.toMatchObject({ id: 'active' });
    await expect(
      repositories.analysisRepository.findMostRecentOwnedActive('other-user'),
    ).resolves.toBeNull();
  });
});
