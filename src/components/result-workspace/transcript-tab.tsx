'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { trackResultEvent } from '@/lib/analytics/result-events';
import type { ResultCopy } from '@/lib/result-workspace/copy';
import type { TranscriptPresentation } from '@/lib/result-workspace/presentation';

import { useVideoPlayer, useVideoPlayerSnapshot } from './player-context';

type TranscriptFilter = 'all' | 'insight' | 'question' | 'example' | 'story';

const transcriptFilters: readonly TranscriptFilter[] = [
  'all',
  'insight',
  'question',
  'example',
  'story',
];
const selectCurrentTime = (snapshot: { currentTimeMs: number }) =>
  snapshot.currentTimeMs;
const manualScrollSuppressionMs = 1_600;

function formatTranscriptTimestamp(offsetMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(offsetMs / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function serializeTranscript(transcript: TranscriptPresentation): string {
  return transcript.segments
    .map((segment) => {
      const speaker = segment.speakerLabel
        ? ` ${segment.speakerLabel.trim()}:`
        : '';
      return `${formatTranscriptTimestamp(segment.offsetMs)}${speaker} ${segment.text}`;
    })
    .join('\n');
}

function filterLabel(filter: TranscriptFilter, copy: ResultCopy): string {
  if (filter === 'insight') return copy.transcriptFilterInsight;
  if (filter === 'question') return copy.transcriptFilterQuestion;
  if (filter === 'example') return copy.transcriptFilterExample;
  if (filter === 'story') return copy.transcriptFilterStory;
  return copy.transcriptFilterAll;
}

function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    query.addEventListener?.('change', update);
    return () => query.removeEventListener?.('change', update);
  }, []);

  return reducedMotion;
}

function TranscriptActionIcon({
  name,
}: Readonly<{ name: 'copy' | 'download' }>) {
  if (name === 'copy') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="8" y="8" width="11" height="11" rx="2" />
        <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  );
}

