export type VideoPlayerSnapshot = Readonly<{
  status: 'loading' | 'ready' | 'unavailable';
  currentTimeMs: number;
  durationMs: number;
  playing: boolean;
  playbackRate: number;
  availableRates: readonly number[];
  volume: number;
  muted: boolean;
  captionsAvailable: boolean;
}>;

export const loadingVideoPlayerSnapshot: VideoPlayerSnapshot = Object.freeze({
  status: 'loading',
  currentTimeMs: 0,
  durationMs: 0,
  playing: false,
  playbackRate: 1,
  availableRates: Object.freeze([]),
  volume: 100,
  muted: false,
  captionsAvailable: false,
});

export type VideoPlayerController = Readonly<{
  subscribe(listener: () => void): () => void;
  getSnapshot(): VideoPlayerSnapshot;
  seekTo(offsetMs: number): void;
  getCurrentTimeMs(): number;
  play(): void;
  pause(): void;
  setPlaybackRate(rate: number): void;
  setVolume(volume: number): void;
  toggleMute(): void;
  toggleCaptions(): void;
  requestFullscreen(): Promise<void>;
}>;
