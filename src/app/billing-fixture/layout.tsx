import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

export const metadata: Metadata = {
  title: 'Billing fixture — Gleen',
  robots: { index: false, follow: false },
};

const fixtureIdentity = {
  displayName: 'Billing Preview',
  email: 'preview@example.invalid',
  initials: 'BP',
} as const;
const fixtureUsage = {
  status: 'available',
  label: '7 analyses left',
  planName: 'Starter',
  used: 18,
  limit: 25,
  resetAt: '2025-08-01T00:00:00.000Z',
} as const;

export default function BillingFixtureLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  return (
    <AppShell
      identity={fixtureIdentity}
      usage={fixtureUsage}
      pathnameOverride="/app/subscription"
    >
      {children}
    </AppShell>
  );
}
