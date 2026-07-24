import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import {
  FixtureHistory,
  historyVisualCases,
  type HistoryVisualCase,
} from '@/components/app-shell/fixture-history';
import { unavailableUsage } from '@/lib/app-shell';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

export const metadata: Metadata = {
  title: 'History fixture — Gleen',
};

const fixtureIdentity = {
  displayName: 'Alex Koval',
  email: 'alex@gleen.space',
  initials: 'AK',
} as const;

type FixtureHistoryPageProps = Readonly<{
  searchParams: Promise<
    Readonly<{ visualCase?: string | readonly string[] | undefined }>
  >;
}>;

function isHistoryVisualCase(value: unknown): value is HistoryVisualCase {
  return (
    typeof value === 'string' &&
    historyVisualCases.includes(value as HistoryVisualCase)
  );
}

export default async function FixtureHistoryPage({
  searchParams,
}: FixtureHistoryPageProps) {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  const { visualCase = 'default' } = await searchParams;
  if (!isHistoryVisualCase(visualCase)) {
    notFound();
  }

  return (
    <AppShell
      identity={fixtureIdentity}
      usage={unavailableUsage}
      pathnameOverride="/app/history"
    >
      <FixtureHistory visualCase={visualCase} />
    </AppShell>
  );
}
