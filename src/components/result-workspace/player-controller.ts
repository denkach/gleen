export type VideoPlayerController = Readonly<{
  seekTo(offsetMs: number): void;
  play(): void;
  pause(): void;
  getCurrentTimeMs(): number;
}>;
