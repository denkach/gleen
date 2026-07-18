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

type ProfileDefaults = Pick<
  IntakeActionState['configuration'],
  'outputLocale' | 'summaryPreset' | 'flashcardPreset'
>;

export function NewAnalysisHome({
  profileDefaults = defaultOnboardingState,
  action,
  reanalyzeAction,
  resultPathPrefix,
  initialAnalysis,
  continuation,
}: Readonly<{
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
        <span className="eyebrow">New analysis</span>
        <h1 id="new-analysis-title">Turn a video into something useful.</h1>
        <NewAnalysisForm
          initialState={
            initialAnalysis
              ? {
                  ...initialState,
                  status: 'ready',
                  analysisId: initialAnalysis.intake.id,
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
            <h2 id="recent-analyses-title">Recent analyses</h2>
            <Link href="/app/history">View history →</Link>
          </header>
          <div className="panel-empty-state">
            <strong>No analyses yet</strong>
            <p>Your completed analyses will appear here.</p>
          </div>
        </section>

        <aside className="panel" aria-labelledby="monthly-metrics-title">
          <header className="panel-head">
            <h2 id="monthly-metrics-title">This month</h2>
            <Link href="/app/subscription">Manage plan</Link>
          </header>
          <div className="metric-stack">
            <p>
              Usage and study metrics become available after your first
              analysis.
            </p>
          </div>
        </aside>
      </div>
    </>
  );
}
