import { act, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { PlayerProvider, useVideoPlayerSnapshot } from './player-context';
import type { VideoPlayerController } from './player-controller';
import { YouTubePlayer } from './youtube-player';

const iframe = document.createElement('iframe');
let currentTime = 12.25;
let duration = 900;
let playbackRate = 1.25;
let volume = 80;
let muted = false;
const player = {
  destroy: vi.fn(),
  getIframe: vi.fn(() => iframe),
  getCurrentTime: vi.fn(() => currentTime),
  getDuration: vi.fn(() => duration),
  getPlaybackRate: vi.fn(() => playbackRate),
  getAvailablePlaybackRates: vi.fn(() => [0.5, 1, 1.25, 1.5, 2]),
  getVolume: vi.fn(() => volume),
  isMuted: vi.fn(() => muted),
  getOptions: vi.fn(() => ['captions']),
  getOption: vi.fn(() => ({ languageCode: 'en' })),
  setOption: vi.fn(),
  pauseVideo: vi.fn(),
  playVideo: vi.fn(),
  seekTo: vi.fn(),
  setPlaybackRate: vi.fn(),
  setVolume: vi.fn(),
  mute: vi.fn(),
  unMute: vi.fn(),
};

function installYouTubeApi({
  ready = true,
  instance = player,
}: {
  ready?: boolean;
  instance?: object;
} = {}) {
  const Player = vi.fn(function Player(
    _element: HTMLElement,
    options: {
      playerVars: { controls?: 0 | 1 };
      events: {
        onReady(): void;
        onError(): void;
        onStateChange(event: { data: number }): void;
      };
    },
  ) {
    if (ready) queueMicrotask(() => options.events.onReady());
    return instance;
  });
  Object.assign(window, { YT: { Player } });
  return Player;
}

describe('YouTubePlayer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    currentTime = 12.25;
    duration = 900;
    playbackRate = 1.25;
    volume = 80;
    muted = false;
    iframe.removeAttribute('title');
    Reflect.deleteProperty(window, 'YT');
    Reflect.deleteProperty(window, 'onYouTubeIframeAPIReady');
    document
      .querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')
      .forEach((script) => script.remove());
  });

  afterEach(async () => {
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      ),
    );
    await act(async () =>
      scripts.forEach((script) => script.dispatchEvent(new Event('error'))),
    );
    vi.useRealTimers();
  });

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
    expect(Player.mock.calls[0]?.[1].playerVars.controls).toBe(1);
    expect(player.seekTo).toHaveBeenCalledWith(75.5, true);
    expect(player.playVideo).toHaveBeenCalledOnce();
    expect(player.pauseVideo).toHaveBeenCalledOnce();
    expect(controller.getCurrentTimeMs()).toBe(12_250);
    expect(player.getIframe()).toHaveAttribute('title', 'Play Source video');
  });

  test('synchronizes a reactive snapshot and clamps supported commands', async () => {
    currentTime = 370;
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
    const controller = onReady.mock.calls[0]?.[0] as VideoPlayerController;
    expect(controller.getSnapshot()).toMatchObject({
      status: 'ready',
      currentTimeMs: 370_000,
      durationMs: 900_000,
      playing: false,
      playbackRate: 1.25,
      availableRates: [0.5, 1, 1.25, 1.5, 2],
      volume: 80,
      muted: false,
      captionsAvailable: false,
    });

    const events = Player.mock.calls[0]?.[1].events;
    act(() => events.onStateChange?.({ data: 1 }));
    expect(controller.getSnapshot().playing).toBe(true);

    controller.seekTo(999_000);
    controller.setPlaybackRate(1.4);
    controller.setVolume(120);
    controller.toggleMute();
    controller.toggleCaptions();

    expect(player.seekTo).toHaveBeenCalledWith(900, true);
    expect(player.setPlaybackRate).toHaveBeenCalledWith(1.5);
    expect(player.setVolume).toHaveBeenCalledWith(100);
    expect(player.mute).toHaveBeenCalledOnce();
    expect(player.setOption).not.toHaveBeenCalled();

    currentTime = 420;
    duration = 800;
    playbackRate = 2;
    volume = 45;
    muted = true;
    act(() => vi.advanceTimersByTime(250));
    expect(controller.getSnapshot()).toMatchObject({
      currentTimeMs: 420_000,
      durationMs: 800_000,
      playbackRate: 2,
      volume: 45,
      muted: true,
    });
  });

  test('publishes one loading controller that becomes unavailable before ready', async () => {
    const onReady = vi.fn();
    render(
      <YouTubePlayer
        videoId="dQw4w9WgXcQ"
        title="Source video"
        onReady={onReady}
      />,
    );

    await act(async () => {});
    const controller = onReady.mock.calls[0]?.[0] as VideoPlayerController;
    expect(controller.getSnapshot().status).toBe('loading');

    const script = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    await act(async () => script?.dispatchEvent(new Event('error')));

    expect(onReady.mock.calls[0]?.[0]).toBe(controller);
    expect(controller.getSnapshot().status).toBe('unavailable');
  });

  test('replaces a ready controller with loading state before a new video fails', async () => {
    const players: object[] = [];
    const options: Array<{
      videoId: string;
      events: { onReady(): void; onError(): void };
    }> = [];
    const Player = vi.fn(function Player(
      _element: HTMLElement,
      next: {
        videoId: string;
        events: { onReady(): void; onError(): void };
      },
    ) {
      options.push(next);
      const instance = {
        ...player,
        getIframe: vi.fn(() => document.createElement('iframe')),
        destroy: vi.fn(),
      };
      players.push(instance);
      if (next.videoId === 'video-one') {
        queueMicrotask(() => next.events.onReady());
      }
      return instance;
    });
    Object.assign(window, { YT: { Player } });
    const currentController: { value: VideoPlayerController | null } = {
      value: null,
    };
    const changes: Array<VideoPlayerController | null> = [];
    const onReady = vi.fn(
      (
        next: VideoPlayerController | null,
        replaced?: VideoPlayerController,
      ) => {
        changes.push(next);
        if (next) currentController.value = next;
        else if (currentController.value === replaced) {
          currentController.value = null;
        }
      },
    );
    const { rerender } = render(
      <YouTubePlayer
        videoId="video-one"
        title="First video"
        onReady={onReady}
      />,
    );
    await act(async () => {});
    const firstController = currentController.value;
    expect(firstController?.getSnapshot().status).toBe('ready');

    rerender(
      <YouTubePlayer
        videoId="video-two"
        title="Second video"
        onReady={onReady}
      />,
    );
    await act(async () => {});
    const secondController = currentController.value;
    expect(secondController).not.toBe(firstController);
    expect(secondController?.getSnapshot().status).toBe('loading');

    act(() => options[1]?.events.onError());
    expect(secondController?.getSnapshot().status).toBe('unavailable');
    expect(changes).toContain(null);
    expect(Player).toHaveBeenCalledTimes(2);
    expect(players).toHaveLength(2);
  });

  test('replaces controller state when a new analysis reuses the same video', async () => {
    installYouTubeApi({ ready: false });
    const changes: Array<VideoPlayerController | null> = [];
    const onReady = vi.fn((next: VideoPlayerController | null) =>
      changes.push(next),
    );
    const { rerender } = render(
      <YouTubePlayer
        videoId="shared-video"
        lifecycleKey="analysis-a"
        title="Shared video"
        onReady={onReady}
      />,
    );
    await act(async () => {});
    const first = changes.find(
      (value): value is VideoPlayerController => value !== null,
    );

    rerender(
      <YouTubePlayer
        videoId="shared-video"
        lifecycleKey="analysis-b"
        title="Shared video"
        onReady={onReady}
      />,
    );
    await act(async () => {});
    const controllers = changes.filter(
      (value): value is VideoPlayerController => value !== null,
    );

    expect(changes).toContain(null);
    expect(controllers).toHaveLength(2);
    expect(controllers[1]).not.toBe(first);
    expect(controllers[1]?.getSnapshot().status).toBe('loading');
  });

  test('reports unsupported optional capabilities truthfully and no-ops safely', async () => {
    const limitedPlayer = {
      destroy: vi.fn(),
      getIframe: vi.fn(() => iframe),
      getCurrentTime: vi.fn(() => 2),
      pauseVideo: vi.fn(),
      playVideo: vi.fn(),
      seekTo: vi.fn(),
    };
    installYouTubeApi({ instance: limitedPlayer });
    const onReady = vi.fn();
    render(
      <YouTubePlayer
        videoId="dQw4w9WgXcQ"
        title="Source video"
        onReady={onReady}
      />,
    );
    await act(async () => {});
    const controller = onReady.mock.calls[0]?.[0] as VideoPlayerController;

    expect(controller.getSnapshot()).toMatchObject({
      availableRates: [],
      captionsAvailable: false,
      volume: 100,
      muted: false,
    });
    expect(() => {
      controller.setPlaybackRate(1.5);
      controller.setVolume(40);
      controller.toggleMute();
      controller.toggleCaptions();
    }).not.toThrow();
    await expect(controller.requestFullscreen()).resolves.toBeUndefined();
  });

  test('seeks the saved position exactly once after ready', async () => {
    const Player = installYouTubeApi();
    const onTimeChange = vi.fn();
    render(
      <YouTubePlayer
        videoId="dQw4w9WgXcQ"
        title="Source video"
        initialPositionMs={370_000}
        onTimeChange={onTimeChange}
      />,
    );
    await act(async () => {});

    const events = Player.mock.calls[0]?.[1].events;
    act(() => events.onReady());

    expect(player.seekTo).toHaveBeenCalledTimes(1);
    expect(player.seekTo).toHaveBeenCalledWith(370, true);
    act(() => vi.advanceTimersByTime(250));
    expect(onTimeChange).toHaveBeenCalledOnce();
  });

  test('constructs one IFrame player when full and mini controls subscribe', async () => {
    const Player = installYouTubeApi();

    function Control({ label }: Readonly<{ label: string }>) {
      const status = useVideoPlayerSnapshot((snapshot) => snapshot.status);
      return <output aria-label={label}>{status}</output>;
    }

    function Harness() {
      const [controller, setController] =
        useState<VideoPlayerController | null>(null);
      return (
        <PlayerProvider controller={controller}>
          <YouTubePlayer
            videoId="dQw4w9WgXcQ"
            title="Source video"
            onReady={setController}
          />
          <Control label="Full player state" />
          <Control label="Mini player state" />
        </PlayerProvider>
      );
    }

    render(<Harness />);
    await act(async () => {});

    expect(screen.getByLabelText('Full player state')).toHaveTextContent(
      'ready',
    );
    expect(screen.getByLabelText('Mini player state')).toHaveTextContent(
      'ready',
    );
    expect(Player).toHaveBeenCalledOnce();
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

  test('removes its failed API script so a same-page remount can retry', async () => {
    const first = render(
      <YouTubePlayer videoId="video-one" title="First video" />,
    );
    const failedScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    await act(async () => failedScript?.dispatchEvent(new Event('error')));
    expect(failedScript).not.toBeInTheDocument();
    first.unmount();

    render(<YouTubePlayer videoId="video-two" title="Second video" />);
    const retryScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    expect(retryScript).toBeInTheDocument();
    expect(retryScript).not.toBe(failedScript);

    installYouTubeApi({ ready: false });
    await act(async () => window.onYouTubeIframeAPIReady?.());
  });

  test('does not publish optimistic command state when the player throws', async () => {
    const throwingPlayer = {
      ...player,
      seekTo: vi.fn(() => {
        throw new Error('seek failed');
      }),
      setPlaybackRate: vi.fn(() => {
        throw new Error('rate failed');
      }),
      setVolume: vi.fn(() => {
        throw new Error('volume failed');
      }),
      mute: vi.fn(() => {
        throw new Error('mute failed');
      }),
    };
    installYouTubeApi({ instance: throwingPlayer });
    const onReady = vi.fn();
    render(
      <YouTubePlayer
        videoId="dQw4w9WgXcQ"
        title="Source video"
        onReady={onReady}
      />,
    );
    await act(async () => {});
    const controller = onReady.mock.calls[0]?.[0] as VideoPlayerController;
    const before = controller.getSnapshot();

    controller.seekTo(50_000);
    controller.setPlaybackRate(2);
    controller.setVolume(20);
    controller.toggleMute();

    expect(controller.getSnapshot()).toBe(before);
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

  test('reports runtime failure and stops the ready player safely', async () => {
    const Player = installYouTubeApi();
    const onUnavailable = vi.fn();
    const onTimeChange = vi.fn();
    const { unmount } = render(
      <YouTubePlayer
        videoId="dQw4w9WgXcQ"
        title="Source video"
        onUnavailable={onUnavailable}
        onTimeChange={onTimeChange}
      />,
    );
    await act(async () => {});
    const options = Player.mock.calls[0]?.[1];

    act(() => options.events.onError());
    expect(onUnavailable).toHaveBeenCalledOnce();
    expect(player.destroy).toHaveBeenCalledOnce();

    const calls = onTimeChange.mock.calls.length;
    act(() => vi.advanceTimersByTime(1_000));
    expect(onTimeChange).toHaveBeenCalledTimes(calls);

    unmount();
    expect(player.destroy).toHaveBeenCalledOnce();
  });
});
