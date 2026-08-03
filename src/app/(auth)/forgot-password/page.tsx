import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
import { ForgotPasswordForm } from '@/components/auth/recovery-forms';
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
  return { title: copy.metadata.forgotPassword };
}

export default async function ForgotPasswordPage() {
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
      visualTitle={copy.visual.forgotTitle}
      visualDescription={copy.visual.forgotDescription}
    >
      <span className="eyebrow">{copy.screens.forgot.eyebrow}</span>
      <h2>{copy.screens.forgot.title}</h2>
      <p>{copy.screens.forgot.description}</p>
      <ForgotPasswordForm copy={copy} />
      <p className="auth-footer">
        <Link href="/sign-in">{copy.screens.forgot.returnToSignIn}</Link>
      </p>
    </AuthShell>
  );
}
