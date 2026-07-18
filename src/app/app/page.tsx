import type { Metadata } from 'next';

import { NewAnalysisHome } from '@/components/app-shell/new-analysis-home';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from '@/lib/analysis-pipeline/supabase-repository';
import { defaultOnboardingState } from '@/lib/onboarding/preferences';
import { getOnboardingState } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseAnalysisContinuation } from '@/lib/youtube-intake/continuation';
import {
  createSupabaseIntakeRepository,
  type SupabaseIntakeClient,
} from '@/lib/youtube-intake/supabase-repository';

export const metadata: Metadata = {
  title: 'New analysis — Gleen',
};

type AppPageProps = Readonly<{
  searchParams: Promise<{ analysis?: string; continuation?: string }>;
}>;

export default async function AppPage({ searchParams }: AppPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const result = await getOnboardingState(
    createSupabaseOnboardingStorage(supabase),
    user?.id ?? null,
  );
  const preferences = result.ok ? result.data : defaultOnboardingState;
  const params = await searchParams;
  const continuation = parseAnalysisContinuation(params.continuation ?? null);
  let initialAnalysis;

  if (user) {
    const intakeRepository = createSupabaseIntakeRepository(
      supabase as unknown as SupabaseIntakeClient,
    );
    const analysisRepository = createSupabaseAnalysisRepository(
      supabase as unknown as SupabaseAnalysisClient,
    );
    if (params.analysis) {
      const intake = await intakeRepository.findOwned(user.id, params.analysis);
      const snapshot = intake
        ? await analysisRepository.findOwnedSnapshot(user.id, intake.id)
        : null;
      if (
        intake &&
        snapshot &&
        (snapshot.job.status === 'queued' || snapshot.job.status === 'running')
      )
        initialAnalysis = { intake, snapshot };
    }
    if (!initialAnalysis && !continuation)
      initialAnalysis = await analysisRepository.findMostRecentOwnedActive(
        user.id,
      );
  }

  return (
    <NewAnalysisHome
      profileDefaults={{
        outputLocale: preferences.outputLocale,
        summaryPreset: preferences.summaryPreset,
        flashcardPreset: preferences.flashcardPreset,
      }}
      initialAnalysis={initialAnalysis ?? undefined}
      continuation={initialAnalysis ? undefined : (continuation ?? undefined)}
    />
  );
}
