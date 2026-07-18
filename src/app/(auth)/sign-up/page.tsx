import type { Metadata } from 'next';

import { AccessForm } from '@/components/auth/access-form';
import { AuthShell } from '@/components/auth/auth-shell';
import { safeInternalRedirect } from '@/lib/auth/redirects';

export const metadata: Metadata = { title: 'Create account — Gleen' };

type SignUpPageProps = Readonly<{
  searchParams: Promise<{ next?: string }>;
}>;

export default async function SignUpPage({ searchParams }: SignUpPageProps) {
  const nextPath = safeInternalRedirect(
    (await searchParams).next,
    '/onboarding',
  );
  return (
    <AuthShell
      visualTitle="Begin with one link."
      visualDescription="Your first video becomes a structured workspace in a few clear steps."
    >
      <AccessForm intent="sign-up" nextPath={nextPath} />
    </AuthShell>
  );
}
