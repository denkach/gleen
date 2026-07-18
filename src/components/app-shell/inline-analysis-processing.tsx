'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import {
  chooseNewestSnapshot,
  isTerminalAnalysis,
  toAnalysisVisualState,
} from '@/lib/analysis-pipeline/client-state';
import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import {
  refreshAnalysisSnapshot,
  retryAnalysis,
} from '@/lib/analysis-pipeline/retry-actions';
import { createBrowserSupabaseClient } from '@/lib/supabase/browser';

import { AnalyzeProcessingVisual } from './analyze-processing-visual';

export type InlineAnalysisProcessingProps = Readonly<{
  analysisId: string;
  initialSnapshot?: AnalysisSnapshot;
  refreshAction?: typeof refreshAnalysisSnapshot;
  retryAction?: typeof retryAnalysis;
  resultPathPrefix?: string;
}>;

const pollingIntervalMs = 2_000;

export function InlineAnalysisProcessing({
  analysisId,
  initialSnapshot,
  refreshAction = refreshAnalysisSnapshot,
  retryAction = retryAnalysis,
  resultPathPrefix = '/app/video',
}: InlineAnalysisProcessingProps) {
  const router = useRouter();
  const [snapshot, setSnapshot] = useState(initialSnapshot);
  const [retryError, setRetryError] = useState<string>();
  const [isRetryPending, startRetryTransition] = useTransition();
  const mounted = useRef(false);

  const refresh = useCallback(async () => {
    const incoming = await refreshAction(analysisId);
    if (!incoming || !mounted.current) return;
    setSnapshot((current) =>
      current ? chooseNewestSnapshot(current, incoming) : incoming,
    );
  }, [analysisId, refreshAction]);

  useEffect(() => {
    mounted.current = true;
    window.history.replaceState(null, '', `/app?analysis=${analysisId}`);
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [analysisId, refresh]);

  useEffect(() => {
    if (!snapshot || isTerminalAnalysis(snapshot)) return;
    const supabase = createBrowserSupabaseClient();
    const notify = () => void refresh();
    const polling = window.setInterval(notify, pollingIntervalMs);
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
          filter: `analysis_id=eq.${analysisId}`,
        },
        notify,
      )
      .subscribe();

    return () => {
      window.clearInterval(polling);
      void supabase.removeChannel(channel);
    };
  }, [analysisId, refresh, snapshot]);

  useEffect(() => {
    if (snapshot?.job.status === 'complete')
      router.push(`${resultPathPrefix}/${analysisId}`);
  }, [analysisId, resultPathPrefix, router, snapshot?.job.status]);

  const retry = () => {
    if (isRetryPending) return;
    setRetryError(undefined);
    const formData = new FormData();
    formData.set('analysisId', analysisId);
    startRetryTransition(async () => {
      const result = await retryAction(formData);
      if (!result.ok) {
        if (mounted.current)
          setRetryError('We couldn’t restart the analysis. Please try again.');
        return;
      }
      await refresh();
    });
  };

  const state = snapshot ? toAnalysisVisualState(snapshot) : 'validating';
  const canRetry =
    snapshot && ['partial', 'failed'].includes(snapshot.job.status);

  return (
    <AnalyzeProcessingVisual
      state={state}
      submittedUrl=""
      errorMessage={
        retryError ??
        (canRetry
          ? 'Analysis stopped safely. Your completed work has been kept.'
          : undefined)
      }
      onRetry={canRetry ? retry : undefined}
      retryDisabled={isRetryPending}
    />
  );
}
