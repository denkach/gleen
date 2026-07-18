'use client';

import { useCallback, useEffect, useState } from 'react';
import type { TimestampsArtifact } from '@/lib/analysis-pipeline/artifact-schemas';
import type { ResultSaveState } from '@/lib/result-workspace/actions';

import { AutosaveStatus } from './autosave-status';
import { useVideoPlayer } from './player-context';
import { formatOffset } from './summary-tab';
import { useAutosave } from './use-autosave';

export function TimestampsTab({
  analysisId,
  artifact,
  revision,
  saveArtifact,
}: Readonly<{
  analysisId: string;
  artifact: TimestampsArtifact;
  revision: string;
  saveArtifact: (input: unknown) => Promise<ResultSaveState>;
}>) {
  const player = useVideoPlayer();
  const [value, setValue] = useState(artifact);
  const [activeOffset, setActiveOffset] = useState(
    artifact.chapters[0]?.offsetMs ?? 0,
  );
  const save = useCallback(
    (content: TimestampsArtifact, expectedUpdatedAt: string) =>
      saveArtifact({
        analysisId,
        expectedUpdatedAt,
        kind: 'timestamps',
        content,
      }),
    [analysisId, saveArtifact],
  );
  const autosave = useAutosave({ value, revision, save });
  useEffect(() => {
    if (!player) return;
    const synchronize = () => {
      const currentTime = player.getCurrentTimeMs();
      const active = value.chapters.findLast(
        (chapter) => chapter.offsetMs <= currentTime,
      );
      if (active) setActiveOffset(active.offsetMs);
    };
    synchronize();
    const interval = window.setInterval(synchronize, 500);
    return () => window.clearInterval(interval);
  }, [player, value.chapters]);
  return (
    <div>
      <AutosaveStatus {...autosave} />
      <ol
        className="relative space-y-2 before:absolute before:bottom-5 before:left-[21px] before:top-5 before:w-px before:bg-[color-mix(in_srgb,var(--artifact-timestamps)_30%,transparent)]"
        data-artifact="timestamps"
      >
        {value.chapters.map((chapter, chapterIndex) => (
          <li
            key={chapter.offsetMs}
            aria-current={
              activeOffset === chapter.offsetMs ? 'true' : undefined
            }
            className="relative grid grid-cols-[44px_1fr] gap-4 rounded-xl p-3 aria-[current=true]:bg-[color-mix(in_srgb,var(--artifact-timestamps)_5%,transparent)]"
          >
            <span className="sr-only">{chapter.title}</span>
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
              <input
                aria-label={`Chapter ${chapterIndex + 1} title`}
                value={chapter.title}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    chapters: current.chapters.map((item, itemIndex) =>
                      itemIndex === chapterIndex
                        ? { ...item, title: event.target.value }
                        : item,
                    ),
                  }))
                }
                className="min-h-11 w-full bg-transparent font-[var(--font-display)] text-lg text-[var(--text-primary)] focus:outline-none"
              />
              <textarea
                aria-label={`Chapter ${chapterIndex + 1} description`}
                value={chapter.description}
                rows={2}
                onChange={(event) =>
                  setValue((current) => ({
                    ...current,
                    chapters: current.chapters.map((item, itemIndex) =>
                      itemIndex === chapterIndex
                        ? { ...item, description: event.target.value }
                        : item,
                    ),
                  }))
                }
                className="mt-1 w-full resize-y bg-transparent text-sm leading-6 text-[var(--text-secondary)] focus:outline-none"
              />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
