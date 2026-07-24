import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

import type { ResultMutationState } from '@/lib/result-workspace/actions';

import * as playbackPersistence from './use-playback-persistence';
import { PlayerProvider } from './player-context';
import type {
  VideoPlayerController,
  VideoPlayerSnapshot,
} from './player-controller';

test('exports playback persistence for the shared controller', () => {
  expect(
    (playbackPersistence as Record<string, unknown>).usePlaybackPersistence,
  ).toBeTypeOf('function');
});

type SavePlaybackPosition = (input: {
  analysisId: string;
  positionMs: number;
  revision: number;
}) => Promise<ResultMutationState>;

type FlushPlaybackPosition = (input: {
  analysisId: string;
  positionMs: number;
  revision: number;
}) => void;

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function createController(initial: VideoPlayerSnapshot) {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  const controller: VideoPlayerController = {
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => snapshot,
    getCurrentTimeMs: () => snapshot.currentTimeMs,
    seekTo: vi.fn(),
    play: vi.fn(),
    pause: vi.fn(),
    setPlaybackRate: vi.fn(),
    setVolume: vi.fn(),
    toggleMute: vi.fn(),
    toggleCaptions: vi.fn(),
    requestFullscreen: vi.fn(async () => undefined),
  };
  return {
    controller,
    update(next: Partial<VideoPlayerSnapshot>) {
      snapshot = { ...snapshot, ...next };
      listeners.forEach((listener) => listener());
    },
  };
}

function Harness({
  analysisId,
  flushPlaybackPosition,
  initialPositionMs,
  savePlaybackPosition,
}: Readonly<{
  analysisId: string;
  flushPlaybackPosition?: FlushPlaybackPosition;
  initialPositionMs: number;
  savePlaybackPosition: SavePlaybackPosition;
}>) {
  playbackPersistence.usePlaybackPersistence({
    analysisId,
    flushPlaybackPosition,
    initialPositionMs,
    savePlaybackPosition,
  });
  return null;
}

const readySnapshot: VideoPlayerSnapshot = {
  status: 'ready',
  currentTimeMs: 10_000,
  durationMs: 20_000,
  playing: true,
  playbackRate: 1,
  availableRates: [1],
  volume: 100,
  muted: false,
  captionsAvailable: false,
};

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

test('throttles significant positions and clamps them to duration', async () => {
  const store = createController(readySnapshot);
  const savePlaybackPosition = vi.fn(async () => ({
    status: 'saved' as const,
  }));
  render(
    <PlayerProvider controller={store.controller}>
      <Harness
        analysisId="analysis-a"
        initialPositionMs={10_000}
        savePlaybackPosition={savePlaybackPosition}
      />
    </PlayerProvider>,
  );

  act(() => store.update({ currentTimeMs: 10_500 }));
  act(() => vi.advanceTimersByTime(5_000));
  expect(savePlaybackPosition).not.toHaveBeenCalled();

  act(() => store.update({ currentTimeMs: 12_000 }));
  act(() => vi.advanceTimersByTime(4_999));
  expect(savePlaybackPosition).not.toHaveBeenCalled();
  await act(async () => vi.advanceTimersByTime(1));
  expect(savePlaybackPosition).toHaveBeenLastCalledWith({
    analysisId: 'analysis-a',
    positionMs: 12_000,
    revision: expect.any(Number),
  });

  act(() => store.update({ currentTimeMs: 50_000 }));
  await act(async () => vi.advanceTimersByTime(5_000));
  expect(savePlaybackPosition).toHaveBeenLastCalledWith({
    analysisId: 'analysis-a',
    positionMs: 20_000,
    revision: expect.any(Number),
  });
  expect(savePlaybackPosition).toHaveBeenCalledTimes(2);
});

