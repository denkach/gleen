'use client';

import { useRef } from 'react';

import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

import { AnalysisProcessingScreen } from './analysis-processing-screen';

export function AnalysisProcessingFixtureScreen({
  intake,
  initialSnapshot,
  retrySnapshot,
}: Readonly<{
  intake: AnalysisIntake;
  initialSnapshot: AnalysisSnapshot;
  retrySnapshot?: AnalysisSnapshot;
}>) {
  const retried = useRef(false);

  return (
    <AnalysisProcessingScreen
      intake={intake}
      initialSnapshot={initialSnapshot}
      enableLiveUpdates={false}
      retryAction={async () => {
        retried.current = true;
        return { ok: true, attempt: retrySnapshot?.job.attempt ?? 2 };
      }}
      refreshAction={async () =>
        retried.current ? (retrySnapshot ?? initialSnapshot) : initialSnapshot
      }
    />
  );
}
