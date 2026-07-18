import type { Metadata } from 'next';

import { NewAnalysisHome } from '@/components/app-shell/new-analysis-home';
import { defaultOnboardingState } from '@/lib/onboarding/preferences';
import { getOnboardingState } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'New analysis — Gleen',
};

export default async function AppPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const result = await getOnboardingState(
    createSupabaseOnboardingStorage(supabase),
    user?.id ?? null,
  );
  const preferences = result.ok ? result.data : defaultOnboardingState;

  return (
    <NewAnalysisHome
      profileDefaults={{
        outputLocale: preferences.outputLocale,
        summaryPreset: preferences.summaryPreset,
        flashcardPreset: preferences.flashcardPreset,
      }}
    />
  );
}
