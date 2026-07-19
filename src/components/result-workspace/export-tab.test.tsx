import { useState } from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resultCopy } from '@/lib/result-workspace/copy';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

import {
  ExportTab,
  initialExportUiState,
  type ExportUiState,
} from './export-tab';

const model: ResultWorkspaceModel = {
  source: {
    intakeId: '5c28b973-7e73-480a-8e53-c07345bde584',
    youtubeVideoId: 'dQw4w9WgXcQ',
    title: 'Current draft title',
    channelTitle: 'Gleen Studio',
    durationSeconds: 900,
    thumbnailUrl: 'https://example.com/thumb.jpg',
  },
  revision: 1,
  revisions: {
    title: '2026-07-18T00:00:00.000Z',
    summary: '2026-07-18T00:01:00.000Z',
    flashcards: '2026-07-18T00:01:00.000Z',
    timestamps: '2026-07-18T00:01:00.000Z',
  },
  overview: {
    outcome: 'Draft result.',
    durationSeconds: 900,
    summarySectionCount: 1,
    flashcardCount: 1,
    reviewedFlashcardCount: 0,
    keyMomentCount: 1,
    transcriptWordCount: 3,
    currentTimeSeconds: 0,
    currentChapter: null,
    availableExports: ['markdown', 'obsidian', 'notebooklm'],
  },
  userState: null,
  tabs: {
    summary: {
      status: 'ready',
      data: {
        schemaVersion: 2,
        title: 'Draft summary title',
        outcome: 'Draft overview.',
        overview: 'Draft overview.',
        sections: [
          {
            title: 'Draft point',
            summary: 'Draft point',
            details: 'Draft point details',
            supportingQuote: null,
            sourceOffsetMs: null,
          },
        ],
        keyPoints: [{ text: 'Draft point', sourceOffsetMs: null }],
      },
    },
    flashcards: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        cards: [{ front: 'Draft question?', back: 'Draft answer.' }],
      },
    },
    timestamps: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        chapters: [
          {
            offsetMs: 0,
            title: 'Draft chapter',
            description: 'Draft chapter details.',
          },
        ],
      },
    },
    transcript: {
      status: 'ready',
      data: {
        schemaVersion: 2,
        language: 'en',
        segments: [
          {
            text: 'Draft transcript segment.',
            offsetMs: 0,
            durationMs: 3_000,
            segmentType: 'other',
            speakerLabel: null,
          },
        ],
      },
    },
  },
};

afterEach(() => {
  vi.restoreAllMocks();
});

function ExportTabHarness({
  value,
  copy = resultCopy.en,
}: Readonly<{
  value: ResultWorkspaceModel;
  copy?: (typeof resultCopy)[keyof typeof resultCopy];
}>) {
  const [uiState, setUiState] = useState<ExportUiState>(initialExportUiState);
  return (
    <ExportTab
      model={value}
      copy={copy}
      uiState={uiState}
      onUiStateChange={setUiState}
    />
  );
}

function renderExportTab(
  value: ResultWorkspaceModel = model,
  copy: (typeof resultCopy)[keyof typeof resultCopy] = resultCopy.en,
) {
  return render(<ExportTabHarness value={value} copy={copy} />);
}

