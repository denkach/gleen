'use client';

import { useMemo, useState } from 'react';
import type { TranscriptPresentation } from '@/lib/result-workspace/presentation';

import { useVideoPlayer } from './player-context';
import { formatOffset } from './summary-tab';

export function TranscriptTab({
  transcript,
}: Readonly<{ transcript: TranscriptPresentation }>) {
  const player = useVideoPlayer();
  const [query, setQuery] = useState('');
  const [copyError, setCopyError] = useState(false);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const segments = useMemo(
    () =>
      transcript.segments.filter((segment) =>
        segment.text.toLocaleLowerCase().includes(normalizedQuery),
      ),
    [normalizedQuery, transcript.segments],
  );
  const copy = async () => {
    setCopyError(false);
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(
        transcript.segments.map((segment) => segment.text).join('\n'),
      );
    } catch {
      setCopyError(true);
    }
  };
  return (
    <section data-artifact="transcript">
      <div className="mb-5 flex flex-wrap gap-3">
        <label className="min-w-52 flex-1">
          <span className="sr-only">Search transcript</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search transcript"
            placeholder="Search transcript"
            className="min-h-11 w-full rounded-lg border border-[var(--border-default)] bg-[var(--surface-panel)] px-4 text-sm text-[var(--text-primary)]"
          />
        </label>
        <button
          type="button"
          onClick={copy}
          className="min-h-11 rounded-lg border border-[var(--border-default)] px-4 text-sm text-[var(--text-primary)]"
        >
          Copy transcript
        </button>
      </div>
      {copyError && (
        <p role="status" className="mb-4 text-sm text-[var(--text-secondary)]">
          Transcript could not be copied. Select the text and copy it manually.
        </p>
      )}
      {segments.length === 0 ? (
        <p
          role="status"
          className="py-14 text-center text-sm text-[var(--text-secondary)]"
        >
          No transcript matches
        </p>
      ) : (
        <ol className="divide-y divide-[var(--border-default)]">
          {segments.map((segment, index) => (
            <li
              key={`${segment.offsetMs}-${index}`}
              className="grid grid-cols-[72px_1fr] gap-3 py-4"
            >
              <button
                type="button"
                className="min-h-11 self-start font-[var(--font-mono)] text-xs text-[var(--artifact-timestamps)]"
                onClick={() => player?.seekTo(segment.offsetMs)}
              >
                {formatOffset(segment.offsetMs)}
              </button>
              <p className="pt-2 text-sm leading-6 text-[var(--text-primary)]">
                {segment.text}
              </p>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
