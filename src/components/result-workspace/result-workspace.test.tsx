import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resultArtifactEditSchema } from '@/lib/result-workspace/edit-schemas';
import { resultCopy } from '@/lib/result-workspace/copy';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

import { PlayerProvider } from './player-context';
import type { VideoPlayerController } from './player-controller';
import { ResultWorkspace } from './result-workspace';

const controller: VideoPlayerController = {
  seekTo: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  getCurrentTimeMs: vi.fn(() => 0),
};

const model: ResultWorkspaceModel = {
  source: {
    intakeId: '5c28b973-7e73-480a-8e53-c07345bde584',
    youtubeVideoId: 'dQw4w9WgXcQ',
    title: 'Light and learning',
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
    outcome: 'Prisms separate one source into useful outputs.',
    durationSeconds: 900,
    summarySectionCount: 2,
    flashcardCount: 2,
    reviewedFlashcardCount: 0,
    keyMomentCount: 2,
    transcriptWordCount: 7,
    currentTimeSeconds: 0,
    currentChapter: {
      id: 'chapter-0',
      title: 'Opening',
      startSeconds: 0,
      endSeconds: 755,
    },
    availableExports: ['markdown', 'obsidian', 'notebooklm'],
  },
  userState: {
    favorite: false,
    playbackPositionMs: 0,
    lastArtifact: 'overview',
    lastStudyAction: null,
    reviews: [],
  },
  tabs: {
    summary: {
      status: 'ready',
      data: {
        schemaVersion: 2,
        title: 'A structured summary',
        outcome: 'Prisms separate one source into useful outputs.',
        overview: 'Prisms separate one source into useful outputs.',
        sections: [
          {
            title: 'Legacy text remains readable.',
            summary: 'Legacy text remains readable.',
            details: 'Legacy text remains readable.',
            supportingQuote: null,
            sourceOffsetMs: null,
          },
          {
            title: 'Sources remain grounded.',
            summary: 'Sources remain grounded.',
            details: 'Sources remain grounded.',
            supportingQuote: null,
            sourceOffsetMs: 755_000,
          },
        ],
        keyPoints: [
          { text: 'Legacy text remains readable.', sourceOffsetMs: null },
          { text: 'Sources remain grounded.', sourceOffsetMs: 755_000 },
        ],
      },
    },
    flashcards: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        cards: [
          { front: 'What does a prism do?', back: 'Separates light.' },
          { front: 'What stays grounded?', back: 'Source links.' },
        ],
      },
    },
    timestamps: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        chapters: [
          {
            offsetMs: 0,
            title: 'Opening',
            description: 'The premise',
            durationMs: 755_000,
          },
          {
            offsetMs: 755_000,
            title: 'Sources',
            description: 'Grounding',
            durationMs: 145_000,
          },
        ],
      },
    },
    transcript: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        language: 'en',
        segments: [
          {
            text: 'A prism separates light.',
            offsetMs: 0,
            durationMs: 3_000,
            segmentType: 'other',
            speakerLabel: null,
          },
          {
            text: 'Sources stay grounded.',
            offsetMs: 755_000,
            durationMs: 2_000,
            segmentType: 'other',
            speakerLabel: null,
          },
        ],
      },
    },
  },
};

const partialModel: ResultWorkspaceModel = {
  ...model,
  tabs: {
    ...model.tabs,
    flashcards: {
      status: 'unavailable',
      reason: 'failed',
      errorCode: 'generation_failed',
    },
    transcript: { status: 'unavailable', reason: 'pending' },
  },
};

function renderWorkspace(value: ResultWorkspaceModel = model) {
  return render(
    <PlayerProvider controller={controller}>
      <ResultWorkspace
        model={value}
        saveTitle={vi.fn().mockResolvedValue({ status: 'error' })}
        saveArtifact={vi.fn().mockResolvedValue({ status: 'error' })}
      />
    </PlayerProvider>,
  );
}

function renderWorkspaceWithActions({
  saveTitle = vi.fn(),
  saveArtifact = vi.fn(),
  value = model,
}: Readonly<{
  saveTitle?: (
    input: unknown,
  ) => Promise<
    { status: 'saved'; updatedAt: string } | { status: 'conflict' | 'error' }
  >;
  saveArtifact?: (
    input: unknown,
  ) => Promise<
    { status: 'saved'; updatedAt: string } | { status: 'conflict' | 'error' }
  >;
  value?: ResultWorkspaceModel;
}>) {
  return render(
    <PlayerProvider controller={controller}>
      <ResultWorkspace
        model={value}
        saveTitle={saveTitle}
        saveArtifact={saveArtifact}
      />
    </PlayerProvider>,
  );
}

