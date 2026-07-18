import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

import { resultCopy } from '@/lib/result-workspace/copy';

import { PlayerProvider } from './player-context';
import type {
  VideoPlayerController,
  VideoPlayerSnapshot,
} from './player-controller';
import { SourcePanel } from './source-panel';

const source = {
  videoId: 'dQw4w9WgXcQ',
  title: 'How light becomes reusable knowledge',
  channel: 'Gleen Studio',
  duration: '15:00',
  language: 'English',
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
};

let snapshot: VideoPlayerSnapshot;
let listeners: Set<() => void>;
let controller: VideoPlayerController;

beforeEach(() => {
  snapshot = {
    status: 'ready',
    currentTimeMs: 60_000,
    durationMs: 900_000,
    playing: false,
    playbackRate: 1.25,
    availableRates: [0.5, 1, 1.25, 1.5, 2],
    volume: 64,
    muted: false,
    captionsAvailable: false,
  };
  listeners = new Set();
  controller = {
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
});

test('exposes the prototype player controls through native semantic inputs', () => {
  render(
    <PlayerProvider controller={controller}>
      <SourcePanel source={source} copy={resultCopy.en} chapters={[]} />
    </PlayerProvider>,
  );

  const playButtons = screen.getAllByRole('button', { name: 'Play' });
  expect(playButtons).toHaveLength(2);
  fireEvent.click(playButtons[1]);
  expect(controller.play).toHaveBeenCalledOnce();

  fireEvent.click(screen.getByRole('button', { name: 'Back 10 seconds' }));
  expect(controller.seekTo).toHaveBeenCalledWith(50_000);
  fireEvent.click(screen.getByRole('button', { name: 'Forward 10 seconds' }));
  expect(controller.seekTo).toHaveBeenCalledWith(70_000);

  const seek = screen.getByRole('slider', { name: 'Video progress' });
  expect(seek).toHaveAttribute('min', '0');
  expect(seek).toHaveAttribute('max', '900000');
  fireEvent.change(seek, { target: { value: '225000' } });
  expect(controller.seekTo).toHaveBeenCalledWith(225_000);

  const speed = screen.getByRole('combobox', { name: 'Playback speed' });
  expect(speed).toHaveValue('1.25');
  expect(
    Array.from(speed.querySelectorAll('option'), (option) => option.value),
  ).toEqual(['0.5', '1', '1.25', '1.5', '2']);
  fireEvent.change(speed, { target: { value: '1.5' } });
  expect(controller.setPlaybackRate).toHaveBeenCalledWith(1.5);

  fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), {
    target: { value: '35' },
  });
  expect(controller.setVolume).toHaveBeenCalledWith(35);
  fireEvent.click(screen.getByRole('button', { name: 'Mute' }));
  expect(controller.toggleMute).toHaveBeenCalledOnce();

  expect(
    screen.getByRole('button', { name: 'Captions are unavailable' }),
  ).toBeDisabled();
  fireEvent.click(screen.getByRole('button', { name: 'Enter full screen' }));
  expect(controller.requestFullscreen).toHaveBeenCalledOnce();
});

test('reflects reactive play, mute, and time state without inventing rates', () => {
  render(
    <PlayerProvider controller={controller}>
      <SourcePanel source={source} copy={resultCopy.en} chapters={[]} />
    </PlayerProvider>,
  );

  snapshot = {
    ...snapshot,
    currentTimeMs: 130_000,
    playing: true,
    muted: true,
    availableRates: [1, 1.5],
  };
  act(() => listeners.forEach((listener) => listener()));

  expect(screen.getAllByRole('button', { name: 'Pause' })).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Unmute' })).toBeVisible();
  expect(screen.getByText('02:10 / 15:00')).toBeVisible();
  expect(
    Array.from(
      screen
        .getByRole('combobox', { name: 'Playback speed' })
        .querySelectorAll('option'),
      (option) => option.value,
    ),
  ).toEqual(['1', '1.5']);
});
