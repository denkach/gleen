'use client';

import { useRef } from 'react';

import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

import { AnalysisProcessingScreen } from './analysis-processing-screen';

export function AnalysisProcessingFixtureScreen({
  intake,
  initialSnapshot,
  retrySnapshot,
  transitionSnapshot,
}: Readonly<{
  intake: AnalysisIntake;
  initialSnapshot: AnalysisSnapshot;
  retrySnapshot?: AnalysisSnapshot;
  transitionSnapshot?: AnalysisSnapshot;
}>) {
  const retried = useRef(false);

  return (
    <>
      {initialSnapshot.job.status === 'partial' ? (
        <button
          type="button"
          className="analyze-control"
          onClick={() =>
            window.location.assign(
              '/app-shell-fixture/app/video/result-partial',
            )
          }
        >
          View available results
        </button>
      ) : null}
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={initialSnapshot}
        enableLiveUpdates={false}
        reconcileOnMount={Boolean(transitionSnapshot)}
        retryAction={async () => {
          retried.current = true;
          return { ok: true, attempt: retrySnapshot?.job.attempt ?? 2 };
        }}
        refreshAction={async () =>
          retried.current
            ? (retrySnapshot ?? transitionSnapshot ?? initialSnapshot)
            : (transitionSnapshot ?? initialSnapshot)
        }
      />
    </>
  );
}
