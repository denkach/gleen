import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { expect, test, vi } from 'vitest';

import { resultCopy } from '@/lib/result-workspace/copy';

import { SourcePanel } from './source-panel';

const source = {
  videoId: 'dQw4w9WgXcQ',
  title: 'How light becomes reusable knowledge',
  channel: 'Gleen Studio',
  duration: '12:35',
  language: 'English',
  thumbnailUrl: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg',
};

test('renders the approved source metadata and accessible player', () => {
  render(<SourcePanel source={source} />);
  expect(screen.getByRole('heading', { name: source.title })).toBeVisible();
  expect(screen.getAllByText(source.channel)[0]).toBeVisible();
  expect(screen.getByText(source.duration)).toBeVisible();
  expect(screen.getByText(source.language)).toBeVisible();
  expect(screen.getByTitle(`Play ${source.title}`)).toBeInTheDocument();
});

test('renders the prototype source identity actions only when they are functional', () => {
  const onFavorite = vi.fn();
  const onShare = vi.fn();
  render(
    <SourcePanel
      source={source}
      favorite={false}
      onFavorite={onFavorite}
      onShare={onShare}
    />,
  );

  fireEvent.click(screen.getByRole('button', { name: 'Add to favorites' }));
  fireEvent.click(screen.getByRole('button', { name: 'Share result' }));
  expect(onFavorite).toHaveBeenCalledOnce();
  expect(onShare).toHaveBeenCalledOnce();
});

test('constructs one custom-controls iframe and restores the saved playback position', async () => {
  const seekTo = vi.fn();
  const playerOptions: Array<{ playerVars: { controls?: 0 | 1 } }> = [];
  Object.assign(window, {
    YT: {
      Player: vi.fn(function Player(
        element: HTMLElement,
        options: {
          playerVars: { controls?: 0 | 1 };
          events: { onReady(): void };
        },
      ) {
        playerOptions.push(options);
        const iframe = document.createElement('iframe');
        element.replaceWith(iframe);
        queueMicrotask(() => options.events.onReady());
        return {
          destroy: vi.fn(() => iframe.remove()),
          getCurrentTime: vi.fn(() => 0),
          getDuration: vi.fn(() => 755),
          getIframe: () => iframe,
          pauseVideo: vi.fn(),
          playVideo: vi.fn(),
          seekTo,
        };
      }),
    },
  });

  render(<SourcePanel source={source} initialPositionMs={42_000} />);

  await waitFor(() => expect(playerOptions).toHaveLength(1));
  expect(playerOptions[0]?.playerVars.controls).toBe(0);
  expect(document.querySelectorAll('iframe')).toHaveLength(1);
  expect(seekTo).toHaveBeenCalledWith(42, true);
});

test('falls back to the thumbnail when the embedded player reports a runtime failure', async () => {
  let reportError: (() => void) | undefined;
  Object.assign(window, {
    YT: {
      Player: vi.fn(function Player(
        element: HTMLElement,
        options: { events: { onError(): void } },
      ) {
        reportError = options.events.onError;
        const iframe = document.createElement('iframe');
        element.replaceWith(iframe);
        return {
          destroy: vi.fn(),
          getCurrentTime: vi.fn(() => 0),
          getIframe: () => iframe,
          pauseVideo: vi.fn(),
          playVideo: vi.fn(),
          seekTo: vi.fn(),
        };
      }),
    },
  });

  render(<SourcePanel source={source} />);
  await act(async () => {});
  act(() => reportError?.());

  expect(
    screen.getByRole('img', { name: `Thumbnail for ${source.title}` }),
  ).toBeVisible();
  expect(screen.getByText('Player unavailable')).toBeVisible();
});

test('falls back to the thumbnail when the player is unavailable and hides a broken thumbnail', () => {
  render(<SourcePanel source={source} playerAvailable={false} />);
  expect(screen.getByText('Player unavailable')).toBeVisible();
  const thumbnail = screen.getByRole('img', {
    name: `Thumbnail for ${source.title}`,
  });
  fireEvent.error(thumbnail);
  expect(thumbnail).not.toBeVisible();
  expect(screen.getByText('Video preview unavailable')).toBeVisible();
});

test('uses localized source, chapter, unavailable, and metadata wording', () => {
  render(
    <SourcePanel
      source={source}
      copy={resultCopy.de}
      playerAvailable={false}
      chapters={[{ offsetMs: 0, title: 'Start', description: 'Einführung' }]}
    />,
  );

  expect(screen.getByLabelText('Videoquelle')).toBeVisible();
  expect(screen.getByText('Player nicht verfügbar')).toBeVisible();
  expect(screen.getByText('1 Schlüsselmomente')).toBeVisible();
  expect(screen.getByText('Kanal')).toBeVisible();
  expect(screen.getByText('Dauer')).toBeVisible();
  expect(screen.getByText('Sprache')).toBeVisible();
});
