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
import type { BillingRepository, UsageQuery } from '@/lib/billing/repository';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import {
  buildMonthlyUsageState,
  monthlyUsageBounds,
  type MonthlyUsageState,
} from '@/lib/billing/monthly-usage';
import type { UsageLedgerEntry } from '@/lib/billing/domain';

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

async function listUsagePeriod(
  repository: Pick<BillingRepository, 'listOwnedUsage'>,
  userId: string,
  periodStart: string,
  periodEnd: string,
): Promise<readonly UsageLedgerEntry[]> {
  const items: UsageLedgerEntry[] = [];
  let cursor: UsageQuery['cursor'] = null;
  do {
    const page = await repository.listOwnedUsage(userId, {
      cursor,
      limit: 100,
      search: '',
      eventType: 'settlement',
      periodStart,
      periodEnd,
    });
    items.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor !== null);
  return items;
}

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
  let monthlyUsage: MonthlyUsageState = { kind: 'unavailable' };

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
    const loadRecentAnalyses = async () => {
      const historyRepository = createSupabaseHistoryRepository(
        supabase as unknown as SupabaseHistoryClient,
        { locale, copy: historyCopy },
      );
      const page = await historyRepository.listOwned(
        user.id,
        parseHistoryQuery({}),
        3,
      );
      return { kind: 'ready' as const, items: page.items };
    };
    const loadMonthlyUsage = async (): Promise<MonthlyUsageState> => {
      const repository = createSupabaseBillingRepository(
        supabase as unknown as SupabaseBillingClient,
      );
      const now = new Date().toISOString();
      const bounds = monthlyUsageBounds(now);
      const [snapshot, currentEntries, previousEntries] = await Promise.all([
        repository.getOwnedSnapshot(user.id),
        listUsagePeriod(
          repository,
          user.id,
          bounds.currentStart,
          bounds.currentEnd,
        ),
        listUsagePeriod(
          repository,
          user.id,
          bounds.previousStart,
          bounds.previousEnd,
        ),
      ]);
      const canUpgrade = snapshot.availablePlans.some(
        ({ plan }) =>
          plan.purchasable &&
          plan.analysisLimit > snapshot.currentPlan.analysisLimit,
      );
      return buildMonthlyUsageState({
        locale,
        copy: copy.newAnalysis.monthly,
        now,
        used: snapshot.usage.used + snapshot.usage.reserved,
        limit: snapshot.usage.limit,
        canUpgrade,
        currentEntries,
        previousEntries,
      });
    };

    [recentAnalyses, monthlyUsage] = await Promise.all([
      loadRecentAnalyses().catch(() => ({ kind: 'unavailable' as const })),
      loadMonthlyUsage().catch(() => ({ kind: 'unavailable' as const })),
    ]);
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
      monthlyUsage={monthlyUsage}
    />
  );
}
