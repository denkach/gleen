'use client';

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';

import {
  loadingVideoPlayerSnapshot,
  type VideoPlayerController,
  type VideoPlayerSnapshot,
} from './player-controller';

const PlayerContext = createContext<VideoPlayerController | null>(null);

export function PlayerProvider({
  controller,
  children,
}: Readonly<{
  controller: VideoPlayerController | null;
  children: ReactNode;
}>) {
  return <PlayerContext value={controller}>{children}</PlayerContext>;
}

export function useVideoPlayer(): VideoPlayerController | null {
  return useContext(PlayerContext);
}

const subscribeToNothing = () => () => undefined;

class SelectedPlayerSnapshot<T> {
  private previousSnapshot: VideoPlayerSnapshot | undefined;
  private previousSelection: T | undefined;
  private readonly serverSelection: T;
  private hasSelection = false;

  constructor(
    private readonly controller: VideoPlayerController | null,
    private readonly selector: (snapshot: VideoPlayerSnapshot) => T,
  ) {
    this.serverSelection = selector(loadingVideoPlayerSnapshot);
  }

  readonly getSnapshot = () => {
    const snapshot =
      this.controller?.getSnapshot() ?? loadingVideoPlayerSnapshot;
    if (snapshot === this.previousSnapshot && this.hasSelection) {
      return this.previousSelection as T;
    }
    const selected = this.selector(snapshot);
    this.previousSnapshot = snapshot;
    if (!this.hasSelection || !Object.is(this.previousSelection, selected)) {
      this.previousSelection = selected;
      this.hasSelection = true;
    }
    return this.previousSelection as T;
  };

  readonly getServerSnapshot = () => this.serverSelection;
}

export function useVideoPlayerSnapshot<T>(
  selector: (snapshot: VideoPlayerSnapshot) => T,
): T {
  const controller = useVideoPlayer();
  const selectedSnapshot = useMemo(
    () => new SelectedPlayerSnapshot(controller, selector),
    [controller, selector],
  );

  return useSyncExternalStore(
    controller?.subscribe ?? subscribeToNothing,
    selectedSnapshot.getSnapshot,
    selectedSnapshot.getServerSnapshot,
  );
}
