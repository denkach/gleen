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
}) => Promise<ResultMutationState>;

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
  initialPositionMs,
  savePlaybackPosition,
}: Readonly<{
  analysisId: string;
  initialPositionMs: number;
  savePlaybackPosition: SavePlaybackPosition;
}>) {
  playbackPersistence.usePlaybackPersistence({
    analysisId,
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
  });

  act(() => store.update({ currentTimeMs: 50_000 }));
  await act(async () => vi.advanceTimersByTime(5_000));
  expect(savePlaybackPosition).toHaveBeenLastCalledWith({
    analysisId: 'analysis-a',
    positionMs: 20_000,
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
  });

  act(() => store.update({ currentTimeMs: 14_000, playing: true }));
  await act(async () => window.dispatchEvent(new Event('pagehide')));
  expect(savePlaybackPosition).toHaveBeenLastCalledWith({
    analysisId: 'analysis-a',
    positionMs: 14_000,
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
  });
  expect(saveFirst).not.toHaveBeenCalled();
});
