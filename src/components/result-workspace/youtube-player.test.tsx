import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { YouTubePlayer } from './youtube-player';

const player = {
  destroy: vi.fn(),
  getCurrentTime: vi.fn(() => 12.25),
  pauseVideo: vi.fn(),
  playVideo: vi.fn(),
  seekTo: vi.fn(),
};

function installYouTubeApi() {
  const Player = vi.fn(function Player(
    _element: HTMLElement,
    options: { events: { onReady(): void } },
  ) {
    queueMicrotask(() => options.events.onReady());
    return player;
  });
  Object.assign(window, { YT: { Player } });
  return Player;
}

describe('YouTubePlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    Reflect.deleteProperty(window, 'YT');
    Reflect.deleteProperty(window, 'onYouTubeIframeAPIReady');
    document
      .querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')
      .forEach((script) => script.remove());
  });

  afterEach(() => vi.useRealTimers());

  test('reuses an available API and exposes a millisecond controller', async () => {
    const Player = installYouTubeApi();
    const onReady = vi.fn();
    render(
      <YouTubePlayer
        videoId="dQw4w9WgXcQ"
        title="Source video"
        onReady={onReady}
      />,
    );

    await act(async () => {});
    const controller = onReady.mock.calls[0]?.[0];
    controller.seekTo(75_500);
    controller.play();
    controller.pause();

    expect(Player).toHaveBeenCalledOnce();
    expect(player.seekTo).toHaveBeenCalledWith(75.5, true);
    expect(player.playVideo).toHaveBeenCalledOnce();
    expect(player.pauseVideo).toHaveBeenCalledOnce();
    expect(controller.getCurrentTimeMs()).toBe(12_250);
  });

  test('loads the official API script and initializes after its callback', async () => {
    render(<YouTubePlayer videoId="dQw4w9WgXcQ" title="Source video" />);
    const script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    expect(script).toBeInTheDocument();

    const Player = installYouTubeApi();
    await act(async () => window.onYouTubeIframeAPIReady?.());
    expect(Player).toHaveBeenCalledOnce();
  });

  test('shows an unavailable fallback when the API script fails', async () => {
    render(<YouTubePlayer videoId="dQw4w9WgXcQ" title="Source video" />);
    const script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    await act(async () => script?.dispatchEvent(new Event('error')));
    expect(screen.getByText('Player unavailable')).toBeVisible();
  });

  test('polls current time while ready and clears polling and the player on cleanup', async () => {
    installYouTubeApi();
    const onTimeChange = vi.fn();
    const { unmount } = render(
      <YouTubePlayer
        videoId="dQw4w9WgXcQ"
        title="Source video"
        onTimeChange={onTimeChange}
      />,
    );
    await act(async () => {});
    act(() => vi.advanceTimersByTime(500));
    expect(onTimeChange).toHaveBeenCalledWith(12_250);

    unmount();
    expect(player.destroy).toHaveBeenCalledOnce();
    const calls = onTimeChange.mock.calls.length;
    act(() => vi.advanceTimersByTime(1_000));
    expect(onTimeChange).toHaveBeenCalledTimes(calls);
  });
});
