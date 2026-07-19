'use client';

import { useState } from 'react';
import { trackResultEvent } from '@/lib/analytics/result-events';
import {
  exportFilename,
  serializeExport,
  type ExportDestination,
  type ExportSelection,
} from '@/lib/result-workspace/markdown';
import {
  formatResultCopy,
  resultCopy,
  type ResultCopy,
} from '@/lib/result-workspace/copy';
import type {
  ResultTab,
  ResultWorkspaceModel,
  UnavailableTab,
} from '@/lib/result-workspace/presentation';

type ExportMessage = Readonly<{
  kind: 'status' | 'error';
  text: string;
}>;

type SelectionKey = keyof ExportSelection;

function unavailableCopy(state: UnavailableTab, copy: ResultCopy): string {
  switch (state.reason) {
    case 'pending':
      return copy.stateProcessing;
    case 'not_requested':
      return copy.stateNotRequested;
    case 'missing':
      return copy.stateMissing;
    case 'failed':
      return copy.stateFailed;
    case 'malformed':
      return copy.stateMalformed;
  }
}

function unavailableReason<T>(
  tab: ResultTab<T>,
  copy: ResultCopy,
): string | undefined {
  return tab.status === 'ready' ? undefined : unavailableCopy(tab, copy);
}

function initialSelection(model: ResultWorkspaceModel): ExportSelection {
  const summaryReady = model.tabs.summary.status === 'ready';
  return {
    summary: summaryReady,
    keyTakeaways: summaryReady,
    chapters: model.tabs.timestamps.status === 'ready',
    transcript: false,
    metadata: true,
  };
}