describe('ResultWorkspace', () => {
  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('uses the supplied interface copy for result navigation', () => {
    render(
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={model}
          copy={resultCopy.de}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
        />
      </PlayerProvider>,
    );

    expect(
      screen.getByRole('tablist', { name: resultCopy.de.tabsLabel }),
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: resultCopy.de.tabOverview }),
    ).toBeVisible();
    expect(
      screen.getByRole('tab', { name: resultCopy.de.tabTranscript }),
    ).toBeVisible();
  });

  it('initializes from the hash, pushes user navigation, and follows browser history', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/app/video/result#summary');
    const replaceState = vi.spyOn(window.history, 'replaceState');
    const pushState = vi.spyOn(window.history, 'pushState');

    const view = renderWorkspace();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(replaceState).toHaveBeenCalledWith(
      null,
      '',
      '/app/video/result#summary',
    );

    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    expect(pushState).toHaveBeenLastCalledWith(
      null,
      '',
      '/app/video/result#flashcards',
    );

    window.history.replaceState(null, '', '/app/video/result#overview');
    window.dispatchEvent(new PopStateEvent('popstate'));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );

    view.unmount();
    replaceState.mockRestore();
    pushState.mockRestore();
    window.history.replaceState(null, '', '/');
  });

  it('canonicalizes an unavailable initial artifact hash to Overview', async () => {
    window.history.replaceState(null, '', '/app/video/result#flashcards');
    const replaceState = vi.spyOn(window.history, 'replaceState');

    renderWorkspace(partialModel);

    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(replaceState).toHaveBeenLastCalledWith(
      null,
      '',
      '/app/video/result#overview',
    );
  });

  it('resolves history events for unavailable artifacts while keeping direct state panels reachable', async () => {
    const user = userEvent.setup();
    window.history.replaceState(null, '', '/app/video/result#overview');
    renderWorkspace(partialModel);

    const unavailableFlashcards = screen.getByRole('tab', {
      name: 'Flashcards',
    });
    await user.click(unavailableFlashcards);
    expect(screen.getByText(/could not be generated/i)).toBeVisible();
    expect(window.location.hash).toBe('#flashcards');

    window.history.replaceState(null, '', '/app/video/result#transcript');
    act(() => window.dispatchEvent(new PopStateEvent('popstate')));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );

    await user.click(unavailableFlashcards);
    window.history.replaceState(null, '', '/app/video/result#transcript');
    act(() => window.dispatchEvent(new HashChangeEvent('hashchange')));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
  });

  it('renders six accessible tabs with automatic arrow-key navigation', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    expect(screen.getAllByRole('tab')).toHaveLength(6);
    const overview = screen.getByRole('tab', { name: 'Overview' });
    overview.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('maps the active artifact tab to its shared spectral accent', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    const tablist = screen.getByRole('tablist', { name: 'Result artifacts' });

    for (const [label, accent] of [
      ['Summary', 'summary'],
      ['Flashcards', 'flashcards'],
      ['Timestamps', 'timestamps'],
      ['Export', 'export'],
    ] as const) {
      await user.click(screen.getByRole('tab', { name: label }));
      expect(tablist).toHaveAttribute('data-accent', accent);
    }
  });

  it('keeps unavailable tabs reachable and explains failed and corrupted states', async () => {
    const user = userEvent.setup();
    renderWorkspace({
      ...model,
      tabs: {
        ...model.tabs,
        flashcards: {
          status: 'unavailable',
          reason: 'failed',
          errorCode: 'generation_failed',
        },
        timestamps: { status: 'unavailable', reason: 'malformed' },
      },
    });
    const flashcards = screen.getByRole('tab', { name: 'Flashcards' });
    expect(flashcards).toHaveAttribute('data-artifact-unavailable', 'true');
    await user.click(flashcards);
    expect(screen.getByText(/could not be generated/i)).toBeVisible();
    await user.click(screen.getByRole('tab', { name: 'Timestamps' }));
    expect(screen.getByText(/could not be read/i)).toBeVisible();
  });

  it('renders legacy summary text and seeks v2 sources through the adapter', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    expect(screen.getByText('Legacy text remains readable.')).toBeVisible();
    expect(screen.queryByRole('button', { name: '0:00' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '12:35' }));
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
  });

  it('flips and navigates flashcards, records study actions, and supports reduced motion', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    const card = screen.getByRole('button', { name: /show answer/i });
    const scene = card.querySelector('[data-flashcard-scene]');
    expect(scene).toHaveClass('[transform-style:preserve-3d]');
    expect(scene).not.toHaveClass('[transform:rotateY(180deg)]');
    expect(
      within(card).getByText('Separates light.').closest('[aria-hidden]'),
    ).toHaveClass(
      '[backface-visibility:hidden]',
      '[transform:rotateY(180deg)]',
    );
    await user.click(card);
    expect(scene).toHaveClass('[transform:rotateY(180deg)]');
    expect(card).toHaveClass(
      'motion-reduce:[&_[data-flashcard-scene]]:transition-none',
    );
    await user.click(screen.getByRole('button', { name: 'Next card' }));
    expect(screen.getByText('What stays grounded?')).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Previous card' }));
    for (const label of ['Again', 'Hard', 'Got it']) {
      expect(screen.getByRole('button', { name: label })).toBeVisible();
    }
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(screen.getByText(/1 studied/i)).toBeVisible();
    expect(card.closest('[data-reduced-motion]')).toBeTruthy();
  });

  it('clamps the current flashcard when a refreshed deck is shorter', async () => {
    const user = userEvent.setup();
    const view = renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    await user.click(screen.getByRole('button', { name: 'Next card' }));

    view.rerender(
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={{
            ...model,
            revisions: {
              ...model.revisions,
              flashcards: '2026-07-18T00:02:00.000Z',
            },
            tabs: {
              ...model.tabs,
              flashcards: {
                status: 'ready',
                data: {
                  schemaVersion: 1,
                  cards: [{ front: 'Refreshed card', back: 'Fresh answer' }],
                },
              },
            },
          }}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
        />
      </PlayerProvider>,
    );

    expect(screen.getByText('Refreshed card')).toBeVisible();
    expect(screen.getByText('1 / 1')).toBeVisible();
  });

  it('preserves a local artifact draft across same-revision parent rerenders', async () => {
    const user = userEvent.setup();
    const view = renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    const title = screen.getByRole('textbox', { name: 'Summary title' });
    await user.clear(title);
    await user.type(title, 'Unsaved local summary');

    view.rerender(
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={{ ...model, revision: model.revision + 1 }}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
        />
      </PlayerProvider>,
    );

    expect(screen.getByRole('textbox', { name: 'Summary title' })).toHaveValue(
      'Unsaved local summary',
    );
  });

  it('seeks timestamps and exposes the active chapter', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Timestamps' }));
    await user.click(screen.getByRole('button', { name: '12:35' }));
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
    expect(screen.getByText('Sources').closest('li')).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  it('updates the active timestamp from controller time polling', async () => {
    const user = userEvent.setup();
    const interval = vi
      .spyOn(window, 'setInterval')
      .mockImplementation((handler) => {
        expect(typeof handler).toBe('function');
        return {} as ReturnType<typeof setInterval>;
      });
    try {
      vi.mocked(controller.getCurrentTimeMs).mockReturnValue(0);
      renderWorkspace();
      await user.click(screen.getByRole('tab', { name: 'Timestamps' }));
      expect(screen.getByText('Opening').closest('li')).toHaveAttribute(
        'aria-current',
        'true',
      );

      vi.mocked(controller.getCurrentTimeMs).mockReturnValue(755_000);
      await act(async () => {
        const synchronize = interval.mock.calls
          .filter(([, delay]) => delay === 500)
          .at(-1)?.[0];
        if (typeof synchronize === 'function') synchronize();
      });

      expect(screen.getByText('Sources').closest('li')).toHaveAttribute(
        'aria-current',
        'true',
      );
    } finally {
      interval.mockRestore();
      vi.mocked(controller.getCurrentTimeMs).mockReturnValue(0);
    }
  });

  it('searches, reports zero results, copies, and seeks the read-only transcript', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Transcript' }));
    expect(
      screen.queryByRole('textbox', { name: /transcript text/i }),
    ).toBeNull();
    const search = screen.getByRole('searchbox', { name: 'Search transcript' });
    await user.type(search, 'grounded');
    expect(screen.getByText('Sources stay grounded.')).toBeVisible();
    expect(screen.queryByText('A prism separates light.')).toBeNull();
    await user.clear(search);
    await user.type(search, 'missing');
    expect(screen.getByText('No transcript matches')).toBeVisible();
    await user.clear(search);
    await user.click(screen.getByRole('button', { name: 'Copy transcript' }));
    expect(writeText).toHaveBeenCalledWith(
      'A prism separates light.\nSources stay grounded.',
    );
    const transcript = screen.getByRole('tabpanel', { name: 'Transcript' });
    await user.click(within(transcript).getByRole('button', { name: '12:35' }));
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
  });

  it('tracks player time and marks the active transcript segment accessibly', async () => {
    const interval = vi.spyOn(window, 'setInterval');
    try {
      renderWorkspace();
      await userEvent.click(screen.getByRole('tab', { name: 'Transcript' }));
      const transcript = screen.getByRole('tabpanel', { name: 'Transcript' });
      expect(
        within(transcript).getByText('A prism separates light.').closest('li'),
      ).toHaveAttribute('aria-current', 'true');

      vi.mocked(controller.getCurrentTimeMs).mockReturnValue(755_500);
      await act(async () => {
        const synchronize = interval.mock.calls
          .filter(([, delay]) => delay === 500)
          .at(-1)?.[0];
        if (typeof synchronize === 'function') synchronize();
      });

      expect(
        within(transcript).getByText('Sources stay grounded.').closest('li'),
      ).toHaveAttribute('aria-current', 'true');
      expect(
        within(transcript).getByText('A prism separates light.').closest('li'),
      ).not.toHaveAttribute('aria-current');
    } finally {
      interval.mockRestore();
      vi.mocked(controller.getCurrentTimeMs).mockReturnValue(0);
    }
  });

  it('reports clipboard rejection without leaking an unhandled error', async () => {
    const user = userEvent.setup();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: vi.fn().mockRejectedValue(new Error('denied')) },
    });
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Transcript' }));
    await user.click(screen.getByRole('button', { name: 'Copy transcript' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Transcript could not be copied',
    );
  });

  it('keeps the result title controlled and saves with compare-and-set data', async () => {
    const user = userEvent.setup();
    const saveTitle = vi.fn().mockResolvedValue({ status: 'conflict' });
    renderWorkspaceWithActions({ saveTitle });

    const title = screen.getByRole('textbox', { name: 'Result title' });
    await user.clear(title);
    await user.type(title, 'Edited result');
    expect(title).toHaveValue('Edited result');
    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));

    expect(saveTitle).toHaveBeenCalledWith({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: model.revisions.title,
      title: 'Edited result',
    });
    expect(screen.getByText(/newer version is available/i)).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    expect(title).toHaveValue('Edited result');
  });

  it('autosaves edited summary content through the artifact action', async () => {
    const user = userEvent.setup();
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:02:00.000Z',
    });
    renderWorkspaceWithActions({ saveArtifact });
    await user.click(screen.getByRole('tab', { name: 'Summary' }));

    const overview = screen.getByRole('textbox', { name: 'Summary overview' });
    await user.clear(overview);
    await user.type(overview, 'Edited overview');
    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));

    expect(saveArtifact).toHaveBeenCalledWith({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: model.revisions.summary,
      kind: 'summary',
      content: expect.objectContaining({ overview: 'Edited overview' }),
    });
    const payload = saveArtifact.mock.calls.at(-1)?.[0];
    expect(resultArtifactEditSchema.parse(payload)).toMatchObject({
      kind: 'summary',
      content: {
        schemaVersion: 1,
        title: 'A structured summary',
        overview: 'Edited overview',
        keyPoints: [
          'Legacy text remains readable.',
          'Sources remain grounded.',
        ],
      },
    });
    expect(screen.getByText('Saved')).toBeVisible();
  });

  it('autosaves normalized summary v3 without downgrade or section data loss', async () => {
    const user = userEvent.setup();
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:02:00.000Z',
    });
    const value: ResultWorkspaceModel = {
      ...model,
      tabs: {
        ...model.tabs,
        summary: {
          status: 'ready',
          data: {
            schemaVersion: 3,
            title: 'Summary v3',
            outcome: 'Original outcome',
            overview: 'Original outcome',
            sections: [
              {
                title: 'Stable section title',
                summary: 'Original section summary',
                details: 'Preserve these details.',
                supportingQuote: 'A prism separates light.',
                sourceOffsetMs: 0,
              },
            ],
            keyPoints: [
              { text: 'Original section summary', sourceOffsetMs: 0 },
            ],
          },
        },
      },
    };
    renderWorkspaceWithActions({ saveArtifact, value });
    await user.click(screen.getByRole('tab', { name: 'Summary' }));

    fireEvent.change(
      screen.getByRole('textbox', { name: 'Summary overview' }),
      { target: { value: 'Edited outcome' } },
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Summary point 1' }), {
      target: { value: 'Edited section summary' },
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));

    const payload = saveArtifact.mock.calls.at(-1)?.[0];
    expect(resultArtifactEditSchema.parse(payload)).toEqual({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: model.revisions.summary,
      kind: 'summary',
      content: {
        schemaVersion: 3,
        title: 'Summary v3',
        outcome: 'Edited outcome',
        sections: [
          {
            title: 'Stable section title',
            summary: 'Edited section summary',
            details: 'Preserve these details.',
            supportingQuote: 'A prism separates light.',
            sourceOffsetMs: 0,
          },
        ],
      },
    });
  });

  it('strips derived chapter duration before strict timestamps autosave', async () => {
    const user = userEvent.setup();
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:02:00.000Z',
    });
    renderWorkspaceWithActions({ saveArtifact });
    await user.click(screen.getByRole('tab', { name: 'Timestamps' }));
    fireEvent.change(screen.getByRole('textbox', { name: 'Chapter 1 title' }), {
      target: { value: 'Edited opening' },
    });
    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));

    const payload = saveArtifact.mock.calls.at(-1)?.[0];
    const parsed = resultArtifactEditSchema.parse(payload);
    expect(parsed).toMatchObject({
      kind: 'timestamps',
      content: {
        schemaVersion: 1,
        chapters: [
          {
            offsetMs: 0,
            title: 'Edited opening',
            description: 'The premise',
          },
          {
            offsetMs: 755_000,
            title: 'Sources',
            description: 'Grounding',
          },
        ],
      },
    });
    if (parsed.kind === 'timestamps') {
      expect(parsed.content.chapters[0]).not.toHaveProperty('durationMs');
    }
  });

  it('finishes artifact autosave after switching tabs during the debounce', async () => {
    const user = userEvent.setup();
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:02:00.000Z',
    });
    const view = renderWorkspaceWithActions({ saveArtifact });
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Summary overview' }),
      { target: { value: 'Save after navigation' } },
    );
    await user.click(screen.getByRole('tab', { name: 'Overview' }));

    expect(
      view.container.querySelector('[id$="content-summary"]'),
    ).toHaveAttribute('aria-hidden', 'true');

    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));

    expect(saveArtifact).toHaveBeenCalledTimes(1);
    expect(saveArtifact).toHaveBeenCalledWith({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: model.revisions.summary,
      kind: 'summary',
      content: expect.objectContaining({ overview: 'Save after navigation' }),
    });
  });

  it('copies and downloads local exports and leaves Notion unavailable', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockRejectedValue(new Error('denied'));
    const createObjectURL = vi.fn(() => 'blob:result');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    Object.defineProperty(URL, 'createObjectURL', {
      configurable: true,
      value: createObjectURL,
    });
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      value: revokeObjectURL,
    });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Export' }));

    expect(screen.getByText('Connection required')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /export to notion/i }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Copy Markdown' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/could not copy/i);
    await user.click(screen.getByRole('button', { name: 'Download Markdown' }));
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:result');
  });

  it('exports the current visible title and artifact edits', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderWorkspace();

    const title = screen.getByRole('textbox', { name: 'Result title' });
    await user.clear(title);
    await user.type(title, 'Draft export title');
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    const overview = screen.getByRole('textbox', { name: 'Summary overview' });
    await user.clear(overview);
    await user.type(overview, 'Draft export overview');
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    const question = screen.getByRole('textbox', {
      name: 'Flashcard question',
    });
    await user.clear(question);
    await user.type(question, 'Draft export question?');
    await user.click(screen.getByRole('tab', { name: 'Timestamps' }));
    const chapter = screen.getByRole('textbox', { name: 'Chapter 1 title' });
    await user.clear(chapter);
    await user.type(chapter, 'Draft export chapter');
    await user.click(screen.getByRole('tab', { name: 'Export' }));
    await user.click(screen.getByRole('button', { name: 'Copy Markdown' }));

    const markdown = writeText.mock.calls[0]?.[0] as string;
    expect(markdown).toContain('# Draft export title');
    expect(markdown).toContain('Draft export overview');
    expect(markdown).toContain('Draft export question?');
    expect(markdown).toContain('Draft export chapter');
  });

  it.each([
    ['not requested', { status: 'unavailable', reason: 'not_requested' }],
    ['still processing', { status: 'unavailable', reason: 'pending' }],
    ['empty', { status: 'unavailable', reason: 'missing' }],
  ] as const)('renders the %s artifact state', async (_label, summary) => {
    const user = userEvent.setup();
    renderWorkspace({ ...model, tabs: { ...model.tabs, summary } });
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    expect(screen.getByRole('status')).toBeVisible();
  });
});
