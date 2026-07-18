'use client';

import type { SummaryPresentation } from '@/lib/result-workspace/presentation';

import { useVideoPlayer } from './player-context';

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
  summary,
}: Readonly<{ summary: SummaryPresentation }>) {
  const player = useVideoPlayer();
  return (
    <article className="result-summary space-y-7" data-artifact="summary">
      <header className="border-l-2 border-[var(--artifact-summary)] pl-5">
        <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--artifact-summary)]">
          Structured summary
        </p>
        <h2 className="mt-2 font-[var(--font-display)] text-2xl text-[var(--text-primary)]">
          {summary.title}
        </h2>
        <p className="mt-3 max-w-3xl leading-7 text-[var(--text-secondary)]">
          {summary.overview}
        </p>
      </header>
      <ol className="space-y-3">
        {summary.keyPoints.map((point, index) => (
          <li
            key={`${point.text}-${index}`}
            className="flex items-start gap-4 rounded-xl border border-[var(--border-default)] bg-white/[0.015] p-4"
          >
            <span className="font-[var(--font-mono)] text-xs text-[var(--artifact-summary)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <p className="min-w-0 flex-1 leading-6 text-[var(--text-primary)]">
              {point.text}
            </p>
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
