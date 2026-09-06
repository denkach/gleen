import { redirect } from 'next/navigation';
import { CapabilitySettings } from '@/components/settings/capability-settings';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { settingsMessages } from '@/lib/i18n/messages/settings';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { buildIntegrationCapabilities } from '@/lib/settings/capabilities';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}
export default async function SettingsIntegrationsPage() {
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
  const names = {
    notion: 'Notion',
    obsidian: 'Obsidian',
    notebooklm: 'NotebookLM',
  } as const;
  const items = buildIntegrationCapabilities().map((item) => ({
    ...item,
    title: names[item.key as keyof typeof names],
    detail: copy.capabilities.integrations.unavailable,
  }));
  return (
    <CapabilitySettings
      eyebrow={copy.page.title}
      title={copy.capabilities.integrations.title}
      description={copy.capabilities.integrations.description}
      icon="integration"
      items={items}
    />
  );
}
