import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { resultCopy } from '@/lib/result-workspace/copy';

import { PlayerProvider } from './player-context';
import type {
  VideoPlayerController,
  VideoPlayerSnapshot,
} from './player-controller';
import { SourcePanel } from './source-panel';

const snapshot = {
  status: 'ready' as const,
  currentTimeMs: 70_000,
  durationMs: 900_000,
  playing: false,
  playbackRate: 1,
  availableRates: [1],
  volume: 100,
  muted: false,
  captionsAvailable: false,
};

const controller: VideoPlayerController = {
  subscribe: () => () => undefined,
  getSnapshot: () => snapshot,
  getCurrentTimeMs: () => 70_000,
  seekTo: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  setPlaybackRate: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
  toggleCaptions: vi.fn(),
  requestFullscreen: vi.fn(async () => undefined),
};

test('marks the current chapter and chapter selection seeks then plays', () => {
  render(
    <PlayerProvider controller={controller}>
      <SourcePanel
        source={{
          videoId: 'dQw4w9WgXcQ',
          title: 'How light becomes reusable knowledge',
          channel: 'Gleen Studio',
          duration: '15:00',
          language: 'English',
          thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        }}
        copy={resultCopy.en}
        chapters={[
          { offsetMs: 0, title: 'Opening', description: 'Set the premise' },
          {
            offsetMs: 60_000,
            title: 'The prism',
            description: 'Split the source',
          },
          {
            offsetMs: 120_000,
            title: 'Reusable artifacts',
            description: 'Apply the insight',
          },
        ]}
      />
    </PlayerProvider>,
  );

  expect(screen.getByText('Current chapter')).toBeVisible();
  expect(screen.getAllByText('The prism')[0]).toBeVisible();
  expect(screen.getByRole('button', { name: /the prism/i })).toHaveAttribute(
    'aria-current',
    'true',
  );

  fireEvent.click(screen.getByRole('button', { name: /reusable artifacts/i }));
  expect(controller.seekTo).toHaveBeenCalledWith(120_000);
  expect(controller.play).toHaveBeenCalledOnce();
});

test('keeps chapters busy until the player becomes ready', () => {
  let loadingSnapshot: VideoPlayerSnapshot = {
    ...snapshot,
    status: 'loading',
  };
  const listeners = new Set<() => void>();
  const deferredController: VideoPlayerController = {
    ...controller,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    getSnapshot: () => loadingSnapshot,
    seekTo: vi.fn(),
    play: vi.fn(),
  };
  render(
    <PlayerProvider controller={deferredController}>
      <SourcePanel
        source={{
          videoId: 'dQw4w9WgXcQ',
          title: 'How light becomes reusable knowledge',
          channel: 'Gleen Studio',
          duration: '15:00',
          language: 'English',
          thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
        }}
        copy={resultCopy.en}
        chapters={[
          { offsetMs: 0, title: 'Opening', description: 'Set the premise' },
        ]}
      />
    </PlayerProvider>,
  );

  const chapter = screen.getByRole('button', { name: /opening/i });
  expect(chapter).toBeDisabled();
  expect(chapter).toHaveAttribute('aria-busy', 'true');

  loadingSnapshot = { ...snapshot, status: 'ready' };
  act(() => listeners.forEach((listener) => listener()));

  expect(chapter).toBeEnabled();
  expect(chapter).not.toHaveAttribute('aria-busy');
  fireEvent.click(chapter);
  expect(deferredController.seekTo).toHaveBeenCalledWith(0);
  expect(deferredController.play).toHaveBeenCalledOnce();
});