export function TranscriptTab({
  transcript,
  copy,
  active,
}: Readonly<{
  transcript: TranscriptPresentation;
  copy: ResultCopy;
  active: boolean;
}>) {
  const player = useVideoPlayer();
  const currentTimeMs = useVideoPlayerSnapshot(selectCurrentTime);
  const reducedMotion = useReducedMotion();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<TranscriptFilter>('all');
  const [speakerLabels, setSpeakerLabels] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const activeOffset =
    transcript.segments.findLast((segment) => segment.offsetMs <= currentTimeMs)
      ?.offsetMs ??
    transcript.segments[0]?.offsetMs ??
    null;
  const previousActiveOffset = useRef(activeOffset);
  const manualScrollUntil = useRef(0);
  const listRef = useRef<HTMLOListElement>(null);
  const segmentRefs = useRef(new Map<number, HTMLLIElement>());
  const [actionMessage, setActionMessage] = useState<string>();
  const normalizedQuery = query.trim().toLocaleLowerCase(copy.interfaceLocale);
  const visibleSegments = useMemo(
    () =>
      transcript.segments.filter((segment) => {
        const matchesText = segment.text
          .toLocaleLowerCase(copy.interfaceLocale)
          .includes(normalizedQuery);
        const matchesType = filter === 'all' || segment.segmentType === filter;
        return matchesText && matchesType;
      }),
    [copy.interfaceLocale, filter, normalizedQuery, transcript.segments],
  );
  const reliableSpeakers = transcript.segments.some((segment) =>
    Boolean(segment.speakerLabel?.trim()),
  );
  const completeTranscript = useMemo(
    () => serializeTranscript(transcript),
    [transcript],
  );

  useEffect(() => {
    const previousOffset = previousActiveOffset.current;
    previousActiveOffset.current = activeOffset;
    if (previousOffset === activeOffset) return;
    if (!active || !autoScroll || activeOffset === null) return;
    if (Date.now() < manualScrollUntil.current) return;
    if (window.getSelection()?.toString()) return;

    const list = listRef.current;
    const row = segmentRefs.current.get(activeOffset);
    if (!list || !row) return;
    const top = Math.max(
      0,
      row.offsetTop -
        list.offsetTop -
        Math.max(0, (list.clientHeight - row.offsetHeight) / 2),
    );
    list.scrollTo({ behavior: reducedMotion ? 'auto' : 'smooth', top });
  }, [active, activeOffset, autoScroll, reducedMotion]);

  const suppressAutoScroll = () => {
    manualScrollUntil.current = Date.now() + manualScrollSuppressionMs;
  };
  const changeFilter = (nextFilter: TranscriptFilter) => {
    setFilter(nextFilter);
    trackResultEvent({
      name: 'result_transcript_control_changed',
      control: 'filter',
    });
  };
  const copyTranscript = async () => {
    setActionMessage(undefined);
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(completeTranscript);
      setActionMessage(copy.transcriptCopied);
    } catch {
      setActionMessage(copy.transcriptCopyFailed);
    }
  };
  const downloadTranscript = () => {
    setActionMessage(undefined);
    let objectUrl: string | undefined;
    try {
      const file = new Blob([completeTranscript], {
        type: 'text/plain;charset=utf-8',
      });
      objectUrl = URL.createObjectURL(file);
      const anchor = document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = 'gleen-transcript.txt';
      anchor.click();
      setActionMessage(copy.transcriptDownloaded);
    } catch {
      setActionMessage(copy.transcriptDownloadFailed);
    } finally {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    }
  };
  const playSegment = (offsetMs: number) => {
    player?.seekTo(offsetMs);
    player?.play();
  };

  return (
    <section className="result-transcript" data-artifact="transcript">
      <div className="result-transcript-tools">
        <label className="result-transcript-search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m16 16 5 5" />
          </svg>
          <span className="sr-only">{copy.transcriptSearch}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label={copy.transcriptSearch}
            placeholder={copy.transcriptSearch}
          />
        </label>
        <div className="result-transcript-actions">
          <button
            type="button"
            className="result-transcript-action"
            aria-label={copy.transcriptCopy}
            title={copy.transcriptCopy}
            onClick={() => void copyTranscript()}
          >
            <TranscriptActionIcon name="copy" />
          </button>
          <button
            type="button"
            className="result-transcript-action"
            aria-label={copy.transcriptDownload}
            title={copy.transcriptDownload}
            onClick={downloadTranscript}
          >
            <TranscriptActionIcon name="download" />
          </button>
        </div>
      </div>
      {actionMessage ? (
        <p className="result-transcript-status" role="status">
          {actionMessage}
        </p>
      ) : null}
      <div
        className="result-transcript-filters"
        role="group"
        aria-label={copy.tabTranscript}
      >
        {transcriptFilters.map((candidate) => (
          <button
            key={candidate}
            type="button"
            aria-pressed={filter === candidate}
            onClick={() => changeFilter(candidate)}
          >
            {filterLabel(candidate, copy)}
          </button>
        ))}
      </div>
      {visibleSegments.length === 0 ? (
        <p className="result-transcript-empty" role="status">
          {copy.transcriptNoMatches}
        </p>
      ) : (
        <ol
          ref={listRef}
          className="result-transcript-list"
          aria-label={copy.tabTranscript}
          onWheel={suppressAutoScroll}
          onTouchStart={suppressAutoScroll}
          onPointerDown={suppressAutoScroll}
        >
          {visibleSegments.map((segment) => {
            const current = activeOffset === segment.offsetMs;
            const timestamp = formatTranscriptTimestamp(segment.offsetMs);
            return (
              <li
                key={segment.offsetMs}
                ref={(row) => {
                  if (row) segmentRefs.current.set(segment.offsetMs, row);
                  else segmentRefs.current.delete(segment.offsetMs);
                }}
                aria-current={current ? 'true' : undefined}
                className="result-transcript-line"
              >
                <button
                  type="button"
                  aria-label={`${copy.timestampsSeek}: ${timestamp}`}
                  title={copy.timestampsSeek}
                  onClick={() => playSegment(segment.offsetMs)}
                >
                  {timestamp}
                </button>
                <p>
                  {speakerLabels && segment.speakerLabel ? (
                    <strong>{segment.speakerLabel}</strong>
                  ) : null}
                  <span>{segment.text}</span>
                </p>
              </li>
            );
          })}
        </ol>
      )}
      <footer className="result-transcript-footer">
        <div>
          <span>{copy.transcriptSpeakerLabels}</span>
          <button
            type="button"
            role="switch"
            aria-label={copy.transcriptSpeakerLabels}
            aria-checked={speakerLabels}
            disabled={!reliableSpeakers}
            onClick={() => {
              setSpeakerLabels((shown) => !shown);
              trackResultEvent({
                name: 'result_transcript_control_changed',
                control: 'speaker_labels',
              });
            }}
          >
            <span />
          </button>
        </div>
        {!reliableSpeakers ? (
          <span className="result-transcript-unavailable">
            {copy.transcriptSpeakerUnavailable}
          </span>
        ) : null}
        <div>
          <span>{copy.transcriptAutoScroll}</span>
          <button
            type="button"
            role="switch"
            aria-label={copy.transcriptAutoScroll}
            aria-checked={autoScroll}
            onClick={() => {
              setAutoScroll((enabled) => !enabled);
              trackResultEvent({
                name: 'result_transcript_control_changed',
                control: 'auto_scroll',
              });
            }}
          >
            <span />
          </button>
        </div>
      </footer>
    </section>
  );
}
