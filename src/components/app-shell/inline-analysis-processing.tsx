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

function preserveReadyArtifacts(
  current: AnalysisSnapshot,
  incoming: AnalysisSnapshot,
): AnalysisSnapshot {
  const incomingKinds = new Set(
    incoming.artifacts.map((artifact) => artifact.kind),
  );
  const preserved = current.artifacts.filter(
    (artifact) =>
      artifact.status === 'ready' && !incomingKinds.has(artifact.kind),
  );
  return preserved.length
    ? { ...incoming, artifacts: [...incoming.artifacts, ...preserved] }
    : incoming;
}

export function InlineAnalysisProcessing({
  analysisId,
  initialSnapshot,
  refreshAction = refreshAnalysisSnapshot,
  retryAction = retryAnalysis,
  resultPathPrefix = '/app/video',
}: InlineAnalysisProcessingProps) {
  const router = useRouter();
  const push = router.push;
  const [snapshotState, setSnapshotState] = useState(() => ({
    analysisId,
    snapshot:
      initialSnapshot?.job.analysisId === analysisId
        ? initialSnapshot
        : undefined,
  }));
  const controllerGeneration = useRef(0);
  const navigationScheduledFor = useRef<string | null>(null);
  const [exitingAnalysisId, setExitingAnalysisId] = useState<string | null>(
    null,
  );
  const [retryingAnalysisId, setRetryingAnalysisId] = useState<string | null>(
    null,
  );
  const [reconciliation, setReconciliation] = useState<{
    analysisId: string;
    revision: number;
  } | null>(null);
  const [retryError, setRetryError] = useState<{
    analysisId: string;
    message: string;
  } | null>(null);
  const isExiting = exitingAnalysisId === analysisId;
  const isRetrying = retryingAnalysisId === analysisId;
  const isReconciling = reconciliation?.analysisId === analysisId;

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
      setReconciliation((current) =>
        current?.analysisId === requestedAnalysisId &&
        incoming.job.revision > current.revision
          ? null
          : current,
      );
      setSnapshotState((current) => {
        if (current.analysisId !== requestedAnalysisId)
          return { analysisId: requestedAnalysisId, snapshot: incoming };
        return {
          analysisId: requestedAnalysisId,
          snapshot: current.snapshot
            ? chooseNewestSnapshot(
                current.snapshot,
                preserveReadyArtifacts(current.snapshot, incoming),
              )
            : incoming,
        };
      });
    },
    [analysisId, refreshAction],
  );

  useEffect(() => {
    const generation = ++controllerGeneration.current;
    navigationScheduledFor.current = null;
    window.history.replaceState(null, '', `/app?analysis=${analysisId}`);
    void refresh(generation);
    return () => {
      if (controllerGeneration.current === generation)
        controllerGeneration.current += 1;
    };
  }, [analysisId, refresh]);

  useEffect(() => {
    if (!ownedSnapshot || (isTerminalAnalysis(ownedSnapshot) && !isReconciling))
      return;
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
  }, [analysisId, isReconciling, ownedSnapshot, refresh]);

  useEffect(() => {
    if (
      ownedSnapshot?.job.status !== 'complete' ||
      navigationScheduledFor.current === analysisId
    )
      return;
    navigationScheduledFor.current = analysisId;
    const reducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches;
    if (reducedMotion) {
      push(`${resultPathPrefix}/${analysisId}`);
      return;
    }
    const exitTimer = window.setTimeout(
      () => setExitingAnalysisId(analysisId),
      400,
    );
    const navigationTimer = window.setTimeout(
      () => push(`${resultPathPrefix}/${analysisId}`),
      1_000,
    );
    return () => {
      window.clearTimeout(exitTimer);
      window.clearTimeout(navigationTimer);
    };
  }, [analysisId, ownedSnapshot?.job.status, push, resultPathPrefix]);

  const resultPath = `${resultPathPrefix}/${analysisId}`;
  const isPartial = ownedSnapshot?.job.status === 'partial';
  const ownedRevision = ownedSnapshot?.job.revision;
  const retryFailed = useCallback(async () => {
    if (isRetrying) return;
    const generation = controllerGeneration.current;
    setRetryingAnalysisId(analysisId);
    setRetryError(null);
    const formData = new FormData();
    formData.set('analysisId', analysisId);
    try {
      const result = await retryAction(formData);
      if (controllerGeneration.current !== generation) return;
      if (!result.ok) {
        setRetryError({
          analysisId,
          message: 'Retry could not be started. Please try again.',
        });
        return;
      }
      setReconciliation({
        analysisId,
        revision: ownedRevision ?? -1,
      });
      await refresh(generation);
    } catch {
      if (controllerGeneration.current !== generation) return;
      setRetryError({
        analysisId,
        message: 'Retry could not be started. Please try again.',
      });
    } finally {
      setRetryingAnalysisId((current) =>
        current === analysisId ? null : current,
      );
    }
  }, [analysisId, isRetrying, ownedRevision, refresh, retryAction]);

  const artifactStates = Object.fromEntries(
    (ownedSnapshot?.artifacts ?? []).map(
      (artifact) =>
        [
          artifact.kind,
          artifact.status === 'pending' ? 'queued' : artifact.status,
        ] as const,
    ),
  );

  const state = ownedSnapshot
    ? toAnalysisVisualState(ownedSnapshot)
    : 'validating';

  return (
    <AnalyzeProcessingVisual
      state={state}
      isExiting={isExiting}
      submittedUrl=""
      errorMessage={
        retryError?.analysisId === analysisId
          ? retryError.message
          : ownedSnapshot &&
              ['partial', 'failed'].includes(ownedSnapshot.job.status)
            ? 'Analysis stopped safely. Your completed work has been kept.'
            : undefined
      }
      artifactStates={artifactStates}
      controls={
        isPartial && !isRetrying && !isReconciling ? (
          <>
            <button
              className="analyze-control"
              type="button"
              onClick={() => push(resultPath)}
            >
              View available results
            </button>
            <button
              className="analyze-control"
              type="button"
              onClick={retryFailed}
            >
              Retry failed artifact
            </button>
          </>
        ) : undefined
      }
    />
  );
}
