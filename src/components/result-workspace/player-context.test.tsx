import { act, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import * as playerContext from './player-context';
import type {
  VideoPlayerController,
  VideoPlayerSnapshot,
} from './player-controller';

test('exports a reactive video player selector hook', () => {
  expect(
    (playerContext as Record<string, unknown>).useVideoPlayerSnapshot,
  ).toBeTypeOf('function');
});

test('updates only controls whose selected player state changed', () => {
  let snapshot: VideoPlayerSnapshot = {
    status: 'ready',
    currentTimeMs: 370_000,
    durationMs: 900_000,
    playing: false,
    playbackRate: 1.25,
    availableRates: [0.5, 1, 1.25, 1.5],
    volume: 80,
    muted: false,
    captionsAvailable: true,
  };
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
  const renderCounts = { playing: 0, time: 0 };

  function PlayingControl() {
    renderCounts.playing += 1;
    const playing = playerContext.useVideoPlayerSnapshot(
      (value) => value.playing,
    );
    return <output data-testid="playing">{String(playing)}</output>;
  }

  function TimeControl() {
    renderCounts.time += 1;
    const time = playerContext.useVideoPlayerSnapshot(
      (value) => value.currentTimeMs,
    );
    return <output data-testid="time">{time}</output>;
  }

  render(
    <playerContext.PlayerProvider controller={controller}>
      <PlayingControl />
      <TimeControl />
    </playerContext.PlayerProvider>,
  );

  act(() => {
    snapshot = { ...snapshot, currentTimeMs: 371_000 };
    listeners.forEach((listener) => listener());
  });

  expect(screen.getByTestId('playing')).toHaveTextContent('false');
  expect(screen.getByTestId('time')).toHaveTextContent('371000');
  expect(renderCounts).toEqual({ playing: 1, time: 2 });
});
