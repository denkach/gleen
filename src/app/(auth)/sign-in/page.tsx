import type { Metadata } from 'next';

import { AccessForm } from '@/components/auth/access-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { safeInternalRedirect } from '@/lib/auth/redirects';
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
  return { title: copy.metadata.signIn };
}

type SignInPageProps = Readonly<{
  searchParams: Promise<{ next?: string }>;
}>;

export default async function SignInPage({ searchParams }: SignInPageProps) {
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
  const nextPath = safeInternalRedirect(
    (await searchParams).next,
    '/onboarding',
  );

  return (
    <AuthShell
      locale={locale}
      copy={copy}
      localeSwitcherCopy={sharedCopy}
      visualTitle={copy.visual.signInTitle}
      visualDescription={copy.visual.signInDescription}
    >
      <AccessForm intent="sign-in" nextPath={nextPath} copy={copy} />
    </AuthShell>
  );
}
