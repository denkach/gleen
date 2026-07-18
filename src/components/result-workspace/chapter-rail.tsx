'use client';

import Image from 'next/image';

import { formatResultCopy, type ResultCopy } from '@/lib/result-workspace/copy';
import type { TimestampsPresentation } from '@/lib/result-workspace/presentation';

import { useVideoPlayer, useVideoPlayerSnapshot } from './player-context';
import type { VideoPlayerSnapshot } from './player-controller';

const selectCurrentTime = (snapshot: VideoPlayerSnapshot) =>
  snapshot.currentTimeMs;
const selectStatus = (snapshot: VideoPlayerSnapshot) => snapshot.status;

function formatChapterTime(offsetMs: number): string {
  const seconds = Math.max(0, Math.floor(offsetMs / 1_000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

export function ChapterRail({
  chapters,
  thumbnailUrl,
  copy,
}: Readonly<{
  chapters: TimestampsPresentation['chapters'];
  thumbnailUrl: string;
  copy: ResultCopy;
}>) {
  const controller = useVideoPlayer();
  const currentTimeMs = useVideoPlayerSnapshot(selectCurrentTime);
  const status = useVideoPlayerSnapshot(selectStatus);
  const playerReady = Boolean(controller) && status === 'ready';
  const activeIndex = chapters.reduce(
    (selected, chapter, index) =>
      chapter.offsetMs <= currentTimeMs ? index : selected,
    chapters.length ? 0 : -1,
  );

  if (!chapters.length) return null;

  return (
    <section className="result-chapters" aria-label={copy.playerChapters}>
      <div className="result-section-row">
        <h3>{copy.playerChapters}</h3>
        <span>
          {formatResultCopy(copy.keyMomentsCount, { count: chapters.length })}
        </span>
      </div>
      <div className="result-chapter-rail">
        {chapters.map((chapter, index) => (
          <button
            className="result-chapter-card"
            type="button"
            key={`${chapter.offsetMs}:${chapter.title}`}
            aria-current={index === activeIndex ? 'true' : undefined}
            aria-busy={!playerReady || undefined}
            aria-label={`${formatChapterTime(chapter.offsetMs)} ${chapter.title}`}
            disabled={!playerReady}
            onClick={() => {
              if (!controller || !playerReady) return;
              controller.seekTo(chapter.offsetMs);
              controller.play();
            }}
          >
            <span className="result-chapter-thumbnail">
              <Image src={thumbnailUrl} alt="" fill sizes="112px" unoptimized />
            </span>
            <time>{formatChapterTime(chapter.offsetMs)}</time>
            <span>{chapter.title}</span>
          </button>
        ))}
      </div>
    </section>
  );
}
