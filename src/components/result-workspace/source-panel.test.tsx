import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';

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
  expect(screen.getByText(source.channel)).toBeVisible();
  expect(screen.getByText(source.duration)).toBeVisible();
  expect(screen.getByText(source.language)).toBeVisible();
  expect(screen.getByTitle(`Play ${source.title}`)).toBeInTheDocument();
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