describe('ExportTab', () => {
  it('matches the three-step destination, inclusion, preview, action, and privacy composition', () => {
    renderExportTab();

    expect(
      screen.getByRole('heading', { name: resultCopy.en.exportTitle }),
    ).toBeVisible();
    expect(screen.getByText('1')).toBeVisible();
    expect(screen.getByText('2')).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();
    expect(
      screen.getByRole('button', { name: /Markdown.*Clean document/i }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByRole('button', { name: /Obsidian.*backlinks/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /NotebookLM.*manual upload/i }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: /Notion.*Connection required/i }),
    ).toBeDisabled();
    expect(screen.getAllByRole('checkbox')).toHaveLength(5);
    expect(screen.getByTestId('export-preview')).toHaveTextContent(
      'Current draft title',
    );
    expect(
      screen.getByRole('button', { name: 'Export to Markdown' }),
    ).toBeEnabled();
    expect(
      screen.getByText('Your data remains private and is never shared.'),
    ).toBeVisible();
  });

  it('disables unavailable artifact options with honest localized reasons', () => {
    const unavailableModel: ResultWorkspaceModel = {
      ...model,
      tabs: {
        ...model.tabs,
        summary: { status: 'unavailable', reason: 'failed', errorCode: 'x' },
        timestamps: { status: 'unavailable', reason: 'pending' },
        transcript: { status: 'unavailable', reason: 'missing' },
      },
    };
    renderExportTab(unavailableModel);

    expect(screen.getByRole('checkbox', { name: /Summary/i })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: /Key takeaways/i }),
    ).toBeDisabled();
    expect(screen.getByRole('checkbox', { name: /Chapters/i })).toBeDisabled();
    expect(
      screen.getByRole('checkbox', { name: /Full transcript/i }),
    ).toBeDisabled();
    expect(
      screen.getAllByText(resultCopy.en.stateFailed).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(resultCopy.en.stateProcessing).length,
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByText(resultCopy.en.stateMissing).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('checkbox', { name: /metadata/i })).toBeEnabled();
  });

  it('disables export and explains an empty selection', async () => {
    const user = userEvent.setup();
    renderExportTab();

    for (const checkbox of screen.getAllByRole('checkbox')) {
      if ((checkbox as HTMLInputElement).checked) {
        await user.click(checkbox);
      }
    }

    expect(screen.getByTestId('export-preview')).toHaveTextContent(
      resultCopy.en.exportEmpty,
    );
    expect(
      screen.getByRole('button', { name: 'Export to Markdown' }),
    ).toBeDisabled();
  });

  it('uses exactly the preview bytes for copy and download', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const blobs: Blob[] = [];
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: vi.fn((blob: Blob) => {
        blobs.push(blob);
        return 'blob:export';
      }),
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: vi.fn(),
    });
    const downloads: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      downloads.push(this.download);
    });
    renderExportTab();

    const preview = screen.getByTestId('export-preview').textContent ?? '';
    await user.click(screen.getByRole('button', { name: 'Copy Markdown' }));
    await user.click(
      screen.getByRole('button', { name: 'Export to Markdown' }),
    );

    expect(writeText).toHaveBeenCalledWith(preview);
    expect(blobs).toHaveLength(1);
    expect(await blobs[0]!.text()).toBe(preview);
    expect(downloads).toEqual(['current-draft-title-markdown.md']);
  });

  it('renders disconnected Notion and all surrounding copy in the selected locale', () => {
    renderExportTab(model, resultCopy.de);

    const notion = screen.getByRole('button', {
      name: new RegExp(
        `${resultCopy.de.exportNotion}.*${resultCopy.de.exportConnectionRequired}`,
        'i',
      ),
    });
    expect(notion).toBeDisabled();
    expect(
      within(notion).getByText(resultCopy.de.exportConnectionRequired),
    ).toBeVisible();
    expect(screen.queryByText('Connection required')).toBeNull();
    expect(
      screen.getByRole('heading', { name: resultCopy.de.exportTitle }),
    ).toBeVisible();
  });

  it('disables and unchecks a ready transcript that has no segments', () => {
    const transcriptFixture = model.tabs.transcript;
    if (transcriptFixture.status !== 'ready') {
      throw new Error('Expected a ready transcript fixture');
    }
    renderExportTab({
      ...model,
      tabs: {
        ...model.tabs,
        transcript: {
          status: 'ready',
          data: { ...transcriptFixture.data, segments: [] },
        },
      },
    });

    const transcript = screen.getByRole('checkbox', {
      name: /Full transcript/i,
    });
    expect(transcript).toBeDisabled();
    expect(transcript).not.toBeChecked();
    expect(screen.getByText(resultCopy.en.stateMissing)).toBeVisible();
  });
});
