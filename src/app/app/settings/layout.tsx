import type { ReactNode } from 'react';

import { SettingsShell } from '@/components/settings/settings-shell';
import { selectMessages, type MissingTranslationEvent } from '@/lib/i18n/catalog';
import { settingsMessages } from '@/lib/i18n/messages/settings';
import { getRequestLocale } from '@/lib/i18n/request-locale';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export default async function SettingsLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    settingsMessages,
    locale,
    'settings',
    reportMissingTranslation,
  );
  return <SettingsShell copy={copy}>{children}</SettingsShell>;
}
