import { redirect } from 'next/navigation';
import { CapabilitySettings } from '@/components/settings/capability-settings';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { settingsMessages } from '@/lib/i18n/messages/settings';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { buildDataCapabilities } from '@/lib/settings/capabilities';
import { createServerSupabaseClient } from '@/lib/supabase/server';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}
export default async function SettingsDataPage() {
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
  const labels = copy.capabilities.data;
  const items = buildDataCapabilities().map((item) => {
    if (item.key === 'history')
      return {
        ...item,
        title: labels.history,
        detail: labels.historyDetail,
        action: {
          kind: 'link' as const,
          href: '/app/history',
          label: labels.historyAction,
        },
      };
    if (item.key === 'export')
      return { ...item, title: labels.export, detail: labels.exportDetail };
    return { ...item, title: labels.deletion, detail: labels.deletionDetail };
  });
  return (
    <CapabilitySettings
      eyebrow={copy.page.eyebrow}
      title={labels.title}
      description={labels.description}
      items={items}
    />
  );
}
