import type { Metadata } from 'next';

import { AccessForm } from '@/components/auth/access-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { safeInternalRedirect } from '@/lib/auth/redirects';

export const metadata: Metadata = { title: 'Sign in — Gleen' };

type SignInPageProps = Readonly<{
  searchParams: Promise<{ next?: string }>;
}>;

export default async function SignInPage({ searchParams }: SignInPageProps) {
  const nextPath = safeInternalRedirect(
    (await searchParams).next,
    '/onboarding',
  );

  return (
    <AuthShell
      visualTitle="Return to the signal."
      visualDescription="Every analysis, card, timestamp, and export remains exactly where you left it."
    >
      <AccessForm intent="sign-in" nextPath={nextPath} />
    </AuthShell>
  );
}
