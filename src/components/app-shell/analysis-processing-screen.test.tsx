import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

const realtime = vi.hoisted(() => {
  const channel = { on: vi.fn(), subscribe: vi.fn() };
  channel.on.mockReturnValue(channel);
  channel.subscribe.mockReturnValue(channel);
  return { channel, create: vi.fn(() => channel), remove: vi.fn() };
});
const resultActions = vi.hoisted(() => ({
  saveArtifact: vi.fn(),
  saveFlashcardReview: vi.fn().mockResolvedValue({ status: 'saved' }),
  saveTitle: vi.fn(),
}));

vi.mock('@/lib/supabase/browser', () => ({
  createBrowserSupabaseClient: () => ({
    channel: realtime.create,
    removeChannel: realtime.remove,
  }),
}));
vi.mock('@/lib/result-workspace/actions', () => ({
  saveResultArtifact: resultActions.saveArtifact,
  saveFlashcardReview: resultActions.saveFlashcardReview,
  saveResultTitle: resultActions.saveTitle,
}));
vi.mock('@/components/result-workspace/result-workspace', () => ({
  ResultWorkspace: ({
    model,
    saveFlashcardReview,
  }: {
    model: { revision: number };
    saveFlashcardReview?: (input: unknown) => Promise<unknown>;
  }) => (
    <div data-testid="result-workspace">
      revision {model.revision}
      <button
        type="button"
        onClick={() =>
          void saveFlashcardReview?.({
            analysisId: intake.id,
            artifactRevision: 'revision-4',
            cardIndex: 0,
            rating: 'got_it',
          })
        }
      >
        Rate result
      </button>
    </div>
  ),
}));
vi.mock('@/lib/result-workspace/presentation', () => ({
  normalizeResultWorkspace: (_intake: unknown, value: AnalysisSnapshot) => ({
    revision: value.job.revision,
  }),
}));

import { AnalysisProcessingScreen } from './analysis-processing-screen';

const intake = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  userId: 'user-1',
  youtubeVideoId: 'video-1',
  canonicalUrl: 'https://youtube.com/watch?v=video-1',
  title: 'Durable analysis',
  channelTitle: 'Channel',
  durationSeconds: 60,
  thumbnailUrl: 'https://example.com/thumb.jpg',
  transcriptLanguage: 'en',
  transcriptSegments: [],
  configuration: {
    outputLocale: 'en',
    summaryPreset: 'balanced',
    flashcardPreset: null,
    artifacts: ['summary', 'flashcards'],
    analysisContractVersion: 1,
  },
  duplicateKey: 'a'.repeat(64),
  attempt: 1,
  status: 'ready',
  reanalysisOf: null,
  createdAt: '2026-07-17T00:00:00Z',
} satisfies AnalysisIntake;

function snapshot(
  status: AnalysisSnapshot['job']['status'] = 'running',
  revision = 2,
): AnalysisSnapshot {
  return {
    job: {
      id: 'job-1',
      analysisId: intake.id,
      userId: 'user-1',
      workflowRunId: null,
      status,
      stage: status === 'complete' ? 'complete' : 'artifacts',
      attempt: 1,
      revision,
      errorCode: status === 'failed' ? 'safe_failure' : null,
      startedAt: null,
      completedAt: null,
      createdAt: '2026-07-17T00:00:00Z',
      updatedAt: '2026-07-17T00:00:00Z',
    },
    events: [],
    artifacts:
      status === 'partial'
        ? [
            {
              id: 'summary-1',
              analysisId: intake.id,
              userId: 'user-1',
              kind: 'summary',
              status: 'ready',
              schemaVersion: 1,
              content: { text: 'kept' },
              errorCode: null,
              generatedAt: '2026-07-17T00:00:00Z',
              updatedAt: '2026-07-17T00:00:00Z',
            },
            {
              id: 'flashcards-1',
              analysisId: intake.id,
              userId: 'user-1',
              kind: 'flashcards',
              status: 'failed',
              schemaVersion: 1,
              content: null,
              errorCode: 'generation_failed',
              generatedAt: null,
              updatedAt: '2026-07-17T00:00:00Z',
            },
          ]
        : [],
    usageReservation: {
      id: 'reservation-1',
      jobId: 'job-1',
      userId: 'user-1',
      status: 'reserved',
      updatedAt: '2026-07-17T00:00:00Z',
    },
  };
}

