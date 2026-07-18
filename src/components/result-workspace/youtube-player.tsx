'use client';

import { useEffect, useRef, useState } from 'react';

import type { VideoPlayerController } from './player-controller';

const API_URL = 'https://www.youtube.com/iframe_api';
const POLL_INTERVAL_MS = 250;

type YouTubePlayerInstance = {
  destroy(): void;
  getCurrentTime(): number;
  getIframe(): HTMLIFrameElement;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Readonly<{ playsinline: 1; rel: 0 }>;
      events: Readonly<{
        onReady(): void;
        onError(): void;
      }>;
    },
  ) => YouTubePlayerInstance;
};

declare global {
  interface Window {
    YT?: YouTubeApi;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let pendingApi: Promise<YouTubeApi> | null = null;

function loadYouTubeApi(): Promise<YouTubeApi> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (pendingApi) return pendingApi;

  const request = new Promise<YouTubeApi>((resolve, reject) => {
    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      if (window.YT?.Player) {
        const api = window.YT;
        resolve(api);
      } else reject(new Error('YouTube IFrame API did not initialize.'));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${API_URL}"]`,
    );
    const script = existing ?? document.createElement('script');
    script.addEventListener(
      'error',
      () => reject(new Error('YouTube IFrame API could not be loaded.')),
      { once: true },
    );
    if (!existing) {
      script.src = API_URL;
      script.async = true;
      document.head.append(script);
    }
  });
  pendingApi = request;
  void request.then(
    () => {
      if (pendingApi === request) pendingApi = null;
    },
    () => {
      if (pendingApi === request) pendingApi = null;
    },
  );
  return request;
}

export type YouTubePlayerProps = Readonly<{
  videoId: string;
  title: string;
  onReady?: (controller: VideoPlayerController) => void;
  onTimeChange?: (offsetMs: number) => void;
  onUnavailable?: () => void;
}>;

export function YouTubePlayer({
  videoId,
  title,
  onReady,
  onTimeChange,
  onUnavailable,
}: YouTubePlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onTimeChangeRef = useRef(onTimeChange);
  const onUnavailableRef = useRef(onUnavailable);
  const [unavailableVideoId, setUnavailableVideoId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    onReadyRef.current = onReady;
    onTimeChangeRef.current = onTimeChange;
    onUnavailableRef.current = onUnavailable;
  }, [onReady, onTimeChange, onUnavailable]);

  useEffect(() => {
    let active = true;
    let player: YouTubePlayerInstance | null = null;
    let pollingId: number | null = null;

    const stopPlayer = () => {
      if (pollingId !== null) {
        window.clearInterval(pollingId);
        pollingId = null;
      }
      const stalePlayer = player;
      player = null;
      stalePlayer?.destroy();
    };

    const reportUnavailable = () => {
      if (!active) return;
      stopPlayer();
      setUnavailableVideoId(videoId);
      onUnavailableRef.current?.();
    };

    void loadYouTubeApi()
      .then((api) => {
        if (!active || !mountRef.current) return;
        player = new api.Player(mountRef.current, {
          videoId,
          playerVars: { playsinline: 1, rel: 0 },
          events: {
            onReady: () => {
              if (!active || !player) return;
              player.getIframe().title = `Play ${title}`;
              const controller: VideoPlayerController = {
                seekTo: (offsetMs) =>
                  player?.seekTo(Math.max(0, offsetMs) / 1_000, true),
                play: () => player?.playVideo(),
                pause: () => player?.pauseVideo(),
                getCurrentTimeMs: () =>
                  Math.round((player?.getCurrentTime() ?? 0) * 1_000),
              };
              onReadyRef.current?.(controller);
              pollingId = window.setInterval(() => {
                if (player) {
                  onTimeChangeRef.current?.(
                    Math.round(player.getCurrentTime() * 1_000),
                  );
                }
              }, POLL_INTERVAL_MS);
            },
            onError: reportUnavailable,
          },
        });
      })
      .catch(reportUnavailable);

    return () => {
      active = false;
      stopPlayer();
    };
  }, [title, videoId]);

  if (unavailableVideoId === videoId) {
    return (
      <div
        className="grid size-full min-h-44 place-items-center px-6 text-center text-sm text-[var(--text-secondary)]"
        role="status"
      >
        Player unavailable
      </div>
    );
  }

  return (
    <div className="size-full" title={`Play ${title}`}>
      <div ref={mountRef} className="size-full" />
    </div>
  );
}
