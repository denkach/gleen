import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';

const realtime = vi.hoisted(() => {
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return { channel, create: vi.fn(() => channel), remove: vi.fn() };
});
const routerPush = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserSupabaseClient: () => ({
    channel: realtime.create,
    removeChannel: realtime.remove,
  }),
}));

import { InlineAnalysisProcessing } from './inline-analysis-processing';

const analysisId = '550e8400-e29b-41d4-a716-446655440000';

function snapshot(
  status: AnalysisSnapshot['job']['status'] = 'running',
  revision = 1,
  ownedAnalysisId = analysisId,
): AnalysisSnapshot {
  return {
    job: {
      id: `job-${ownedAnalysisId}`,
      analysisId: ownedAnalysisId,
      userId: 'user-1',
      workflowRunId: null,
      status,
      stage: status === 'complete' ? 'complete' : 'transcript',
      attempt: 1,
      revision,
      errorCode: status === 'failed' ? 'safe_failure' : null,
      startedAt: null,
      completedAt: null,
      createdAt: '2026-07-17T00:00:00Z',
      updatedAt: '2026-07-17T00:00:00Z',
    },
    events: [],
    artifacts: [],
    usageReservation: {
      id: 'reservation-1',
      jobId: 'job-1',
      userId: 'user-1',
      status: 'reserved',
      updatedAt: '2026-07-17T00:00:00Z',
    },
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((settle) => {
    resolve = settle;
  });
  return { promise, resolve };
}

describe('InlineAnalysisProcessing', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test('refreshes immediately, renders one spectrum, and keeps polling every two seconds', async () => {
    vi.useFakeTimers();
    const refreshAction = vi.fn(async () => snapshot('running', 2));
    render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={snapshot('queued')}
        refreshAction={refreshAction}
        retryAction={vi.fn()}
      />,
    );

    await act(async () => Promise.resolve());
    expect(refreshAction).toHaveBeenCalledWith(analysisId);
    expect(screen.getAllByTestId('analyze-processing-visual')).toHaveLength(1);
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(refreshAction).toHaveBeenCalledTimes(2);
  });

  test('subscribes to the owned records, reconciles realtime, and cleans up', async () => {
    const refreshAction = vi.fn(async () => snapshot('running', 2));
    const { unmount } = render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={snapshot()}
        refreshAction={refreshAction}
        retryAction={vi.fn()}
      />,
    );

    expect(realtime.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'analysis_jobs',
        filter: `id=eq.job-${analysisId}`,
      }),
      expect.any(Function),
    );
    expect(realtime.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'analysis_artifacts',
        filter: `analysis_id=eq.${analysisId}`,
      }),
      expect.any(Function),
    );
    const notify = realtime.channel.on.mock.calls[0]?.[2] as () => void;
    notify();
    await waitFor(() => expect(refreshAction).toHaveBeenCalledTimes(2));
    unmount();
    expect(realtime.remove).toHaveBeenCalledWith(realtime.channel);
  });

  test('replaces reload identity and opens only a completed result', async () => {
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const refreshAction = vi.fn(async () => snapshot('complete', 2));
    render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={snapshot('queued')}
        refreshAction={refreshAction}
        retryAction={vi.fn()}
        resultPathPrefix="/app/video"
      />,
    );

    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      `/app?analysis=${analysisId}`,
    );
    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith(`/app/video/${analysisId}`),
    );
  });

  test('ignores a previous analysis refresh that resolves after the identity switches', async () => {
    const nextAnalysisId = '660e8400-e29b-41d4-a716-446655440000';
    const firstRefresh = deferred<AnalysisSnapshot | null>();
    const refreshAction = vi.fn((requestedAnalysisId: string) =>
      requestedAnalysisId === analysisId
        ? firstRefresh.promise
        : Promise.resolve(snapshot('running', 1, nextAnalysisId)),
    );
    const { rerender } = render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={snapshot('running', 5)}
        refreshAction={refreshAction}
        retryAction={vi.fn()}
      />,
    );

    rerender(
      <InlineAnalysisProcessing
        analysisId={nextAnalysisId}
        refreshAction={refreshAction}
        retryAction={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(refreshAction).toHaveBeenCalledWith(nextAnalysisId),
    );

    await act(async () =>
      firstRefresh.resolve(snapshot('complete', 99, analysisId)),
    );

    expect(routerPush).not.toHaveBeenCalled();
    expect(realtime.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'analysis_jobs',
        filter: `id=eq.job-${nextAnalysisId}`,
      }),
      expect.any(Function),
    );
  });

  test.each(['partial', 'failed'] as const)(
    'keeps %s terminal state inline without exposing retry controls',
    async (status) => {
      const retryAction = vi.fn();
      render(
        <InlineAnalysisProcessing
          analysisId={analysisId}
          initialSnapshot={snapshot(status)}
          refreshAction={vi.fn(async () => snapshot(status))}
          retryAction={retryAction}
        />,
      );

      expect(screen.queryByRole('button', { name: 'Try again' })).toBeNull();
      expect(retryAction).not.toHaveBeenCalled();
      expect(routerPush).not.toHaveBeenCalled();
    },
  );
});