describe('AnalysisProcessingScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: false })),
    );
  });
  afterEach(() => vi.useRealTimers());

  test('retains ready partial artifacts and submits retry only once while pending', async () => {
    let resolveRetry!: (result: { ok: true; attempt: number }) => void;
    const retryAction = vi.fn(
      () =>
        new Promise<{ ok: true; attempt: number }>((resolve) => {
          resolveRetry = resolve;
        }),
    );
    render(
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={snapshot('partial')}
        retryAction={retryAction}
        refreshAction={vi.fn(async () => snapshot('running', 3))}
      />,
    );

    expect(screen.getByText('Summary ready')).toBeVisible();
    expect(screen.getByText('Flashcards needs retry')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled();
    expect(retryAction).toHaveBeenCalledOnce();
    resolveRetry({ ok: true, attempt: 2 });
    await waitFor(() =>
      expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
        'data-analysis-state',
        'artifacts',
      ),
    );
  });

  test('scopes realtime notifications, refetches the snapshot, and cleans up', async () => {
    const refreshAction = vi.fn(async () => snapshot('running', 3));
    const { unmount } = render(
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={snapshot()}
        retryAction={vi.fn()}
        refreshAction={refreshAction}
      />,
    );
    expect(realtime.channel.on).toHaveBeenCalledTimes(3);
    expect(realtime.channel.on).toHaveBeenCalledWith(
      'postgres_changes',
      expect.objectContaining({
        table: 'analysis_jobs',
        filter: 'id=eq.job-1',
      }),
      expect.any(Function),
    );
    const notify = realtime.channel.on.mock.calls[0]?.[2] as () => void;
    notify();
    await waitFor(() => expect(refreshAction).toHaveBeenCalledWith(intake.id));
    unmount();
    expect(realtime.remove).toHaveBeenCalledWith(realtime.channel);
  });

  test('refetches once after subscribing so a change during connection is not missed', async () => {
    const refreshAction = vi.fn(async () => snapshot('complete', 4));
    render(
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={snapshot('running', 2)}
        retryAction={vi.fn()}
        refreshAction={refreshAction}
      />,
    );

    const onStatus = realtime.channel.subscribe.mock.calls[0]?.[0] as (
      status: string,
    ) => void;
    onStatus('SUBSCRIBED');

    await waitFor(() => expect(refreshAction).toHaveBeenCalledWith(intake.id));
  });

  test('keeps reconciliation polling active while realtime is subscribed', async () => {
    vi.useFakeTimers();
    const refreshAction = vi.fn(async () => snapshot('running', 3));
    render(
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={snapshot('running', 2)}
        retryAction={vi.fn()}
        refreshAction={refreshAction}
      />,
    );

    const onStatus = realtime.channel.subscribe.mock.calls[0]?.[0] as (
      status: string,
    ) => void;
    onStatus('SUBSCRIBED');
    await vi.advanceTimersByTimeAsync(3_000);

    expect(refreshAction).toHaveBeenCalledTimes(2);
  });

  test('shows an already complete server snapshot without decorative delay', () => {
    render(
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={snapshot('complete')}
        retryAction={vi.fn()}
        refreshAction={vi.fn()}
      />,
    );
    expect(screen.getByTestId('result-workspace')).toHaveTextContent(
      'revision 2',
    );
    expect(realtime.create).not.toHaveBeenCalled();
  });

  test('hands live completion to the newest workspace after the restrained exit', async () => {
    vi.useFakeTimers();
    const refreshAction = vi.fn(async () => snapshot('complete', 4));
    render(
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={snapshot('running', 2)}
        retryAction={vi.fn()}
        refreshAction={refreshAction}
      />,
    );
    const onStatus = realtime.channel.subscribe.mock.calls[0]?.[0] as (
      status: string,
    ) => void;
    await act(async () => onStatus('SUBSCRIBED'));
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(screen.getByTestId('result-workspace')).toHaveTextContent(
      'revision 4',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rate result' }));
    expect(resultActions.saveFlashcardReview).toHaveBeenCalledWith({
      analysisId: intake.id,
      artifactRevision: 'revision-4',
      cardIndex: 0,
      rating: 'got_it',
    });
  });

  test('hands a live partial snapshot with usable artifacts to the workspace without reload', async () => {
    vi.useFakeTimers();
    const refreshAction = vi.fn(async () => snapshot('partial', 4));
    render(
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={snapshot('running', 2)}
        retryAction={vi.fn()}
        refreshAction={refreshAction}
      />,
    );

    const onStatus = realtime.channel.subscribe.mock.calls[0]?.[0] as (
      status: string,
    ) => void;
    await act(async () => onStatus('SUBSCRIBED'));

    expect(screen.getByTestId('analyze-processing-visual')).toHaveAttribute(
      'data-analysis-exiting',
      'true',
    );
    await act(async () => vi.advanceTimersByTimeAsync(500));
    expect(screen.getByTestId('result-workspace')).toHaveTextContent(
      'revision 4',
    );
    expect(screen.getByRole('button', { name: 'Try again' })).toBeVisible();
    expect(screen.getByText('Flashcards needs retry')).toBeVisible();
  });

  test('hands live partial results over immediately with reduced motion', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    const refreshAction = vi.fn(async () => snapshot('partial', 4));
    render(
      <AnalysisProcessingScreen
        intake={intake}
        initialSnapshot={snapshot('running', 2)}
        retryAction={vi.fn()}
        refreshAction={refreshAction}
      />,
    );
    const onStatus = realtime.channel.subscribe.mock.calls[0]?.[0] as (
      status: string,
    ) => void;
    await act(async () => onStatus('SUBSCRIBED'));
    await act(async () => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByTestId('result-workspace')).toBeVisible();
  });
});
