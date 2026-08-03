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
  initialAnalysis,
  continuation,
}: Readonly<{
  copy: AppMessages;
  profileDefaults?: ProfileDefaults;
  action?: ComponentProps<typeof NewAnalysisForm>['action'];
  reanalyzeAction?: ComponentProps<typeof NewAnalysisForm>['reanalyzeAction'];
  resultPathPrefix?: string;
  initialAnalysis?: Readonly<{
    intake: AnalysisIntake;
    snapshot: AnalysisSnapshot;
  }>;
  continuation?: Readonly<{ rawUrl: string }>;
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
        />
      </section>

      <div className="dashboard-grid">
        <section className="panel" aria-labelledby="recent-analyses-title">
          <header className="panel-head">
            <h2 id="recent-analyses-title">{copy.newAnalysis.recent.title}</h2>
            <Link href="/app/history">
              {copy.newAnalysis.recent.viewHistory}
            </Link>
          </header>
          <div className="panel-empty-state">
            <strong>{copy.newAnalysis.recent.emptyTitle}</strong>
            <p>{copy.newAnalysis.recent.emptyDescription}</p>
          </div>
        </section>

        <aside className="panel" aria-labelledby="monthly-metrics-title">
          <header className="panel-head">
            <h2 id="monthly-metrics-title">{copy.newAnalysis.monthly.title}</h2>
            <Link href="/app/subscription">
              {copy.newAnalysis.monthly.managePlan}
            </Link>
          </header>
          <div className="metric-stack">
            <p>{copy.newAnalysis.monthly.empty}</p>
          </div>
        </aside>
      </div>
    </>
  );
}
