'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

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
  resultPathPrefix = '/app/video',
}: InlineAnalysisProcessingProps) {
  const router = useRouter();
  const [snapshotState, setSnapshotState] = useState(() => ({
    analysisId,
    snapshot:
      initialSnapshot?.job.analysisId === analysisId
        ? initialSnapshot
        : undefined,
  }));
  const controllerGeneration = useRef(0);

  const ownedSnapshot =
    snapshotState.analysisId === analysisId
      ? snapshotState.snapshot
      : initialSnapshot?.job.analysisId === analysisId
        ? initialSnapshot
        : undefined;

  const refresh = useCallback(
    async (generation?: number) => {
      const requestedAnalysisId = analysisId;
      const requestedGeneration = generation ?? controllerGeneration.current;
      const incoming = await refreshAction(requestedAnalysisId);
      if (
        !incoming ||
        controllerGeneration.current !== requestedGeneration ||
        incoming.job.analysisId !== requestedAnalysisId
      )
        return;
      setSnapshotState((current) => {
        if (current.analysisId !== requestedAnalysisId)
          return { analysisId: requestedAnalysisId, snapshot: incoming };
        return {
          analysisId: requestedAnalysisId,
          snapshot: current.snapshot
            ? chooseNewestSnapshot(current.snapshot, incoming)
            : incoming,
        };
      });
    },
    [analysisId, refreshAction],
  );

  useEffect(() => {
    const generation = ++controllerGeneration.current;
    window.history.replaceState(null, '', `/app?analysis=${analysisId}`);
    void refresh(generation);
    return () => {
      if (controllerGeneration.current === generation)
        controllerGeneration.current += 1;
    };
  }, [analysisId, refresh]);

  useEffect(() => {
    if (!ownedSnapshot || isTerminalAnalysis(ownedSnapshot)) return;
    const supabase = createBrowserSupabaseClient();
    const generation = controllerGeneration.current;
    const notify = () => void refresh(generation);
    const polling = window.setInterval(notify, pollingIntervalMs);
    const channel = supabase
      .channel(`analysis:${ownedSnapshot.job.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_jobs',
          filter: `id=eq.${ownedSnapshot.job.id}`,
        },
        notify,
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analysis_job_events',
          filter: `job_id=eq.${ownedSnapshot.job.id}`,
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
  }, [analysisId, ownedSnapshot, refresh]);

  useEffect(() => {
    if (ownedSnapshot?.job.status === 'complete')
      router.push(`${resultPathPrefix}/${analysisId}`);
  }, [analysisId, ownedSnapshot?.job.status, resultPathPrefix, router]);

  const state = ownedSnapshot
    ? toAnalysisVisualState(ownedSnapshot)
    : 'validating';

  return (
    <AnalyzeProcessingVisual
      state={state}
      submittedUrl=""
      errorMessage={
        ownedSnapshot &&
        ['partial', 'failed'].includes(ownedSnapshot.job.status)
          ? 'Analysis stopped safely. Your completed work has been kept.'
          : undefined
      }
    />
  );
}
