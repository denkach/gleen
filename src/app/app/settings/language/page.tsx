import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LanguagePreferences } from '@/components/settings/language-preferences';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { settingsMessages } from '@/lib/i18n/messages/settings';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { defaultOnboardingState } from '@/lib/onboarding/preferences';
import { getOnboardingState } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}
export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    settingsMessages,
    locale,
    'settings',
    reportMissingTranslation,
  );
  return { title: copy.metadata.title, description: copy.metadata.description };
}

export default async function SettingsLanguagePage() {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    settingsMessages,
    locale,
    'settings',
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
  const preferences = result.ok ? result.data : defaultOnboardingState;
  return (
    <LanguagePreferences
      copy={copy}
      interfaceLocale={preferences.interfaceLocale}
      outputLocale={preferences.outputLocale}
      unavailable={!result.ok}
    />
  );
}