test('flushes on pause and pagehide without surfacing save errors', async () => {
  const store = createController(readySnapshot);
  const savePlaybackPosition = vi.fn(async () => {
    throw new Error('storage unavailable');
  });
  render(
    <PlayerProvider controller={store.controller}>
      <Harness
        analysisId="analysis-a"
        initialPositionMs={10_000}
        savePlaybackPosition={savePlaybackPosition}
      />
    </PlayerProvider>,
  );

  await act(async () =>
    store.update({ currentTimeMs: 12_000, playing: false }),
  );
  expect(savePlaybackPosition).toHaveBeenLastCalledWith({
    analysisId: 'analysis-a',
    positionMs: 12_000,
    revision: expect.any(Number),
  });

  act(() => store.update({ currentTimeMs: 14_000, playing: true }));
  await act(async () => window.dispatchEvent(new Event('pagehide')));
  expect(savePlaybackPosition).toHaveBeenLastCalledWith({
    analysisId: 'analysis-a',
    positionMs: 14_000,
    revision: expect.any(Number),
  });
  expect(savePlaybackPosition).toHaveBeenCalledTimes(2);
});

test('does not leak old analysis timers or callbacks across remounts', async () => {
  const first = createController(readySnapshot);
  const second = createController({ ...readySnapshot, currentTimeMs: 3_000 });
  const saveFirst = vi.fn(async () => ({ status: 'saved' as const }));
  const saveSecond = vi.fn(async () => ({ status: 'saved' as const }));
  const { rerender } = render(
    <PlayerProvider controller={first.controller}>
      <Harness
        analysisId="analysis-a"
        initialPositionMs={10_000}
        savePlaybackPosition={saveFirst}
      />
    </PlayerProvider>,
  );
  act(() => first.update({ currentTimeMs: 12_000 }));

  rerender(
    <PlayerProvider controller={second.controller}>
      <Harness
        analysisId="analysis-b"
        initialPositionMs={3_000}
        savePlaybackPosition={saveSecond}
      />
    </PlayerProvider>,
  );
  await act(async () => vi.advanceTimersByTime(5_000));
  expect(saveFirst).not.toHaveBeenCalled();

  act(() => second.update({ currentTimeMs: 5_000 }));
  await act(async () => window.dispatchEvent(new Event('pagehide')));
  expect(saveSecond).toHaveBeenCalledExactlyOnceWith({
    analysisId: 'analysis-b',
    positionMs: 5_000,
    revision: expect.any(Number),
  });
  expect(saveFirst).not.toHaveBeenCalled();
});

test('serializes a regular save before the newest forced position', async () => {
  const store = createController(readySnapshot);
  const first = deferred<ResultMutationState>();
  const second = deferred<ResultMutationState>();
  const savePlaybackPosition = vi
    .fn<SavePlaybackPosition>()
    .mockReturnValueOnce(first.promise)
    .mockReturnValueOnce(second.promise);
  render(
    <PlayerProvider controller={store.controller}>
      <Harness
        analysisId="analysis-a"
        initialPositionMs={10_000}
        savePlaybackPosition={savePlaybackPosition}
      />
    </PlayerProvider>,
  );

  act(() => store.update({ currentTimeMs: 12_000 }));
  await act(async () => vi.advanceTimersByTime(5_000));
  expect(savePlaybackPosition).toHaveBeenCalledExactlyOnceWith({
    analysisId: 'analysis-a',
    positionMs: 12_000,
    revision: expect.any(Number),
  });

  act(() => store.update({ currentTimeMs: 16_000, playing: false }));
  expect(savePlaybackPosition).toHaveBeenCalledTimes(1);

  await act(async () => first.resolve({ status: 'saved' }));
  expect(savePlaybackPosition).toHaveBeenCalledTimes(2);
  expect(savePlaybackPosition).toHaveBeenLastCalledWith({
    analysisId: 'analysis-a',
    positionMs: 16_000,
    revision: expect.any(Number),
  });
  await act(async () => second.resolve({ status: 'saved' }));
});

