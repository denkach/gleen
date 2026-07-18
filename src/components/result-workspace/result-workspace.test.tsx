import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

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
  tabs: {
    summary: {
      status: 'ready',
      data: {
        schemaVersion: 2,
        title: 'A structured summary',
        overview: 'Prisms separate one source into useful outputs.',
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
          { offsetMs: 0, title: 'Opening', description: 'The premise' },
          { offsetMs: 755_000, title: 'Sources', description: 'Grounding' },
        ],
      },
    },
    transcript: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        language: 'en',
        segments: [
          { text: 'A prism separates light.', offsetMs: 0, durationMs: 3_000 },
          {
            text: 'Sources stay grounded.',
            offsetMs: 755_000,
            durationMs: 2_000,
          },
        ],
      },
    },
  },
};

function renderWorkspace(value: ResultWorkspaceModel = model) {
  return render(
    <PlayerProvider controller={controller}>
      <ResultWorkspace
        model={value}
        saveTitle={vi.fn()}
        saveArtifact={vi.fn()}
      />
    </PlayerProvider>,
  );
}

describe('ResultWorkspace', () => {
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
    expect(flashcards).toHaveAttribute('aria-disabled', 'true');
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
    await user.click(card);
    expect(screen.getByText('Separates light.')).toBeVisible();
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
