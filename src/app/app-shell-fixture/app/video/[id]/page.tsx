import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { IntakeReadiness } from '@/components/app-shell/intake-readiness';
import { unavailableUsage } from '@/lib/app-shell';
import { isUiPreviewEnabled } from '@/lib/ui-preview';
import { fixtureSavedIntake } from '@/lib/youtube-intake/development-fixtures';

const allowedIds = new Set([
  fixtureSavedIntake.id,
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
]);

export default async function FixtureReadinessPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  )
    notFound();
  const { id } = await params;
  if (!allowedIds.has(id)) notFound();
  const intake = {
    ...fixtureSavedIntake,
    id,
    attempt: id.startsWith('4444') ? 2 : 1,
    reanalysisOf: id.startsWith('4444') ? fixtureSavedIntake.id : null,
  };
  return (
    <AppShell
      identity={{
        displayName: 'Test User',
        email: 'test@example.com',
        initials: 'TU',
      }}
      usage={unavailableUsage}
      pathnameOverride="/app"
    >
      <IntakeReadiness intake={intake} />
    </AppShell>
  );
}
