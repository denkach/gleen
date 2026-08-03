import Link from 'next/link';
import type { Metadata } from 'next';

import { AuthShell } from '@/components/auth/auth-shell';
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
  return { title: copy.metadata.sessionExpired };
}

export default async function SessionExpiredPage() {
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
      visualTitle={copy.visual.sessionTitle}
      visualDescription={copy.visual.sessionDescription}
    >
      <span className="eyebrow">{copy.screens.session.eyebrow}</span>
      <h2>{copy.screens.session.title}</h2>
      <p>{copy.screens.session.description}</p>
      <Link className="btn btn-primary auth-submit" href="/sign-in">
        {copy.screens.session.action} <span aria-hidden="true">→</span>
      </Link>
    </AuthShell>
  );
}
