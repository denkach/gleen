import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { ProfileSettings } from '@/components/settings/profile-settings';
import { deriveAppIdentity } from '@/lib/app-shell';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import {
  materializeSettingsClientCopy,
  settingsMessages,
} from '@/lib/i18n/messages/settings';
import { getRequestLocale } from '@/lib/i18n/request-locale';
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

export default async function SettingsProfilePage() {
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
  const identity = deriveAppIdentity(user);
  return (
    <ProfileSettings
      copy={materializeSettingsClientCopy(copy)}
      displayName={identity.displayName}
      email={identity.email}
      emailVerified={Boolean(user.email_confirmed_at)}
      initials={identity.initials}
    />
  );
}
