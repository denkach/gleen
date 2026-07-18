import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { NewAnalysisHome } from '@/components/app-shell/new-analysis-home';
import { AnalysisHandoffFixture } from '@/components/app-shell/analysis-handoff-fixture';
import { unavailableUsage } from '@/lib/app-shell';
import { isUiPreviewEnabled } from '@/lib/ui-preview';
import {
  reanalyzeFixture,
  submitDuplicateFixture,
  submitInvalidUrlFixture,
  submitProviderOutageFixture,
  submitReadyFixture,
  submitReanalysisFixture,
  submitTranscriptUnavailableFixture,
  submitVideoUnavailableFixture,
} from '@/lib/youtube-intake/development-fixture-actions';

import { fixtureCases } from './fixture-cases';

const fixtureIdentity = {
  displayName: 'Test User',
  email: 'test@example.com',
  initials: 'TU',
} as const;

type Props = Readonly<{
  searchParams: Promise<{
    continuation?: string;
    intake?: string;
    journey?: 'complete' | 'partial' | 'recover' | 'reduced';
  }>;
}>;

export default async function AppShellFixturePage({ searchParams }: Props) {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  const { continuation, intake, journey } = await searchParams;
  if (
    intake &&
    !fixtureCases.includes(intake as (typeof fixtureCases)[number])
  ) {
    notFound();
  }
  const scenario = intake ?? 'ready';
  const fixtureActions = {
    ready: submitReadyFixture,
    duplicate: submitDuplicateFixture,
    'invalid-url': submitInvalidUrlFixture,
    'video-unavailable': submitVideoUnavailableFixture,
    'transcript-unavailable': submitTranscriptUnavailableFixture,
    'provider-outage': submitProviderOutageFixture,
    reanalysis: submitReanalysisFixture,
  } as const;

  return (
    <AppShell
      identity={fixtureIdentity}
      usage={unavailableUsage}
      pathnameOverride="/app"
    >
      {journey ? (
        <AnalysisHandoffFixture journey={journey} />
      ) : (
        <NewAnalysisHome
          action={fixtureActions[scenario as keyof typeof fixtureActions]}
          reanalyzeAction={reanalyzeFixture}
          resultPathPrefix="/app-shell-fixture/app/video"
          continuation={continuation ? { rawUrl: continuation } : undefined}
        />
      )}
    </AppShell>
  );
}
