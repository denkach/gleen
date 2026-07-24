'use client';

import Image from 'next/image';
import { useEffect } from 'react';

import { trackResultEvent } from '@/lib/analytics/result-events';
import type { ResultCopy } from '@/lib/result-workspace/copy';
import type { TimestampsPresentation } from '@/lib/result-workspace/presentation';

import { useVideoPlayer, useVideoPlayerSnapshot } from './player-context';
import type { VideoPlayerSnapshot } from './player-controller';

const selectStatus = (snapshot: VideoPlayerSnapshot) => snapshot.status;
const selectCurrentTime = (snapshot: VideoPlayerSnapshot) =>
  snapshot.currentTimeMs;
const selectPlaying = (snapshot: VideoPlayerSnapshot) => snapshot.playing;

function formatTime(offsetMs: number): string {
  const seconds = Math.max(0, Math.floor(offsetMs / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

function MiniPlayerIcon({
  name,
}: Readonly<{ name: 'chapters' | 'expand' | 'pause' | 'play' }>) {
  const paths = {
    chapters: 'M5 6h14M5 12h14M5 18h14',
    expand: 'M8 3H3v5M16 3h5v5M8 21H3v-5M16 21h5v-5',
    pause: 'M8 5h3v14H8zM13 5h3v14h-3z',
    play: 'M8 5v14l11-7z',
  } as const;
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={paths[name]} />
    </svg>
  );
}

export function MobileMiniPlayer({
  analysisId,
  chapters,
  copy,
  onChapters,
  onExpand,
  thumbnailUrl,
  title,
}: Readonly<{
  analysisId: string;
  chapters: TimestampsPresentation['chapters'];
  copy: ResultCopy;
  onChapters: () => void;
  onExpand: () => void;
  thumbnailUrl: string;
  title: string;
}>) {
  const controller = useVideoPlayer();
  const status = useVideoPlayerSnapshot(selectStatus);
  const currentTimeMs = useVideoPlayerSnapshot(selectCurrentTime);
  const playing = useVideoPlayerSnapshot(selectPlaying);
  useEffect(() => {
    if (status !== 'ready') return;
    trackResultEvent({
      name: 'result_mobile_miniplayer_shown',
      anonymousAnalysisId: analysisId,
    });
  }, [analysisId, status]);
  if (!controller || status !== 'ready') return null;

  const currentChapter = chapters.reduce<
    TimestampsPresentation['chapters'][number] | undefined
  >(
    (selected, chapter) =>
      chapter.offsetMs <= currentTimeMs ? chapter : selected,
    chapters[0],
  );

  return (
    <aside
      className="result-mobile-mini-player"
      data-testid="mobile-mini-player"
      aria-label={copy.playerLabel}
    >
      <span className="result-mobile-mini-thumbnail">
        <Image src={thumbnailUrl} alt="" fill sizes="72px" unoptimized />
      </span>
      <span className="result-mobile-mini-copy">
        <strong>{currentChapter?.title ?? title}</strong>
        <time>{formatTime(currentTimeMs)}</time>
      </span>
      <button
        type="button"
        aria-label={playing ? copy.playerPause : copy.playerPlay}
        onClick={() => (playing ? controller.pause() : controller.play())}
      >
        <MiniPlayerIcon name={playing ? 'pause' : 'play'} />
      </button>
      <button
        type="button"
        aria-label={copy.playerChapters}
        onClick={onChapters}
      >
        <MiniPlayerIcon name="chapters" />
      </button>
      <button type="button" aria-label={copy.playerExpand} onClick={onExpand}>
        <MiniPlayerIcon name="expand" />
      </button>
    </aside>
  );
}
