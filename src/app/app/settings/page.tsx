import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { SettingsOverview } from '@/components/settings/settings-overview';
import { deriveAppIdentity } from '@/lib/app-shell';
import { selectMessages, type MissingTranslationEvent } from '@/lib/i18n/catalog';
import { localeMetadata } from '@/lib/i18n/locales';
import { settingsMessages } from '@/lib/i18n/messages/settings';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { getOnboardingState } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import type { SettingsOverviewModel } from '@/lib/settings/account-atlas';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = selectMessages(settingsMessages, locale, 'settings', reportMissingTranslation);
  return { title: copy.metadata.title, description: copy.metadata.description };
}

function providerLabel(provider: string | undefined): string {
  const value = provider?.trim() || 'email';
  return `${value.charAt(0).toLocaleUpperCase('en')}${value.slice(1)}`;
}

export default async function SettingsPage() {
  const locale = await getRequestLocale();
  const copy = selectMessages(settingsMessages, locale, 'settings', reportMissingTranslation);
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const identity = deriveAppIdentity(user);
  const preferencesResult = await getOnboardingState(
    createSupabaseOnboardingStorage(supabase),
    user.id,
  );
  const emailState = user.email_confirmed_at
    ? copy.atlas.summaries.verifiedEmail
    : copy.atlas.summaries.unverifiedEmail;
  const method = providerLabel(
    user.identities?.[0]?.provider ?? user.app_metadata?.provider,
  );

  const summaries: SettingsOverviewModel = {
    profile: {
      state: 'ready',
      text: copy.atlas.summaries.profile(identity.displayName, emailState),
    },
    preferences: preferencesResult.ok
      ? {
          state: 'ready',
          text: copy.atlas.summaries.preferences(
            copy.summary.modes[preferencesResult.data.summaryPreset].title,
            preferencesResult.data.flashcardPreset,
          ),
        }
      : {
          state: 'unavailable',
          text: copy.atlas.destinations.preferences.unavailable,
        },
    language: preferencesResult.ok
      ? {
          state: 'ready',
          text: copy.atlas.summaries.language(
            localeMetadata[preferencesResult.data.interfaceLocale].nativeName,
            localeMetadata[preferencesResult.data.outputLocale].nativeName,
          ),
        }
      : {
          state: 'unavailable',
          text: copy.atlas.destinations.language.unavailable,
        },
    integrations: {
      state: 'ready',
      text: copy.atlas.summaries.integrations,
    },
    security: {
      state: 'ready',
      text: copy.atlas.summaries.security(method),
    },
    data: { state: 'ready', text: copy.atlas.summaries.data },
  };

  return <SettingsOverview copy={copy} summaries={summaries} />;
}
