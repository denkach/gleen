'use client';

import { useEffect, useRef } from 'react';

import type { ResultMutationState } from '@/lib/result-workspace/actions';

import { useVideoPlayer } from './player-context';
import type { VideoPlayerSnapshot } from './player-controller';

const PERSIST_INTERVAL_MS = 5_000;
const MINIMUM_POSITION_CHANGE_MS = 1_000;

type SavePlaybackPosition = (input: {
  analysisId: string;
  positionMs: number;
}) => Promise<ResultMutationState>;

export type PlaybackPersistenceOptions = Readonly<{
  analysisId: string;
  initialPositionMs: number;
  savePlaybackPosition?: SavePlaybackPosition;
}>;

function clampPosition(positionMs: number, durationMs: number): number {
  if (!Number.isFinite(positionMs)) return 0;
  const maximum =
    Number.isFinite(durationMs) && durationMs > 0
      ? durationMs
      : Number.MAX_SAFE_INTEGER;
  return Math.round(Math.min(maximum, Math.max(0, positionMs)));
}

export function usePlaybackPersistence({
  analysisId,
  initialPositionMs,
  savePlaybackPosition,
}: PlaybackPersistenceOptions): void {
  const controller = useVideoPlayer();
  const saveRef = useRef(savePlaybackPosition);
  const persistenceEnabled = Boolean(savePlaybackPosition);
  useEffect(() => {
    saveRef.current = savePlaybackPosition;
  }, [savePlaybackPosition]);

  useEffect(() => {
    if (!controller || !persistenceEnabled) return;

    let active = true;
    let timer: number | null = null;
    let previousSnapshot = controller.getSnapshot();
    let latestPositionMs = clampPosition(
      previousSnapshot.currentTimeMs,
      previousSnapshot.durationMs,
    );
    let lastPersistedPositionMs = clampPosition(
      initialPositionMs,
      previousSnapshot.durationMs,
    );

    const clearTimer = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };

    const isSignificant = () =>
      Math.abs(latestPositionMs - lastPersistedPositionMs) >=
      MINIMUM_POSITION_CHANGE_MS;

    const persist = () => {
      clearTimer();
      if (!active || !isSignificant()) return;
      const save = saveRef.current;
      if (!save) return;

      const positionMs = latestPositionMs;
      lastPersistedPositionMs = positionMs;
      try {
        void Promise.resolve(save({ analysisId, positionMs })).catch(
          () => undefined,
        );
      } catch {
        // Playback remains independent of persistence availability.
      }
    };

    const schedule = () => {
      if (!isSignificant() || timer !== null) return;
      timer = window.setTimeout(persist, PERSIST_INTERVAL_MS);
    };

    const readSnapshot = (snapshot: VideoPlayerSnapshot) => {
      if (snapshot.status !== 'ready') {
        previousSnapshot = snapshot;
        return;
      }
      latestPositionMs = clampPosition(
        snapshot.currentTimeMs,
        snapshot.durationMs,
      );
      const paused = previousSnapshot.playing && !snapshot.playing;
      previousSnapshot = snapshot;
      if (paused) persist();
      else schedule();
    };

    const unsubscribe = controller.subscribe(() =>
      readSnapshot(controller.getSnapshot()),
    );
    const flushOnPageHide = () => {
      readSnapshot(controller.getSnapshot());
      persist();
    };
    window.addEventListener('pagehide', flushOnPageHide);
    readSnapshot(previousSnapshot);

    return () => {
      active = false;
      clearTimer();
      unsubscribe();
      window.removeEventListener('pagehide', flushOnPageHide);
    };
  }, [analysisId, controller, initialPositionMs, persistenceEnabled]);
}
