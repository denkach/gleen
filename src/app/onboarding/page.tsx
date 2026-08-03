import { redirect } from 'next/navigation';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { OnboardingFlow } from '@/components/onboarding/onboarding-flow';
import { getOnboardingState } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { authMessages } from '@/lib/i18n/messages/auth';
import { onboardingMessages } from '@/lib/i18n/messages/onboarding';
import { sharedMessages } from '@/lib/i18n/messages/shared';
import { getRequestLocale } from '@/lib/i18n/request-locale';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    onboardingMessages,
    locale,
    'onboarding',
    reportMissingTranslation,
  );
  return { title: copy.metadata.title, description: copy.metadata.description };
}

export default async function OnboardingPage() {
  const locale = await getRequestLocale();
  const authCopy = selectMessages(
    authMessages,
    locale,
    'auth',
    reportMissingTranslation,
  );
  const copy = selectMessages(
    onboardingMessages,
    locale,
    'onboarding',
    reportMissingTranslation,
  );
  const sharedCopy = selectMessages(
    sharedMessages,
    locale,
    'shared',
    reportMissingTranslation,
  );
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
      locale={locale}
      copy={authCopy}
      localeSwitcherCopy={sharedCopy}
      visualTitle={copy.shell.visualTitle}
      visualDescription={copy.shell.visualDescription}
    >
      <OnboardingFlow initialState={result.data} copy={copy} />
    </AuthShell>
  );
}
