'use client';

import { useCallback } from 'react';
import type { ResultSaveState } from '@/lib/result-workspace/actions';
import type { SummaryPresentation } from '@/lib/result-workspace/presentation';

import { AutosaveStatus } from './autosave-status';
import { useVideoPlayer } from './player-context';
import { useAutosave } from './use-autosave';

export function formatOffset(offsetMs: number): string {
  const totalSeconds = Math.floor(offsetMs / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function SummaryTab({
  analysisId,
  summary,
  onSummaryChange,
  revision,
  saveArtifact,
}: Readonly<{
  analysisId: string;
  summary: SummaryPresentation;
  onSummaryChange: (summary: SummaryPresentation) => void;
  revision: string;
  saveArtifact: (input: unknown) => Promise<ResultSaveState>;
}>) {
  const player = useVideoPlayer();
  const value = summary;
  const setValue = (
    update: (current: SummaryPresentation) => SummaryPresentation,
  ) => onSummaryChange(update(value));
  const save = useCallback(
    (content: SummaryPresentation, expectedUpdatedAt: string) =>
      saveArtifact({
        analysisId,
        expectedUpdatedAt,
        kind: 'summary',
        content:
          content.schemaVersion === 1
            ? {
                schemaVersion: 1,
                title: content.title,
                overview: content.overview,
                keyPoints: content.keyPoints.map((point) => point.text),
              }
            : {
                schemaVersion: 2,
                title: content.title,
                overview: content.overview,
                keyPoints: content.keyPoints.map((point) => ({
                  text: point.text,
                  ...(point.sourceOffsetMs === null
                    ? {}
                    : { sourceOffsetMs: point.sourceOffsetMs }),
                })),
              },
      }),
    [analysisId, saveArtifact],
  );
  const autosave = useAutosave({ value, revision, save });
  return (
    <article className="result-summary space-y-7" data-artifact="summary">
      <header className="border-l-2 border-[var(--artifact-summary)] pl-5">
        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--artifact-summary)]">
          Structured summary
        </p>
        <input
          aria-label="Summary title"
          value={value.title}
          onChange={(event) =>
            setValue((current) => ({ ...current, title: event.target.value }))
          }
          className="mt-2 min-h-11 w-full bg-transparent font-[var(--font-display)] text-2xl text-[var(--text-primary)] focus:outline-none"
        />
        <textarea
          aria-label="Summary overview"
          value={value.overview}
          onChange={(event) =>
            setValue((current) => ({
              ...current,
              overview: event.target.value,
            }))
          }
          rows={3}
          className="mt-3 w-full resize-y rounded-lg border border-transparent bg-transparent p-2 leading-7 text-[var(--text-secondary)] focus:border-[var(--border-strong)] focus:outline-none"
        />
        <AutosaveStatus {...autosave} />
      </header>
      <ol className="space-y-3">
        {value.keyPoints.map((point, index) => (
          <li
            key={`${point.sourceOffsetMs ?? 'none'}-${index}`}
            className="flex items-start gap-4 rounded-xl border border-[var(--border-default)] bg-white/[0.015] p-4"
          >
            <span className="font-[var(--font-mono)] text-xs text-[var(--artifact-summary)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <textarea
              aria-label={`Summary point ${index + 1}`}
              value={point.text}
              rows={2}
              onChange={(event) =>
                setValue((current) => ({
                  ...current,
                  keyPoints: current.keyPoints.map((item, itemIndex) =>
                    itemIndex === index
                      ? { ...item, text: event.target.value }
                      : item,
                  ),
                }))
              }
              className="min-w-0 flex-1 resize-y bg-transparent leading-6 text-[var(--text-primary)] focus:outline-none"
            />
            {point.sourceOffsetMs !== null && (
              <button
                className="min-h-11 shrink-0 rounded-lg px-3 font-[var(--font-mono)] text-xs text-[var(--artifact-summary)] hover:bg-white/[0.04]"
                type="button"
                onClick={() => player?.seekTo(point.sourceOffsetMs!)}
              >
                {formatOffset(point.sourceOffsetMs)}
              </button>
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}
