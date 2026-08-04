import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { NewAnalysisHome } from '@/components/app-shell/new-analysis-home';
import { AnalysisHandoffFixture } from '@/components/app-shell/analysis-handoff-fixture';
import { unavailableUsage } from '@/lib/app-shell';
import { localeSchema } from '@/lib/i18n/locales';
import { appMessages } from '@/lib/i18n/messages/app';
import { sharedMessages } from '@/lib/i18n/messages/shared';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { isUiPreviewEnabled } from '@/lib/ui-preview';
import {
  reanalyzeFixture,
  submitDuplicateFixture,
  submitInvalidUrlFixture,
  submitProviderOutageFixture,
  submitReadyFixture,
  submitReanalysisFixture,
  submitTranscriptUnavailableFixture,
  submitUsageLimitFixture,
  submitVideoUnavailableFixture,
} from '@/lib/youtube-intake/development-fixture-actions';

import { fixtureCases } from './fixture-cases';

function fixtureQueryString(
  query: Readonly<Record<string, string | undefined>>,
  locale: string,
): string {
  const parameters = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) parameters.set(key, value);
  }
  parameters.delete('analysis');
  parameters.set('locale', locale);
  return parameters.toString();
}

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
    analysis?: string;
    locale?: string;
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

  const {
    continuation,
    intake,
    journey,
    analysis,
    locale: localeInput,
  } = await searchParams;
  const parsedLocale = localeSchema.safeParse(localeInput);
  const locale = parsedLocale.success
    ? parsedLocale.data
    : await getRequestLocale();
  const resultQuery = fixtureQueryString(
    { continuation, intake, journey, analysis, locale: localeInput },
    locale,
  );
  const resolvedJourney = journey ?? (analysis ? 'recover' : undefined);
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
    'usage-limit': submitUsageLimitFixture,
    reanalysis: submitReanalysisFixture,
  } as const;

  return (
    <AppShell
      copy={appMessages[locale]}
      identity={fixtureIdentity}
      locale={locale}
      localeSwitcherCopy={sharedMessages[locale]}
      usage={unavailableUsage}
      pathnameOverride="/app"
    >
      {resolvedJourney ? (
        <AnalysisHandoffFixture
          copy={appMessages[locale]}
          journey={resolvedJourney}
          requestedAnalysisId={analysis}
          resultQuery={resultQuery}
        />
      ) : (
        <NewAnalysisHome
          copy={appMessages[locale]}
          action={fixtureActions[scenario as keyof typeof fixtureActions]}
          reanalyzeAction={reanalyzeFixture}
          resultPathPrefix="/app-shell-fixture/app/video"
          resultQuery={resultQuery}
          continuation={continuation ? { rawUrl: continuation } : undefined}
        />
      )}
    </AppShell>
  );
}
