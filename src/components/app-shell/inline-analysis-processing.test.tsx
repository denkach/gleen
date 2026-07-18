import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

function partialSnapshot(revision = 1): AnalysisSnapshot {
  return {
    ...snapshot('partial', revision),
    artifacts: [
      {
        id: 'summary-artifact',
        analysisId,
        userId: 'user-1',
        kind: 'summary',
        status: 'ready',
        schemaVersion: 1,
        content: { title: 'Kept summary' },
        errorCode: null,
        generatedAt: '2026-07-17T00:00:00Z',
        updatedAt: '2026-07-17T00:00:00Z',
      },
      {
        id: 'timestamps-artifact',
        analysisId,
        userId: 'user-1',
        kind: 'timestamps',
        status: 'failed',
        schemaVersion: 1,
        content: null,
        errorCode: 'provider_failed',
        generatedAt: null,
        updatedAt: '2026-07-17T00:00:00Z',
      },
    ],
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

  test('keeps running inline then opens a completed result exactly once after copy and exit', async () => {
    vi.useFakeTimers();
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const refreshResult = deferred<AnalysisSnapshot | null>();
    const refreshAction = vi.fn(() => refreshResult.promise);
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
    expect(routerPush).not.toHaveBeenCalled();

    await act(async () => refreshResult.resolve(snapshot('complete', 2)));
    await act(async () => vi.advanceTimersByTimeAsync(399));
    expect(routerPush).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-exiting',
      'true',
    );
    await act(async () => vi.advanceTimersByTimeAsync(599));
    expect(routerPush).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith(`/app/video/${analysisId}`);
    await act(async () => vi.advanceTimersByTimeAsync(5_000));
    expect(routerPush).toHaveBeenCalledTimes(1);
  });

  test('removes the decorative completion delay for reduced motion', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
    render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={snapshot('complete')}
        refreshAction={vi.fn(async () => snapshot('complete'))}
        retryAction={vi.fn()}
      />,
    );
    await waitFor(() => expect(routerPush).toHaveBeenCalledTimes(1));
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

  test('ignores a retained realtime callback from the previous analysis generation', async () => {
    vi.useFakeTimers();
    const nextAnalysisId = '660e8400-e29b-41d4-a716-446655440000';
    const refreshAction = vi.fn(async (requestedAnalysisId: string) =>
      snapshot('running', 2, requestedAnalysisId),
    );
    const { rerender } = render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={snapshot('running', 1, analysisId)}
        refreshAction={refreshAction}
        retryAction={vi.fn()}
      />,
    );
    await act(async () => Promise.resolve());
    const previousNotify = realtime.channel.on.mock.calls.find(
      ([, options]) =>
        (options as { filter?: string }).filter ===
        `analysis_id=eq.${analysisId}`,
    )?.[2] as () => void;

    rerender(
      <InlineAnalysisProcessing
        analysisId={nextAnalysisId}
        refreshAction={refreshAction}
        retryAction={vi.fn()}
      />,
    );
    await act(async () => Promise.resolve());
    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'transcript',
    );

    await act(async () => {
      previousNotify();
      await Promise.resolve();
    });

    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'transcript',
    );
    expect(realtime.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'analysis_artifacts',
        filter: `analysis_id=eq.${nextAnalysisId}`,
      }),
      expect.any(Function),
    );
    const nextCallsBeforePolling = refreshAction.mock.calls.filter(
      ([requestedAnalysisId]) => requestedAnalysisId === nextAnalysisId,
    ).length;
    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(
      refreshAction.mock.calls.filter(
        ([requestedAnalysisId]) => requestedAnalysisId === nextAnalysisId,
      ),
    ).toHaveLength(nextCallsBeforePolling + 1);
  });

  test('keeps partial inline, exposes explicit choices, and retries once without clearing ready artifacts', async () => {
    const user = userEvent.setup();
    const retryAction = vi.fn();
    retryAction.mockResolvedValue({ ok: true, attempt: 2 });
    const refreshAction = vi
      .fn()
      .mockResolvedValueOnce(partialSnapshot())
      .mockResolvedValue(snapshot('running', 2));
    render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={partialSnapshot()}
        refreshAction={refreshAction}
        retryAction={retryAction}
      />,
    );

    expect(screen.getByText('SUMMARY').parentElement).toHaveTextContent(
      'ready',
    );
    expect(screen.getByText('TIMESTAMPS').parentElement).toHaveTextContent(
      'failed',
    );
    expect(
      screen.getByRole('button', { name: 'View available results' }),
    ).toBeVisible();
    const retry = screen.getByRole('button', { name: 'Retry failed artifact' });
    expect(routerPush).not.toHaveBeenCalled();
    await user.click(retry);
    expect(retryAction).toHaveBeenCalledTimes(1);
    const formData = retryAction.mock.calls[0]?.[0] as FormData;
    expect(formData.get('analysisId')).toBe(analysisId);
    expect(screen.getByText('SUMMARY').parentElement).toHaveTextContent(
      'ready',
    );
    await waitFor(() => expect(refreshAction).toHaveBeenCalledTimes(2));
    expect(
      screen.queryByRole('button', { name: 'View available results' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Retry failed artifact' }),
    ).toBeNull();
    expect(routerPush).not.toHaveBeenCalled();
  });

  test('keeps polling after retry when the immediate refresh is null until a running snapshot arrives', async () => {
    vi.useFakeTimers();
    const retryAction = vi.fn(async () => ({ ok: true, attempt: 2 }) as const);
    const refreshAction = vi
      .fn<() => Promise<AnalysisSnapshot | null>>()
      .mockResolvedValueOnce(partialSnapshot())
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(snapshot('running', 2));
    render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={partialSnapshot()}
        refreshAction={refreshAction}
        retryAction={retryAction}
      />,
    );
    await act(async () => Promise.resolve());

    await act(async () => {
      screen.getByRole('button', { name: 'Retry failed artifact' }).click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(refreshAction).toHaveBeenCalledTimes(2);
    expect(
      screen.queryByRole('button', { name: 'Retry failed artifact' }),
    ).toBeNull();

    await act(async () => vi.advanceTimersByTimeAsync(2_000));
    expect(refreshAction).toHaveBeenCalledTimes(3);
    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-state',
      'transcript',
    );
  });

  test('restores partial controls and reports a recoverable retry rejection', async () => {
    const retryAction = vi.fn(async () => {
      throw new Error('network unavailable');
    });
    render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={partialSnapshot()}
        refreshAction={vi.fn(async () => partialSnapshot())}
        retryAction={retryAction}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: 'Retry failed artifact' }),
    );

    expect(
      await screen.findByRole('button', { name: 'Retry failed artifact' }),
    ).toBeVisible();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Retry could not be started. Please try again.',
    );
  });

  test('opens available partial results only when explicitly requested', async () => {
    render(
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={partialSnapshot()}
        refreshAction={vi.fn(async () => partialSnapshot())}
        retryAction={vi.fn()}
      />,
    );
    expect(routerPush).not.toHaveBeenCalled();
    await userEvent.click(
      screen.getByRole('button', { name: 'View available results' }),
    );
    expect(routerPush).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith(`/app/video/${analysisId}`);
  });
});
