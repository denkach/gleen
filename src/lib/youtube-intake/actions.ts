'use server';

import { validateProviderEnv } from '@/env';
import { startAnalysis } from '@/lib/analysis-pipeline/start';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from '@/lib/analysis-pipeline/supabase-repository';
import { createNoopUsageLedger } from '@/lib/analysis-pipeline/usage-ledger';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import type { IntakeActionState } from './action-state';
import { createIntakeActions } from './action-factory';
import { createIntakeService } from './service';
import { createSupabaseIntakeRepository } from './supabase-repository';
import type { SupabaseIntakeClient } from './supabase-repository';
import { createSupadataProvider } from './supadata-provider';
import { createYouTubeProvider } from './youtube-provider';

export type { IntakeActionState } from './action-state';

async function authenticatedService() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const environment = validateProviderEnv(process.env);
  const analysisRepository = createSupabaseAnalysisRepository(
    supabase as unknown as SupabaseAnalysisClient,
  );
  const service = createIntakeService({
    metadata: createYouTubeProvider(environment.YOUTUBE_DATA_API_KEY),
    transcript: createSupadataProvider(environment.SUPADATA_API_KEY),
    repository: createSupabaseIntakeRepository(
      supabase as unknown as SupabaseIntakeClient,
    ),
    pipeline: {
      async createAndStart(userId, analysisId) {
        const snapshot = await analysisRepository.createForAnalysis(
          userId,
          analysisId,
        );
        await startAnalysis(
          snapshot.job.id,
          analysisRepository,
          createNoopUsageLedger(analysisRepository),
        );
      },
    },
  });
  return { userId: user.id, service };
}

const productionActions = createIntakeActions({
  authenticate: authenticatedService,
});

export async function submitYouTubeIntake(
  previousState: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  return productionActions.submit(previousState, formData);
}

export async function reanalyzeIntake(
  previousState: IntakeActionState,
  formData: FormData,
): Promise<IntakeActionState> {
  return productionActions.reanalyze(previousState, formData);
}
