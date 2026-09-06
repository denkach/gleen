import { redirect } from 'next/navigation';
import { CapabilitySettings } from '@/components/settings/capability-settings';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { settingsMessages } from '@/lib/i18n/messages/settings';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { buildSecurityCapabilities } from '@/lib/settings/capabilities';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}
export default async function SettingsSecurityPage() {
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
  const provider =
    user.identities?.[0]?.provider ?? user.app_metadata?.provider;
  const items = buildSecurityCapabilities(provider).map((item) =>
    item.key === 'method'
      ? { ...item, title: copy.capabilities.security.method }
      : {
          ...item,
          title: copy.capabilities.security.recovery,
          detail: copy.capabilities.security.recoveryDetail,
          action: {
            kind: 'link' as const,
            href: '/forgot-password',
            label: copy.capabilities.security.recoveryAction,
          },
        },
  );
  return (
    <CapabilitySettings
      eyebrow={copy.page.title}
      title={copy.capabilities.security.title}
      description={copy.capabilities.security.description}
      icon="shield"
      items={items}
    />
  );
}