export function ExportTab({
  model,
  copy = resultCopy.en,
}: Readonly<{
  model: ResultWorkspaceModel;
  copy?: ResultCopy;
}>) {
  const [destination, setDestination] = useState<ExportDestination>('markdown');
  const [selection, setSelection] = useState<ExportSelection>(() =>
    initialSelection(model),
  );
  const [message, setMessage] = useState<ExportMessage>();

  const destinationOptions: readonly Readonly<{
    id: ExportDestination | 'notion';
    label: string;
    icon: string;
    description: string;
    disabled?: boolean;
  }>[] = [
    {
      id: 'markdown',
      label: copy.exportMarkdown,
      icon: '#',
      description: copy.exportMarkdownDescription,
    },
    {
      id: 'notion',
      label: copy.exportNotion,
      icon: 'N',
      description: copy.exportNotionDescription,
      disabled: true,
    },
    {
      id: 'obsidian',
      label: copy.exportObsidian,
      icon: '◇',
      description: copy.exportObsidianDescription,
    },
    {
      id: 'notebooklm',
      label: copy.exportNotebookLm,
      icon: '◒',
      description: copy.exportNotebookLmDescription,
    },
  ];
  const selectionOptions: readonly Readonly<{
    id: SelectionKey;
    label: string;
    description: string;
    unavailable?: string;
  }>[] = [
    {
      id: 'summary',
      label: copy.exportIncludeSummary,
      description: copy.exportIncludeSummaryDescription,
      unavailable: unavailableReason(model.tabs.summary, copy),
    },
    {
      id: 'keyTakeaways',
      label: copy.exportIncludeKeyTakeaways,
      description: copy.exportIncludeKeyTakeawaysDescription,
      unavailable: unavailableReason(model.tabs.summary, copy),
    },
    {
      id: 'chapters',
      label: copy.exportIncludeChapters,
      description: copy.exportIncludeChaptersDescription,
      unavailable: unavailableReason(model.tabs.timestamps, copy),
    },
    {
      id: 'transcript',
      label: copy.exportIncludeTranscript,
      description: copy.exportIncludeTranscriptDescription,
      unavailable: unavailableReason(model.tabs.transcript, copy),
    },
    {
      id: 'metadata',
      label: copy.exportIncludeMetadata,
      description: copy.exportIncludeMetadataDescription,
    },
  ];
  const selectedDestination = destinationOptions.find(
    (option) => option.id === destination,
  )!;
  const hasSelection = Object.values(selection).some(Boolean);
  const serialized = serializeExport(model, destination, selection);
  const filename = exportFilename(model, destination);
  const actionLabel = formatResultCopy(copy.exportAction, {
    destination: selectedDestination.label,
  });
  const copyLabel = formatResultCopy(copy.exportCopy, {
    destination: selectedDestination.label,
  });

  const copyExport = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(serialized);
      trackResultEvent({ name: 'result_export_requested', destination });
      setMessage({
        kind: 'status',
        text: formatResultCopy(copy.exportCopied, {
          destination: selectedDestination.label,
        }),
      });
    } catch {
      setMessage({
        kind: 'error',
        text: formatResultCopy(copy.exportCopyFailed, {
          destination: selectedDestination.label,
        }),
      });
    }
  };

  const download = () => {
    let url: string | undefined;
    try {
      const blob = new Blob([serialized], {
        type: 'text/markdown;charset=utf-8',
      });
      url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      trackResultEvent({ name: 'result_export_requested', destination });
      setMessage({
        kind: 'status',
        text: formatResultCopy(copy.exportDownloaded, { filename }),
      });
    } catch {
      setMessage({
        kind: 'error',
        text: formatResultCopy(copy.exportDownloadFailed, {
          destination: selectedDestination.label,
        }),
      });
    } finally {
      if (url) URL.revokeObjectURL(url);
    }
  };

  return (
    <section className="result-export" data-artifact="export">
      <h2 className="sr-only">{copy.exportTitle}</h2>

      <div className="result-export-step">
        <span className="result-export-step-number" aria-hidden="true">
          1
        </span>
        <h3>{copy.exportChooseDestination}</h3>
      </div>
      <div className="result-export-destinations">
        {destinationOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            className="result-export-destination"
            data-active={option.id === destination || undefined}
            aria-pressed={
              option.id === 'notion' ? undefined : option.id === destination
            }
            disabled={option.disabled}
            onClick={() => {
              if (option.id !== 'notion') {
                setDestination(option.id);
                setMessage(undefined);
              }
            }}
          >
            <span className="result-export-destination-icon" aria-hidden="true">
              {option.icon}
            </span>
            <strong>{option.label}</strong>
            <span>{option.description}</span>
            {option.disabled && (
              <span className="result-export-connection">
                {copy.exportConnectionRequired}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="result-export-grid">
        <div>
          <div className="result-export-step">
            <span className="result-export-step-number" aria-hidden="true">
              2
            </span>
            <h3>{copy.exportChooseContents}</h3>
          </div>
          <div className="result-export-inclusions">
            {selectionOptions.map((option) => (
              <label
                key={option.id}
                className="result-export-inclusion"
                data-unavailable={option.unavailable ? true : undefined}
              >
                <input
                  type="checkbox"
                  checked={selection[option.id]}
                  disabled={Boolean(option.unavailable)}
                  onChange={(event) => {
                    const checked = event.currentTarget.checked;
                    setSelection((current) => ({
                      ...current,
                      [option.id]: checked,
                    }));
                    setMessage(undefined);
                  }}
                />
                <span>
                  <strong>{option.label}</strong>
                  <span>{option.description}</span>
                  {option.unavailable && (
                    <span className="result-export-unavailable">
                      {option.unavailable}
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <div className="result-export-step result-export-preview-heading">
            <span className="result-export-step-number" aria-hidden="true">
              3
            </span>
            <h3>{copy.exportPreview}</h3>
            <button
              type="button"
              className="result-export-copy"
              onClick={copyExport}
              disabled={!hasSelection}
            >
              {copyLabel}
            </button>
          </div>
          <div className="result-export-preview">
            <pre data-testid="export-preview">
              {hasSelection ? serialized : copy.exportEmpty}
            </pre>
          </div>
        </div>
      </div>

      <button
        type="button"
        className="result-export-action"
        disabled={!hasSelection}
        onClick={download}
      >
        <span aria-hidden="true">↓</span> {actionLabel}
      </button>
      {!hasSelection && (
        <p className="result-export-empty" role="status">
          {copy.exportEmpty}
        </p>
      )}
      <p className="result-export-privacy">
        <span aria-hidden="true">⌾</span> {copy.exportPrivacy}
      </p>
      {message && (
        <p
          className="result-export-message"
          role={message.kind === 'error' ? 'alert' : 'status'}
        >
          {message.text}
        </p>
      )}
    </section>
  );
}
