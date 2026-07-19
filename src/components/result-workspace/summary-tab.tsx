'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import type { SummaryArtifact } from '@/lib/analysis-pipeline/artifact-schemas';
import type { ResultSaveState } from '@/lib/result-workspace/actions';
import { formatResultCopy, type ResultCopy } from '@/lib/result-workspace/copy';
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

function serializeSummary(content: SummaryPresentation): SummaryArtifact {
  if (content.schemaVersion === 1) {
    return {
      schemaVersion: 1,
      title: content.title,
      overview: content.overview,
      keyPoints: content.keyPoints.map((point) => point.text),
    };
  }
  if (content.schemaVersion === 2) {
    if (content.keyPoints.some((point) => point.sourceOffsetMs === null)) {
      return {
        schemaVersion: 1,
        title: content.title,
        overview: content.overview,
        keyPoints: content.keyPoints.map((point) => point.text),
      };
    }
    return {
      schemaVersion: 2,
      title: content.title,
      overview: content.overview,
      keyPoints: content.keyPoints.map((point) => ({
        text: point.text,
        sourceOffsetMs: point.sourceOffsetMs!,
      })),
    };
  }
  return {
    schemaVersion: 3,
    title: content.title,
    outcome: content.overview,
    sections: content.sections.map((section, index) => ({
      ...section,
      summary: content.keyPoints[index]?.text ?? section.summary,
    })),
  };
}

export function SummaryTab({
  analysisId,
  summary,
  onSummaryChange,
  revision,
  saveArtifact,
  flashcardCount,
  copy,
}: Readonly<{
  analysisId: string;
  summary: SummaryPresentation;
  onSummaryChange: (summary: SummaryPresentation) => void;
  revision: string;
  saveArtifact: (input: unknown) => Promise<ResultSaveState>;
  flashcardCount: number | null;
  copy: ResultCopy;
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
        content: serializeSummary(content),
      }),
    [analysisId, saveArtifact],
  );
  const autosave = useAutosave({ value, revision, save });
  const disclosurePrefix = useId();
  const [openSections, setOpenSections] = useState<ReadonlySet<number>>(
    () => new Set(value.sections.length > 0 ? [0] : []),
  );
  const [copyMessage, setCopyMessage] = useState('');
  const readingMinutes = useMemo(() => {
    const words = value.sections
      .flatMap((section) =>
        `${section.summary} ${section.details}`.split(/\s+/u),
      )
      .filter(Boolean).length;
    return Math.max(1, Math.ceil(words / 200));
  }, [value.sections]);
  const toggleSection = (index: number) => {
    setOpenSections((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const copySection = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyMessage(copy.summaryCopied);
    } catch {
      setCopyMessage(copy.summaryCopyFailed);
    }
  };
  return (
    <article className="result-summary" data-artifact="summary">
      <header className="result-summary-hero">
        <div className="result-summary-hero-copy">
          <p className="result-summary-eyebrow">{copy.summaryOneSentence}</p>
          <textarea
            aria-label={copy.summaryOverviewField}
            value={value.overview}
            onChange={(event) =>
              setValue((current) => ({
                ...current,
                outcome: event.target.value,
                overview: event.target.value,
              }))
            }
            rows={3}
            className="result-summary-overview"
          />
        </div>
        <svg
          className="result-summary-prism"
          viewBox="0 0 110 95"
          aria-hidden="true"
        >
          <path d="M54 8 96 84H13Z" />
          <path d="M54 8v76M13 84h83M54 49h54" />
        </svg>
      </header>
      <dl className="result-summary-stats">
        <div className="result-summary-stat">
          <dd>{value.sections.length}</dd>
          <dt>{copy.summaryStructuredSections}</dt>
        </div>
        <div className="result-summary-stat">
          <dd>
            {formatResultCopy(copy.summaryReadingMinutes, {
              count: readingMinutes,
            })}
          </dd>
          <dt>{copy.summaryReadingTime}</dt>
        </div>
        <div className="result-summary-stat">
          <dd>{flashcardCount ?? '—'}</dd>
          <dt>{copy.summaryStudyCards}</dt>
        </div>
      </dl>
      <ol className="result-summary-accordions">
        {value.sections.map((section, index) => {
          const point = value.keyPoints[index];
          const open = openSections.has(index);
          const contentId = `${disclosurePrefix}-${index}`;
          return (
            <li
              key={`${section.sourceOffsetMs ?? 'none'}-${index}`}
              className="result-summary-accordion"
              data-open={open ? 'true' : 'false'}
            >
              <button
                type="button"
                className="result-summary-disclosure"
                aria-expanded={open}
                aria-controls={contentId}
                onClick={() => toggleSection(index)}
              >
                <span className="result-summary-index">{index + 1}</span>
                <span>
                  <strong>{section.title}</strong>
                  <span>{section.summary}</span>
                </span>
                <span className="result-summary-arrow" aria-hidden="true">
                  ⌄
                </span>
              </button>
              <div
                id={contentId}
                className="result-summary-content"
                hidden={!open}
              >
                <p>{section.details}</p>
                {section.supportingQuote ? (
                  <blockquote>“{section.supportingQuote}”</blockquote>
                ) : null}
                {index === 0 ? (
                  <input
                    aria-label={copy.summaryTitleField}
                    value={value.title}
                    onChange={(event) =>
                      setValue((current) => ({
                        ...current,
                        title: event.target.value,
                      }))
                    }
                    className="result-summary-title-input"
                  />
                ) : null}
                <textarea
                  aria-label={formatResultCopy(copy.summaryPointField, {
                    count: index + 1,
                  })}
                  value={point?.text ?? section.summary}
                  rows={2}
                  onChange={(event) => {
                    const text = event.target.value;
                    setValue((current) => ({
                      ...current,
                      sections: current.sections.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, summary: text } : item,
                      ),
                      keyPoints: current.keyPoints.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, text } : item,
                      ),
                    }));
                  }}
                  className="result-summary-point-input"
                />
                <div className="result-summary-actions">
                  <button
                    type="button"
                    onClick={() => void copySection(section.details)}
                    aria-label={`${copy.summaryCopy} ${section.title}`}
                  >
                    {copy.summaryCopy}
                  </button>
                  {section.sourceOffsetMs !== null ? (
                    <button
                      type="button"
                      title={copy.summarySource}
                      onClick={() => player?.seekTo(section.sourceOffsetMs!)}
                    >
                      {formatOffset(section.sourceOffsetMs)}
                    </button>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ol>
      <AutosaveStatus {...autosave} copy={copy} />
      {copyMessage ? (
        <p className="result-artifact-message" role="status" aria-live="polite">
          {copyMessage}
        </p>
      ) : null}
    </article>
  );
}
