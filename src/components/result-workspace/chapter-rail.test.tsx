import { fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { resultCopy } from '@/lib/result-workspace/copy';

import { PlayerProvider } from './player-context';
import type { VideoPlayerController } from './player-controller';
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
