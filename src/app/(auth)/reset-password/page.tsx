import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { ResetPasswordForm } from '@/components/auth/recovery-forms';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { authMessages } from '@/lib/i18n/messages/auth';
import { sharedMessages } from '@/lib/i18n/messages/shared';
import { getRequestLocale } from '@/lib/i18n/request-locale';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    authMessages,
    locale,
    'auth',
    reportMissingTranslation,
  );
  return { title: copy.metadata.resetPassword };
}

export default async function ResetPasswordPage() {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    authMessages,
    locale,
    'auth',
    reportMissingTranslation,
  );
  const sharedCopy = selectMessages(
    sharedMessages,
    locale,
    'shared',
    reportMissingTranslation,
  );

  return (
    <AuthShell
      locale={locale}
      copy={copy}
      localeSwitcherCopy={sharedCopy}
      visualTitle={copy.visual.resetTitle}
      visualDescription={copy.visual.resetDescription}
    >
      <span className="eyebrow">{copy.screens.reset.eyebrow}</span>
      <h2>{copy.screens.reset.title}</h2>
      <p>{copy.password.requirements}</p>
      <ResetPasswordForm copy={copy} />
    </AuthShell>
  );
}