test('initiates the newest pagehide transport while a regular save is unresolved', async () => {
  const store = createController(readySnapshot);
  const unresolved = deferred<ResultMutationState>();
  const savePlaybackPosition = vi.fn<SavePlaybackPosition>(
    () => unresolved.promise,
  );
  const flushPlaybackPosition = vi.fn<FlushPlaybackPosition>();
  render(
    <PlayerProvider controller={store.controller}>
      <Harness
        analysisId="analysis-a"
        flushPlaybackPosition={flushPlaybackPosition}
        initialPositionMs={10_000}
        savePlaybackPosition={savePlaybackPosition}
      />
    </PlayerProvider>,
  );

  act(() => store.update({ currentTimeMs: 12_000 }));
  await act(async () => vi.advanceTimersByTime(5_000));
  const regularRevision = savePlaybackPosition.mock.calls[0]?.[0].revision;
  expect(savePlaybackPosition).toHaveBeenCalledOnce();

  act(() => store.update({ currentTimeMs: 16_000 }));
  act(() => window.dispatchEvent(new Event('pagehide')));

  expect(flushPlaybackPosition).toHaveBeenCalledExactlyOnceWith({
    analysisId: 'analysis-a',
    positionMs: 16_000,
    revision: expect.any(Number),
  });
  expect(flushPlaybackPosition.mock.calls[0]?.[0].revision).toBeGreaterThan(
    regularRevision,
  );
  expect(savePlaybackPosition).toHaveBeenCalledOnce();

  await act(async () => unresolved.resolve({ status: 'saved' }));
});

test('retries the same position after every unsaved mutation outcome', async () => {
  const store = createController(readySnapshot);
  const savePlaybackPosition = vi
    .fn<SavePlaybackPosition>()
    .mockResolvedValueOnce({ status: 'error' })
    .mockResolvedValueOnce({ status: 'conflict' })
    .mockRejectedValueOnce(new Error('rejected'))
    .mockImplementationOnce(() => {
      throw new Error('thrown');
    })
    .mockResolvedValueOnce({ status: 'saved' });
  render(
    <PlayerProvider controller={store.controller}>
      <Harness
        analysisId="analysis-a"
        initialPositionMs={10_000}
        savePlaybackPosition={savePlaybackPosition}
      />
    </PlayerProvider>,
  );

  await act(async () =>
    store.update({ currentTimeMs: 12_000, playing: false }),
  );
  for (let expectedCalls = 2; expectedCalls <= 5; expectedCalls += 1) {
    await act(async () => window.dispatchEvent(new Event('pagehide')));
    expect(savePlaybackPosition).toHaveBeenCalledTimes(expectedCalls);
  }
  expect(savePlaybackPosition).toHaveBeenLastCalledWith({
    analysisId: 'analysis-a',
    positionMs: 12_000,
    revision: expect.any(Number),
  });
});

test('ignores stale in-flight completion after the analysis lifecycle changes', async () => {
  const firstStore = createController(readySnapshot);
  const secondStore = createController({
    ...readySnapshot,
    currentTimeMs: 3_000,
  });
  const staleRequest = deferred<ResultMutationState>();
  const saveFirst = vi.fn<SavePlaybackPosition>(() => staleRequest.promise);
  const saveSecond = vi.fn<SavePlaybackPosition>(async () => ({
    status: 'saved',
  }));
  const { rerender } = render(
    <PlayerProvider controller={firstStore.controller}>
      <Harness
        analysisId="analysis-a"
        initialPositionMs={10_000}
        savePlaybackPosition={saveFirst}
      />
    </PlayerProvider>,
  );
  act(() => firstStore.update({ currentTimeMs: 12_000 }));
  await act(async () => vi.advanceTimersByTime(5_000));
  act(() => firstStore.update({ currentTimeMs: 14_000, playing: false }));

  rerender(
    <PlayerProvider controller={secondStore.controller}>
      <Harness
        analysisId="analysis-b"
        initialPositionMs={3_000}
        savePlaybackPosition={saveSecond}
      />
    </PlayerProvider>,
  );
  await act(async () =>
    secondStore.update({ currentTimeMs: 5_000, playing: false }),
  );
  expect(saveSecond).toHaveBeenCalledOnce();

  await act(async () => staleRequest.resolve({ status: 'saved' }));
  expect(saveFirst).toHaveBeenCalledOnce();
  expect(saveSecond).toHaveBeenCalledOnce();
});
