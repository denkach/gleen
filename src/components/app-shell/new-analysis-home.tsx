import Link from 'next/link';

import {
  createInitialIntakeActionState,
  type IntakeActionState,
} from '@/lib/youtube-intake/action-state';
import { defaultOnboardingState } from '@/lib/onboarding/preferences';

import { NewAnalysisForm } from './new-analysis-form';
import type { ComponentProps } from 'react';
import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';
import type { AppMessages } from '@/lib/i18n/messages/app';
import { RecentAnalyses, type RecentAnalysesState } from './recent-analyses';
import { MonthlyUsageCard } from './monthly-usage-card';
import type { MonthlyUsageState } from '@/lib/billing/monthly-usage';

type ProfileDefaults = Pick<
  IntakeActionState['configuration'],
  'outputLocale' | 'summaryPreset' | 'flashcardPreset'
>;

export function NewAnalysisHome({
  copy,
  profileDefaults = defaultOnboardingState,
  action,
  reanalyzeAction,
  resultPathPrefix,
  resultQuery,
  initialAnalysis,
  continuation,
  recentAnalyses = { kind: 'ready', items: [] },
  monthlyUsage = { kind: 'unavailable' },
}: Readonly<{
  copy: AppMessages;
  profileDefaults?: ProfileDefaults;
  action?: ComponentProps<typeof NewAnalysisForm>['action'];
  reanalyzeAction?: ComponentProps<typeof NewAnalysisForm>['reanalyzeAction'];
  resultPathPrefix?: string;
  resultQuery?: string;
  initialAnalysis?: Readonly<{
    intake: AnalysisIntake;
    snapshot: AnalysisSnapshot;
  }>;
  continuation?: Readonly<{ rawUrl: string }>;
  recentAnalyses?: RecentAnalysesState;
  monthlyUsage?: MonthlyUsageState;
}>) {
  const initialState = createInitialIntakeActionState(profileDefaults);
  return (
    <>
      <section className="analysis-hero" aria-labelledby="new-analysis-title">
        <span className="eyebrow">{copy.newAnalysis.eyebrow}</span>
        <h1 id="new-analysis-title">{copy.newAnalysis.title}</h1>
        <NewAnalysisForm
          copy={copy}
          initialState={
            initialAnalysis
              ? {
                  ...initialState,
                  status: 'ready',
                  analysisId: initialAnalysis.intake.id,
                  configuration: {
                    ...initialState.configuration,
                    artifacts: [
                      ...initialAnalysis.intake.configuration.artifacts,
                    ],
                  },
                }
              : continuation
                ? { ...initialState, rawUrl: continuation.rawUrl }
                : initialState
          }
          initialSnapshot={initialAnalysis?.snapshot}
          autoSubmit={Boolean(continuation)}
          action={action}
          reanalyzeAction={reanalyzeAction}
          resultPathPrefix={resultPathPrefix}
          resultQuery={resultQuery}
        />
      </section>

      <div className="dashboard-grid">
        <section
          className="panel new-analysis-panel recent-analyses-panel"
          aria-labelledby="recent-analyses-title"
        >
          <header className="new-analysis-panel__head">
            <h2 id="recent-analyses-title">{copy.newAnalysis.recent.title}</h2>
            <Link href="/app/history">
              {copy.newAnalysis.recent.viewHistory}
            </Link>
          </header>
          <RecentAnalyses
            state={recentAnalyses}
            copy={copy.newAnalysis.recent}
            artifacts={copy.newAnalysis.artifacts}
          />
        </section>
        <MonthlyUsageCard
          copy={copy.newAnalysis.monthly}
          state={monthlyUsage}
        />
      </div>
    </>
  );
}
