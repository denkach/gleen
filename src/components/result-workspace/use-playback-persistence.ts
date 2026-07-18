'use client';

import { useEffect, useRef } from 'react';

import type { ResultMutationState } from '@/lib/result-workspace/actions';

import type { PlaybackPositionWrite } from './playback-pagehide-transport';
import { useVideoPlayer } from './player-context';
import type { VideoPlayerSnapshot } from './player-controller';

const PERSIST_INTERVAL_MS = 5_000;
const MINIMUM_POSITION_CHANGE_MS = 1_000;

type SavePlaybackPosition = (
  input: PlaybackPositionWrite,
) => Promise<ResultMutationState>;
type FlushPlaybackPosition = (input: PlaybackPositionWrite) => void;

export type PlaybackPersistenceOptions = Readonly<{
  analysisId: string;
  initialPositionMs: number;
  savePlaybackPosition?: SavePlaybackPosition;
  flushPlaybackPosition?: FlushPlaybackPosition;
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
  flushPlaybackPosition,
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
    let inFlight = false;
    let forcedQueued = false;
    let regularDue = false;
    let lastAttemptAt: number | null = null;
    let lastRevision = 0;
    let previousSnapshot = controller.getSnapshot();
    let latestPositionMs = clampPosition(
      previousSnapshot.currentTimeMs,
      previousSnapshot.durationMs,
    );
    let committedPositionMs = clampPosition(
      initialPositionMs,
      previousSnapshot.durationMs,
    );

    const clearTimer = () => {
      if (timer === null) return;
      window.clearTimeout(timer);
      timer = null;
    };

    const isSignificant = () =>
      Math.abs(latestPositionMs - committedPositionMs) >=
      MINIMUM_POSITION_CHANGE_MS;

    const nextRevision = () => {
      lastRevision = Math.max(Date.now(), lastRevision + 1);
      return lastRevision;
    };

    const schedule = () => {
      if (!isSignificant() || timer !== null) return;
      const delay =
        lastAttemptAt === null
          ? PERSIST_INTERVAL_MS
          : Math.max(0, PERSIST_INTERVAL_MS - (Date.now() - lastAttemptAt));
      timer = window.setTimeout(() => {
        timer = null;
        regularDue = true;
        if (!inFlight) {
          regularDue = false;
          runWrite();
        }
      }, delay);
    };

    const finishWrite = (positionMs: number, saved: boolean) => {
      if (!active) return;
      inFlight = false;
      if (saved) committedPositionMs = positionMs;

      if (!isSignificant()) {
        forcedQueued = false;
        regularDue = false;
        clearTimer();
        return;
      }
      if (forcedQueued) {
        forcedQueued = false;
        clearTimer();
        regularDue = false;
        runWrite();
        return;
      }
      if (regularDue) {
        regularDue = false;
        runWrite();
        return;
      }
      schedule();
    };

    const enqueue = (force: boolean) => {
      if (!isSignificant()) return;
      if (force) {
        clearTimer();
        regularDue = false;
        if (inFlight) {
          forcedQueued = true;
          return;
        }
        runWrite();
        return;
      }
      schedule();
    };

    function runWrite(): void {
      clearTimer();
      regularDue = false;
      if (!active || inFlight || !isSignificant()) return;
      const save = saveRef.current;
      if (!save) return;

      const positionMs = latestPositionMs;
      inFlight = true;
      lastAttemptAt = Date.now();
      let request: Promise<ResultMutationState>;
      try {
        request = save({
          analysisId,
          positionMs,
          revision: nextRevision(),
        });
      } catch {
        finishWrite(positionMs, false);
        return;
      }
      void Promise.resolve(request).then(
        (result) => finishWrite(positionMs, result.status === 'saved'),
        () => finishWrite(positionMs, false),
      );
    }

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
      enqueue(paused);
    };

    const unsubscribe = controller.subscribe(() =>
      readSnapshot(controller.getSnapshot()),
    );
    const flushOnPageHide = () => {
      readSnapshot(controller.getSnapshot());
      if (!isSignificant()) return;
      if (flushPlaybackPosition) {
        try {
          flushPlaybackPosition({
            analysisId,
            positionMs: latestPositionMs,
            revision: nextRevision(),
          });
          return;
        } catch {
          // Fall through to the serialized action transport.
        }
      }
      enqueue(true);
    };
    window.addEventListener('pagehide', flushOnPageHide);
    readSnapshot(previousSnapshot);

    return () => {
      active = false;
      clearTimer();
      unsubscribe();
      window.removeEventListener('pagehide', flushOnPageHide);
    };
  }, [
    analysisId,
    controller,
    flushPlaybackPosition,
    initialPositionMs,
    persistenceEnabled,
  ]);
}
