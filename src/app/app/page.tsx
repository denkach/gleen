import type { Metadata } from 'next';

import { NewAnalysisHome } from '@/components/app-shell/new-analysis-home';
import {
  createSupabaseAnalysisRepository,
  type SupabaseAnalysisClient,
} from '@/lib/analysis-pipeline/supabase-repository';
import { resolveOwnedActiveAnalysis } from '@/lib/analysis-pipeline/recovery';
import { defaultOnboardingState } from '@/lib/onboarding/preferences';
import { getOnboardingState } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseAnalysisContinuation } from '@/lib/youtube-intake/continuation';
import {
  createSupabaseIntakeRepository,
  type SupabaseIntakeClient,
} from '@/lib/youtube-intake/supabase-repository';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { appMessages } from '@/lib/i18n/messages/app';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { historyMessages } from '@/lib/i18n/messages/history';
import { parseHistoryQuery } from '@/lib/history/query';
import type { HistoryItem } from '@/lib/history/repository';
import {
  createSupabaseHistoryRepository,
  type SupabaseHistoryClient,
} from '@/lib/history/supabase-repository';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    appMessages,
    locale,
    'app',
    reportMissingTranslation,
  );
  return {
    title: copy.metadata.newAnalysisTitle,
    description: copy.metadata.newAnalysisDescription,
  };
}

type AppPageProps = Readonly<{
  searchParams: Promise<{ analysis?: string; continuation?: string }>;
}>;

export default async function AppPage({ searchParams }: AppPageProps) {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    appMessages,
    locale,
    'app',
    reportMissingTranslation,
  );
  const historyCopy = selectMessages(
    historyMessages,
    locale,
    'history',
    reportMissingTranslation,
  );
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const result = await getOnboardingState(
    createSupabaseOnboardingStorage(supabase),
    user?.id ?? null,
  );
  const preferences = result.ok ? result.data : defaultOnboardingState;
  const params = await searchParams;
  const continuation = parseAnalysisContinuation(params.continuation ?? null);
  let initialAnalysis;
  let resolvedContinuation = continuation;
  let recentAnalyses:
    | Readonly<{ kind: 'ready'; items: readonly HistoryItem[] }>
    | Readonly<{ kind: 'unavailable' }> = { kind: 'ready', items: [] };

  if (user) {
    const intakeRepository = createSupabaseIntakeRepository(
      supabase as unknown as SupabaseIntakeClient,
    );
    const analysisRepository = createSupabaseAnalysisRepository(
      supabase as unknown as SupabaseAnalysisClient,
    );
    const recovery = await resolveOwnedActiveAnalysis({
      userId: user.id,
      requestedAnalysisId: params.analysis ?? null,
      continuation,
      intakeRepository,
      analysisRepository,
    });
    initialAnalysis = recovery.initialAnalysis ?? undefined;
    resolvedContinuation = recovery.continuation;
    try {
      const historyRepository = createSupabaseHistoryRepository(
        supabase as unknown as SupabaseHistoryClient,
        { locale, copy: historyCopy },
      );
      const page = await historyRepository.listOwned(
        user.id,
        parseHistoryQuery({}),
        3,
      );
      recentAnalyses = { kind: 'ready', items: page.items };
    } catch {
      recentAnalyses = { kind: 'unavailable' };
    }
  }

  return (
    <NewAnalysisHome
      copy={copy}
      profileDefaults={{
        outputLocale: preferences.outputLocale,
        summaryPreset: preferences.summaryPreset,
        flashcardPreset: preferences.flashcardPreset,
      }}
      initialAnalysis={initialAnalysis ?? undefined}
      continuation={resolvedContinuation ?? undefined}
      recentAnalyses={recentAnalyses}
    />
  );
}
