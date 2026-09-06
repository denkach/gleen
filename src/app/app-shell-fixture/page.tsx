import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { NewAnalysisHome } from '@/components/app-shell/new-analysis-home';
import { AnalysisHandoffFixture } from '@/components/app-shell/analysis-handoff-fixture';
import { LanguagePreferences } from '@/components/settings/language-preferences';
import { PreferencesSettings } from '@/components/settings/preferences-settings';
import { unavailableUsage } from '@/lib/app-shell';
import { localeSchema } from '@/lib/i18n/locales';
import { appMessages } from '@/lib/i18n/messages/app';
import { historyMessages } from '@/lib/i18n/messages/history';
import {
  materializeSettingsClientCopy,
  settingsMessages,
} from '@/lib/i18n/messages/settings';
import { sharedMessages } from '@/lib/i18n/messages/shared';
import { materializeLocaleSwitcherCopy } from '@/lib/i18n/locale-switcher-copy';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { isUiPreviewEnabled } from '@/lib/ui-preview';
import { defaultOnboardingState } from '@/lib/onboarding/preferences';
import type { HistoryItem } from '@/lib/history/repository';
import { buildMonthlyUsageState } from '@/lib/billing/monthly-usage';
import { summaryModeSchema } from '@/lib/summary-mode';
import {
  reanalyzeFixture,
  setFixtureSummaryMode,
  submitDuplicateFixture,
  submitInvalidUrlFixture,
  submitProviderOutageFixture,
  submitReadyFixture,
  submitReanalysisFixture,
  submitTranscriptUnavailableFixture,
  submitUsageLimitFixture,
  submitVideoUnavailableFixture,
} from '@/lib/youtube-intake/development-fixture-actions';
import { fixtureSummaryDefaultCookie } from '@/lib/youtube-intake/development-fixture-preferences';

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

function recentFixtureItems(
  locale: keyof typeof historyMessages,
): readonly HistoryItem[] {
  const items = [
    [
      '00000000-0000-4000-8000-000000000001',
      'How to Learn Anything Faster',
      'Signal Lab',
      '34:18',
      'ready',
    ],
    [
      '00000000-0000-4000-8000-000000000002',
      'The Hidden Architecture of Great Decisions',
      'Frame School',
      '47:09',
      'partial',
    ],
    [
      '00000000-0000-4000-8000-000000000003',
      'Build a Second Brain That Actually Works',
      'Field Notes',
      '28:41',
      'processing',
    ],
  ] as const;
  return items.map(
    ([id, title, channel, durationLabel, status], index) =>
      ({
        id,
        sourceId: `recent-fixture-${index + 1}`,
        href: '/app-shell-fixture/app/video/result-den-25',
        title,
        channel,
        thumbnailUrl:
          index === 0
            ? 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg'
            : null,
        source: 'https://www.youtube.com/watch?v=recentfixture1',
        language: 'English',
        outputLocale: 'en',
        summaryPresetLabel: 'Deep',
        durationSeconds: 2_058 + index * 429,
        durationLabel,
        analyzedAt: '2026-07-24T11:42:00.000Z',
        analyzedAtLabel: 'Today · 11:42',
        lastOpenedAt: null,
        lastOpenedAtLabel: null,
        status: {
          key: status,
          label: historyMessages[locale].presentation.statuses[status],
        },
        favorite: false,
        selectedArtifacts: ['summary', 'flashcards', 'timestamps'],
        readyArtifacts:
          status === 'ready'
            ? ['summary', 'flashcards', 'timestamps']
            : ['summary'],
        canExport: true,
        titleRevision: '2026-07-24T11:42:00.000Z',
      }) satisfies HistoryItem,
  );
}

type Props = Readonly<{
  searchParams: Promise<{
    continuation?: string;
    intake?: string;
    journey?: 'complete' | 'partial' | 'recover' | 'reduced';
    analysis?: string;
    locale?: string;
    view?: string;
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
    view,
  } = await searchParams;
  if (view !== undefined && view !== 'settings') notFound();
  const parsedLocale = localeSchema.safeParse(localeInput);
  const locale = parsedLocale.success
    ? parsedLocale.data
    : await getRequestLocale();
  const resultQuery = fixtureQueryString(
    { continuation, intake, journey, analysis, locale: localeInput },
    locale,
  );
  const storedSummaryMode = summaryModeSchema.safeParse(
    (await cookies()).get(fixtureSummaryDefaultCookie)?.value,
  ).data;
  const settingsClientCopy = materializeSettingsClientCopy(
    settingsMessages[locale],
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
      localeSwitcherCopy={materializeLocaleSwitcherCopy(sharedMessages[locale])}
      usage={unavailableUsage}
      pathnameOverride={view === 'settings' ? '/app/settings/profile' : '/app'}
    >
      {view === 'settings' ? (
        <>
          <LanguagePreferences
            interfaceLocale={locale}
            outputLocale={defaultOnboardingState.outputLocale}
            copy={settingsClientCopy}
          />
          <PreferencesSettings
            copy={settingsClientCopy}
            flashcardPreset={defaultOnboardingState.flashcardPreset}
            summaryMode={
              storedSummaryMode ?? defaultOnboardingState.summaryPreset
            }
            summaryModeAction={setFixtureSummaryMode}
          />
        </>
      ) : resolvedJourney ? (
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
          profileDefaults={{
            outputLocale: defaultOnboardingState.outputLocale,
            summaryPreset:
              storedSummaryMode ?? defaultOnboardingState.summaryPreset,
            flashcardPreset: defaultOnboardingState.flashcardPreset,
          }}
          recentAnalyses={{ kind: 'ready', items: recentFixtureItems(locale) }}
          monthlyUsage={buildMonthlyUsageState({
            locale,
            copy: appMessages[locale].newAnalysis.monthly,
            now: '2026-07-29T12:00:00.000Z',
            used: 22,
            limit: 50,
            canUpgrade: true,
            currentEntries: [
              {
                eventType: 'reservation',
                quantity: -2,
                occurredAt: '2026-07-28T10:00:00.000Z',
              },
              {
                eventType: 'reservation',
                quantity: -3,
                occurredAt: '2026-07-29T10:00:00.000Z',
              },
            ],
            previousEntries: [
              {
                eventType: 'reservation',
                quantity: -4,
                occurredAt: '2026-06-20T10:00:00.000Z',
              },
            ],
          })}
        />
      )}
    </AppShell>
  );
}
