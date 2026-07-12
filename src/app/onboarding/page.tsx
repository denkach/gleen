import { redirect } from 'next/navigation';

import { AuthShell } from '@/components/auth/auth-shell';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { getOnboardingState } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const result = await getOnboardingState(
    createSupabaseOnboardingStorage(supabase),
    user.id,
  );
  if (!result.ok) redirect('/session-expired');

  return (
    <AuthShell
      visualTitle="Tune the spectrum."
      visualDescription="Set the language and output defaults that make Gleen yours."
    >
      <OnboardingFlow initialState={result.data} />
    </AuthShell>
  );
}
