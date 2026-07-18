'use client';

import { useEffect, useState } from 'react';
import type { TimestampsArtifact } from '@/lib/analysis-pipeline/artifact-schemas';

import { useVideoPlayer } from './player-context';
import { formatOffset } from './summary-tab';

export function TimestampsTab({
  artifact,
}: Readonly<{ artifact: TimestampsArtifact }>) {
  const player = useVideoPlayer();
  const [activeOffset, setActiveOffset] = useState(
    artifact.chapters[0]?.offsetMs ?? 0,
  );
  useEffect(() => {
    if (!player) return;
    const synchronize = () => {
      const currentTime = player.getCurrentTimeMs();
      const active = artifact.chapters.findLast(
        (chapter) => chapter.offsetMs <= currentTime,
      );
      if (active) setActiveOffset(active.offsetMs);
    };
    synchronize();
    const interval = window.setInterval(synchronize, 500);
    return () => window.clearInterval(interval);
  }, [artifact.chapters, player]);
  return (
    <ol
      className="relative space-y-2 before:absolute before:bottom-5 before:left-[21px] before:top-5 before:w-px before:bg-[color-mix(in_srgb,var(--artifact-timestamps)_30%,transparent)]"
      data-artifact="timestamps"
    >
      {artifact.chapters.map((chapter) => (
        <li
          key={chapter.offsetMs}
          aria-current={activeOffset === chapter.offsetMs ? 'true' : undefined}
          className="relative grid grid-cols-[44px_1fr] gap-4 rounded-xl p-3 aria-[current=true]:bg-[color-mix(in_srgb,var(--artifact-timestamps)_5%,transparent)]"
        >
          <span
            className="relative z-10 mt-2 size-[19px] justify-self-center rounded-full border border-[var(--artifact-timestamps)] bg-[var(--background-deep)]"
            aria-hidden="true"
          />
          <div>
            <button
              type="button"
              className="min-h-11 font-[var(--font-mono)] text-xs text-[var(--artifact-timestamps)]"
              onClick={() => {
                setActiveOffset(chapter.offsetMs);
                player?.seekTo(chapter.offsetMs);
              }}
            >
              {formatOffset(chapter.offsetMs)}
            </button>
            <h2 className="font-[var(--font-display)] text-lg text-[var(--text-primary)]">
              {chapter.title}
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--text-secondary)]">
              {chapter.description}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
