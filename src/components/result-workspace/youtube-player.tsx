'use client';

import { useEffect, useRef, useState } from 'react';

import {
  loadingVideoPlayerSnapshot,
  type VideoPlayerController,
  type VideoPlayerSnapshot,
} from './player-controller';

const API_URL = 'https://www.youtube.com/iframe_api';
const POLL_INTERVAL_MS = 250;

type YouTubePlayerInstance = {
  destroy(): void;
  getCurrentTime(): number;
  getDuration?(): number;
  getIframe(): HTMLIFrameElement;
  getPlaybackRate?(): number;
  getAvailablePlaybackRates?(): number[];
  getVolume?(): number;
  isMuted?(): boolean;
  getOptions?(module?: string): string[];
  getOption?(module: string, option: string): unknown;
  setOption?(module: string, option: string, value: unknown): void;
  mute?(): void;
  pauseVideo(): void;
  playVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  setPlaybackRate?(rate: number): void;
  setVolume?(volume: number): void;
  unMute?(): void;
};

type YouTubeApi = {
  Player: new (
    element: HTMLElement,
    options: {
      videoId: string;
      playerVars: Readonly<{ playsinline: 1; rel: 0; controls?: 0 | 1 }>;
      events: Readonly<{
        onReady(): void;
        onError(): void;
        onStateChange?(event: Readonly<{ data: number }>): void;
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
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${API_URL}"]`,
    );
    const script = existing ?? document.createElement('script');
    let settled = false;
    const cleanup = () => {
      script.removeEventListener('error', handleError);
      if (window.onYouTubeIframeAPIReady === handleReady) {
        if (previousReady) window.onYouTubeIframeAPIReady = previousReady;
        else Reflect.deleteProperty(window, 'onYouTubeIframeAPIReady');
      }
    };
    const fail = (error: Error) => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(error);
    };
    const handleReady = () => {
      if (settled) return;
      try {
        previousReady?.();
      } catch {
        // Another consumer's callback must not strand this API request.
      }
      if (window.YT?.Player) {
        settled = true;
        cleanup();
        const api = window.YT;
        resolve(api);
      } else fail(new Error('YouTube IFrame API did not initialize.'));
    };
    const handleError = () =>
      fail(new Error('YouTube IFrame API could not be loaded.'));
    window.onYouTubeIframeAPIReady = handleReady;
    script.addEventListener('error', handleError, { once: true });
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
  initialPositionMs?: number;
  onReady?: (controller: VideoPlayerController) => void;
  onTimeChange?: (offsetMs: number) => void;
  onUnavailable?: () => void;
}>;

export function YouTubePlayer({
  videoId,
  title,
  initialPositionMs = 0,
  onReady,
  onTimeChange,
  onUnavailable,
}: YouTubePlayerProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);
  const onTimeChangeRef = useRef(onTimeChange);
  const onUnavailableRef = useRef(onUnavailable);
  const initialPositionRef = useRef(initialPositionMs);
  const titleRef = useRef(title);
  const [unavailableVideoId, setUnavailableVideoId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    onReadyRef.current = onReady;
    onTimeChangeRef.current = onTimeChange;
    onUnavailableRef.current = onUnavailable;
    initialPositionRef.current = initialPositionMs;
    titleRef.current = title;
  }, [initialPositionMs, onReady, onTimeChange, onUnavailable, title]);

  useEffect(() => {
    let active = true;
    let player: YouTubePlayerInstance | null = null;
    let pollingId: number | null = null;
    let restoredPosition = false;
    let ready = false;
    let snapshot = loadingVideoPlayerSnapshot;
    const listeners = new Set<() => void>();

    const clamp = (value: number, minimum: number, maximum: number) => {
      if (!Number.isFinite(value)) return minimum;
      return Math.min(maximum, Math.max(minimum, value));
    };
    const read = <T,>(operation: () => T, fallback: T): T => {
      try {
        return operation();
      } catch {
        return fallback;
      }
    };
    const sameRates = (left: readonly number[], right: readonly number[]) =>
      left.length === right.length &&
      left.every((rate, index) => rate === right[index]);
    const updateSnapshot = (next: VideoPlayerSnapshot) => {
      if (
        snapshot.status === next.status &&
        snapshot.currentTimeMs === next.currentTimeMs &&
        snapshot.durationMs === next.durationMs &&
        snapshot.playing === next.playing &&
        snapshot.playbackRate === next.playbackRate &&
        sameRates(snapshot.availableRates, next.availableRates) &&
        snapshot.volume === next.volume &&
        snapshot.muted === next.muted &&
        snapshot.captionsAvailable === next.captionsAvailable
      ) {
        return;
      }
      snapshot = Object.freeze(next);
      listeners.forEach((listener) => listener());
    };
    const readAvailableRates = () =>
      read(() => player?.getAvailablePlaybackRates?.() ?? [], []).filter(
        (rate) => Number.isFinite(rate) && rate > 0,
      );
    const readCurrentTimeMs = () => {
      const durationMs = snapshot.durationMs;
      const currentTimeMs = Math.round(
        read(() => player?.getCurrentTime() ?? 0, 0) * 1_000,
      );
      return clamp(
        currentTimeMs,
        0,
        durationMs > 0 ? durationMs : Number.MAX_SAFE_INTEGER,
      );
    };
    const synchronize = (playing = snapshot.playing) => {
      if (!player) return;
      const availableRates = readAvailableRates();
      const durationMs = Math.max(
        0,
        Math.round(read(() => player?.getDuration?.() ?? 0, 0) * 1_000),
      );
      const currentTimeMs = clamp(
        Math.round(read(() => player?.getCurrentTime() ?? 0, 0) * 1_000),
        0,
        durationMs > 0 ? durationMs : Number.MAX_SAFE_INTEGER,
      );
      const playbackRate = read(() => player?.getPlaybackRate?.() ?? 1, 1);
      const options = read(() => player?.getOptions?.() ?? [], []);
      updateSnapshot({
        status: 'ready',
        currentTimeMs,
        durationMs,
        playing,
        playbackRate:
          Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1,
        availableRates,
        volume: clamp(
          read(() => player?.getVolume?.() ?? 100, 100),
          0,
          100,
        ),
        muted: read(() => player?.isMuted?.() ?? false, false),
        captionsAvailable:
          options.includes('captions') &&
          typeof player.getOption === 'function' &&
          typeof player.setOption === 'function',
      });
    };

    const controller: VideoPlayerController = {
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      },
      getSnapshot: () => snapshot,
      seekTo(offsetMs) {
        if (!player) return;
        const maximum =
          snapshot.durationMs > 0
            ? snapshot.durationMs
            : Number.MAX_SAFE_INTEGER;
        const clamped = clamp(offsetMs, 0, maximum);
        read(() => player?.seekTo(clamped / 1_000, true), undefined);
        updateSnapshot({ ...snapshot, currentTimeMs: clamped });
      },
      getCurrentTimeMs: readCurrentTimeMs,
      play: () => read(() => player?.playVideo(), undefined),
      pause: () => read(() => player?.pauseVideo(), undefined),
      setPlaybackRate(rate) {
        if (!player?.setPlaybackRate) return;
        const availableRates = snapshot.availableRates;
        if (availableRates.length === 0 || !Number.isFinite(rate)) return;
        const selected = availableRates.reduce((closest, candidate) =>
          Math.abs(candidate - rate) < Math.abs(closest - rate)
            ? candidate
            : closest,
        );
        read(() => player?.setPlaybackRate?.(selected), undefined);
        updateSnapshot({ ...snapshot, playbackRate: selected });
      },
      setVolume(nextVolume) {
        if (!player?.setVolume) return;
        const selected = clamp(nextVolume, 0, 100);
        read(() => player?.setVolume?.(selected), undefined);
        updateSnapshot({ ...snapshot, volume: selected });
      },
      toggleMute() {
        if (!player || (!player.mute && !player.unMute)) return;
        if (snapshot.muted) {
          read(() => player?.unMute?.(), undefined);
          updateSnapshot({ ...snapshot, muted: false });
        } else {
          read(() => player?.mute?.(), undefined);
          updateSnapshot({ ...snapshot, muted: true });
        }
      },
      toggleCaptions() {
        if (!player || !snapshot.captionsAvailable) return;
        const track = read(
          () => player?.getOption?.('captions', 'track'),
          undefined,
        );
        const enabled =
          typeof track === 'object' &&
          track !== null &&
          Object.keys(track).length > 0;
        read(
          () =>
            player?.setOption?.(
              'captions',
              enabled ? 'track' : 'reload',
              enabled ? {} : true,
            ),
          undefined,
        );
      },
      async requestFullscreen() {
        if (!player) return;
        try {
          await player.getIframe().requestFullscreen?.();
        } catch {
          // A rejected browser fullscreen request is an unsupported no-op.
        }
      },
    };

    const stopPlayer = () => {
      if (pollingId !== null) {
        window.clearInterval(pollingId);
        pollingId = null;
      }
      const stalePlayer = player;
      player = null;
      read(() => stalePlayer?.destroy(), undefined);
      listeners.clear();
    };

    const reportUnavailable = () => {
      if (!active) return;
      updateSnapshot({
        ...snapshot,
        status: 'unavailable',
        playing: false,
        captionsAvailable: false,
      });
      stopPlayer();
      setUnavailableVideoId(videoId);
      onUnavailableRef.current?.();
    };

    void loadYouTubeApi()
      .then((api) => {
        if (!active || !mountRef.current) return;
        player = new api.Player(mountRef.current, {
          videoId,
          playerVars: { playsinline: 1, rel: 0, controls: 1 },
          events: {
            onReady: () => {
              if (!active || !player || ready) return;
              ready = true;
              player.getIframe().title = `Play ${titleRef.current}`;
              synchronize(false);
              if (
                !restoredPosition &&
                Number.isFinite(initialPositionRef.current) &&
                initialPositionRef.current > 0
              ) {
                restoredPosition = true;
                controller.seekTo(initialPositionRef.current);
              }
              onReadyRef.current?.(controller);
              pollingId = window.setInterval(() => {
                if (player) {
                  synchronize();
                  onTimeChangeRef.current?.(snapshot.currentTimeMs);
                }
              }, POLL_INTERVAL_MS);
            },
            onError: reportUnavailable,
            onStateChange: ({ data }) => {
              if (!active || !player || snapshot.status !== 'ready') return;
              synchronize(data === 1);
            },
          },
        });
      })
      .catch(reportUnavailable);

    return () => {
      active = false;
      stopPlayer();
    };
  }, [videoId]);

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
