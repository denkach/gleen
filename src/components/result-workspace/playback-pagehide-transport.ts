export type PlaybackPositionWrite = Readonly<{
  analysisId: string;
  positionMs: number;
  revision: number;
}>;

export function flushPlaybackPositionOnPageHide(
  input: PlaybackPositionWrite,
): void {
  try {
    void fetch('/api/result/playback-position', {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    }).catch(() => undefined);
  } catch {
    // Page lifecycle and playback remain independent of persistence transport.
  }
}
