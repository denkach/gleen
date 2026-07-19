'use client';

import { trackResultEvent } from '@/lib/analytics/result-events';
import type { ResultCopy } from '@/lib/result-workspace/copy';
import type { TimestampsPresentation } from '@/lib/result-workspace/presentation';
import type { RefObject } from 'react';

import { useVideoPlayer, useVideoPlayerSnapshot } from './player-context';
import type { VideoPlayerSnapshot } from './player-controller';
import { ResultSheet } from './result-sheet';

const selectCurrentTime = (snapshot: VideoPlayerSnapshot) =>
  snapshot.currentTimeMs;
const selectStatus = (snapshot: VideoPlayerSnapshot) => snapshot.status;

function formatTime(offsetMs: number): string {
  const seconds = Math.max(0, Math.floor(offsetMs / 1_000));
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  const remainder = seconds % 60;
  return hours
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function ChapterSheet({
  analysisId,
  chapters,
  copy,
  onOpenChange,
  open,
  restoreFocusRef,
}: Readonly<{
  analysisId: string;
  chapters: TimestampsPresentation['chapters'];
  copy: ResultCopy;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  restoreFocusRef?: RefObject<HTMLElement | null>;
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

  return (
    <ResultSheet
      className="result-chapter-sheet"
      open={open}
      onOpenChange={onOpenChange}
      title={copy.sheetChaptersTitle}
      closeLabel={copy.sheetClose}
      restoreFocusRef={restoreFocusRef}
    >
      <ol className="result-chapter-sheet-list">
        {chapters.map((chapter, index) => (
          <li key={`${chapter.offsetMs}:${chapter.title}`}>
            <button
              type="button"
              aria-current={index === activeIndex ? 'true' : undefined}
              aria-label={`${formatTime(chapter.offsetMs)} ${chapter.title}`}
              disabled={!playerReady}
              onClick={() => {
                if (!controller || !playerReady) return;
                controller.seekTo(chapter.offsetMs);
                controller.play();
                trackResultEvent({
                  name: 'result_chapter_selected',
                  anonymousAnalysisId: analysisId,
                });
                onOpenChange(false);
              }}
            >
              <span className="result-chapter-sheet-index">{index + 1}</span>
              <span className="result-chapter-sheet-copy">
                <time>{formatTime(chapter.offsetMs)}</time>
                <strong>{chapter.title}</strong>
                {chapter.durationMs ? (
                  <small>{formatTime(chapter.durationMs)}</small>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </ResultSheet>
  );
}
