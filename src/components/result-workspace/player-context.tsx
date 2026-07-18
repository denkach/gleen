'use client';

import { createContext, useContext, type ReactNode } from 'react';

import type { VideoPlayerController } from './player-controller';

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
