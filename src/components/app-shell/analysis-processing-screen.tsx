'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import {
  chooseNewestSnapshot,
  toAnalysisVisualState,
} from '@/lib/analysis-pipeline/client-state';
import type {
  AnalysisSnapshot,
  ArtifactKind,
} from '@/lib/analysis-pipeline/domain';
import type { RetryActionResult } from '@/lib/analysis-pipeline/retry-actions';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';
import {
  saveFlashcardReview,
  saveResultArtifact,
  saveResultTitle,
} from '@/lib/result-workspace/actions';
import { normalizeResultWorkspace } from '@/lib/result-workspace/presentation';
import { ResultWorkspace } from '@/components/result-workspace/result-workspace';

import { AnalyzeProcessingVisual } from './analyze-processing-visual';

type Props = Readonly<{
  intake: AnalysisIntake;
  initialSnapshot: AnalysisSnapshot;
  retryAction(formData: FormData): Promise<RetryActionResult>;
  refreshAction(analysisId: string): Promise<AnalysisSnapshot | null>;
  enableLiveUpdates?: boolean;
  reconcileOnMount?: boolean;
}>;

const artifactLabels: Record<ArtifactKind, string> = {
  transcript: 'Transcript',
  summary: 'Summary',
  flashcards: 'Flashcards',
  timestamps: 'Timestamps',
};
const pollingIntervalMs = 3_000;

export function AnalysisProcessingScreen({
  intake,
  initialSnapshot,
  retryAction,
  refreshAction,
  enableLiveUpdates = true,
  reconcileOnMount = false,
}: Props) {
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [retryError, setRetryError] = useState<string>();
  const [isRetryPending, startRetryTransition] = useTransition();
  const [showResults, setShowResults] = useState(
    initialSnapshot.job.status === 'complete',
  );
  const startedNonTerminal = useRef(
    !['partial', 'complete', 'failed'].includes(initialSnapshot.job.status),
  );
  const mounted = useRef(true);
  const isTerminal = ['partial', 'complete', 'failed'].includes(
    snapshot.job.status,
  );

  const refresh = useCallback(async () => {
    const incoming = await refreshAction(intake.id);
    if (incoming && mounted.current)
      setSnapshot((current) => chooseNewestSnapshot(current, incoming));
  }, [intake.id, refreshAction]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (reconcileOnMount) void refresh();
  }, [reconcileOnMount, refresh]);

  useEffect(() => {
    const hasUsablePartialResult =
      snapshot.job.status === 'partial' &&
      startedNonTerminal.current &&
      snapshot.artifacts.some(({ status }) => status === 'ready');
    if (
      (snapshot.job.status !== 'complete' && !hasUsablePartialResult) ||
      showResults
    )
      return;
    const reduced = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    const timer = window.setTimeout(
      () => setShowResults(true),
      reduced ? 0 : 500,
    );
    return () => window.clearTimeout(timer);
  }, [showResults, snapshot.artifacts, snapshot.job.status]);

  useEffect(() => {
    if (!enableLiveUpdates || isTerminal) return;
    const supabase = createBrowserSupabaseClient();
    const reconciliation = setInterval(() => void refresh(), pollingIntervalMs);
    const notify = () => void refresh();
    const channel = supabase
      .channel(`analysis:${snapshot.job.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${snapshot.job.id}`,
        },
        notify,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_job_events',
          filter: `job_id=eq.${snapshot.job.id}`,
        },
        notify,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_artifacts',
          filter: `analysis_id=eq.${intake.id}`,
        },
        notify,
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') void refresh();
      });

    return () => {
      clearInterval(reconciliation);
      void supabase.removeChannel(channel);
    };
  }, [enableLiveUpdates, intake.id, isTerminal, refresh, snapshot.job.id]);

  const retry = () => {
    if (isRetryPending) return;
    setRetryError(undefined);
    const formData = new FormData();
    formData.set('analysisId', intake.id);
    startRetryTransition(async () => {
      const result = await retryAction(formData);
      if (!result.ok) {
        setRetryError(
          'We couldn’t restart the unfinished work. Please try again.',
        );
        return;
      }
      setShowResults(false);
      await refresh();
    });
  };

  const readyArtifacts = snapshot.artifacts.filter(
    ({ status }) => status === 'ready',
  );
  const failedArtifacts = snapshot.artifacts.filter(
    ({ status }) => status === 'failed',
  );

  return (
    <section
      className="analysis-processing-screen"
      aria-labelledby="analysis-video-title"
    >
      <header className="analysis-processing-heading">
        <p>ANALYSIS</p>
        <h1 id="analysis-video-title">{intake.title}</h1>
      </header>
      {!showResults ? (
        <AnalyzeProcessingVisual
          state={toAnalysisVisualState(snapshot)}
          submittedUrl={intake.canonicalUrl}
          isExiting={
            snapshot.job.status === 'complete' ||
            (snapshot.job.status === 'partial' && readyArtifacts.length > 0)
          }
          errorMessage={
            retryError ??
            (snapshot.job.status === 'partial'
              ? 'Some artifacts are ready. Retry only the unfinished work.'
              : snapshot.job.status === 'failed'
                ? 'Analysis stopped safely. Your completed work has been kept.'
                : undefined)
          }
          onRetry={
            ['partial', 'failed'].includes(snapshot.job.status)
              ? retry
              : undefined
          }
          retryDisabled={isRetryPending}
        />
      ) : (
        <>
          {snapshot.job.status === 'partial' ? (
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-default)] bg-white/[0.015] p-4">
              <p role="status" className="text-sm text-[var(--text-secondary)]">
                Some artifacts need attention. Your ready results remain usable.
              </p>
              <button
                type="button"
                className="min-h-11 rounded-lg border border-[var(--border-default)] px-4 text-sm text-[var(--text-primary)]"
                onClick={retry}
                disabled={isRetryPending}
              >
                {isRetryPending ? 'Retrying…' : 'Try again'}
              </button>
            </div>
          ) : null}
          <ResultWorkspace
            model={normalizeResultWorkspace(intake, snapshot)}
            saveTitle={saveResultTitle}
            saveArtifact={saveResultArtifact}
            saveFlashcardReview={saveFlashcardReview}
          />
        </>
      )}
      {readyArtifacts.length || failedArtifacts.length ? (
        <ul className="analysis-artifact-status" aria-label="Artifact status">
          {readyArtifacts.map((artifact) => (
            <li key={artifact.id} data-artifact-status="ready">
              {artifactLabels[artifact.kind]} ready
            </li>
          ))}
          {failedArtifacts.map((artifact) => (
            <li key={artifact.id} data-artifact-status="failed">
              {artifactLabels[artifact.kind]} needs retry
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
