import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { resultCopy, type ResultCopy } from '@/lib/result-workspace/copy';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

import { OverviewTab } from './overview-tab';
import { PlayerProvider } from './player-context';
import type { VideoPlayerController } from './player-controller';

const readyModel: ResultWorkspaceModel = {
  source: {
    intakeId: 'anonymous-analysis-8',
    youtubeVideoId: 'video-8',
    title: 'The source title must not become an analytics property',
    channelTitle: 'Gleen Studio',
    durationSeconds: 900,
    thumbnailUrl: 'https://example.com/thumb.jpg',
  },
  revision: 8,
  revisions: {
    title: '2026-07-19T00:00:00.000Z',
    summary: '2026-07-19T00:01:00.000Z',
    flashcards: '2026-07-19T00:01:00.000Z',
    timestamps: '2026-07-19T00:01:00.000Z',
  },
  overview: {
    outcome: 'A prism turns one source into reusable knowledge.',
    durationSeconds: 900,
    summarySectionCount: 2,
    flashcardCount: 4,
    reviewedFlashcardCount: 1,
    keyMomentCount: 2,
    transcriptWordCount: 1_204,
    currentTimeSeconds: 370,
    currentChapter: {
      id: 'chapter-1',
      title: 'Build a useful system',
      startSeconds: 300,
      endSeconds: 500,
    },
    availableExports: ['markdown', 'obsidian', 'notebooklm'],
  },
  userState: {
    favorite: false,
    playbackPositionMs: 370_000,
    lastArtifact: 'overview',
    lastStudyAction: null,
    reviews: [
      {
        artifactRevision: '2026-07-19T00:01:00.000Z',
        cardIndex: 0,
        rating: 'got_it',
      },
    ],
  },
  tabs: {
    summary: {
      status: 'ready',
      data: {
        schemaVersion: 3,
        title: 'Detailed summary title',
        outcome: 'A prism turns one source into reusable knowledge.',
        overview: 'A prism turns one source into reusable knowledge.',
        sections: [
          {
            title: 'Detailed section one',
            summary: 'Detailed summary prose must remain in Summary.',
            details: 'Long-form explanation must never appear in Overview.',
            supportingQuote: 'A supporting quote belongs only in Summary.',
            sourceOffsetMs: 0,
          },
          {
            title: 'Detailed section two',
            summary: 'Another detailed section.',
            details: 'Another long-form explanation.',
            supportingQuote: null,
            sourceOffsetMs: 300_000,
          },
        ],
        keyPoints: [
          { text: 'Detailed section one', sourceOffsetMs: 0 },
          { text: 'Detailed section two', sourceOffsetMs: 300_000 },
        ],
      },
    },
    flashcards: {
      status: 'ready',
      data: {
        schemaVersion: 1,
        cards: [
          { front: 'One?', back: 'One.' },
          { front: 'Two?', back: 'Two.' },
          { front: 'Three?', back: 'Three.' },
          { front: 'Four?', back: 'Four.' },
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
            description: 'Start',
            durationMs: 300_000,
          },
          {
            offsetMs: 300_000,
            title: 'Build a useful system',
            description: 'Middle',
            durationMs: 200_000,
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
            text: 'Transcript content must not become analytics.',
            offsetMs: 0,
            durationMs: 2_000,
            segmentType: 'insight',
            speakerLabel: null,
          },
        ],
      },
    },
  },
};

const seekTo = vi.fn();
const play = vi.fn();
const controller: VideoPlayerController = {
  subscribe: () => () => undefined,
  getSnapshot: () => ({
    status: 'ready',
    currentTimeMs: 10_000,
    durationMs: 900_000,
    playing: false,
    playbackRate: 1,
    availableRates: [1],
    volume: 100,
    muted: false,
    captionsAvailable: false,
  }),
  seekTo,
  play,
  pause: vi.fn(),
  getCurrentTimeMs: vi.fn(() => 10_000),
  setPlaybackRate: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
  toggleCaptions: vi.fn(),
  requestFullscreen: vi.fn(async () => undefined),
};

function renderOverview(
  model: ResultWorkspaceModel = readyModel,
  openArtifact = vi.fn(),
  copy: ResultCopy = resultCopy.en,
) {
  return {
    openArtifact,
    ...render(
      <PlayerProvider controller={controller}>
        <OverviewTab model={model} openTab={openArtifact} copy={copy} />
      </PlayerProvider>,
    ),
  };
}

describe('OverviewTab', () => {
  beforeEach(() => {
    seekTo.mockClear();
    play.mockClear();
    window.history.replaceState(null, '', '/app/video/result#overview');
  });

  afterEach(() => {
    window.history.replaceState(null, '', '/');
  });

  it('keeps the result statement concise and does not duplicate Summary details', () => {
    renderOverview();

    expect(screen.getByText(readyModel.overview.outcome)).toHaveClass(
      'result-overview-outcome',
    );
    expect(screen.queryByText('Detailed section one')).not.toBeInTheDocument();
    expect(
      screen.queryByText(
        'Long-form explanation must never appear in Overview.',
      ),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText('A supporting quote belongs only in Summary.'),
    ).not.toBeInTheDocument();
  });

  it('renders truthful metrics and keeps unknown values distinct from zero', () => {
    renderOverview({
      ...readyModel,
      overview: {
        ...readyModel.overview,
        summarySectionCount: null,
        flashcardCount: 0,
        reviewedFlashcardCount: null,
        keyMomentCount: null,
        transcriptWordCount: null,
      },
    });

    const metrics = screen.getByRole('list', {
      name: resultCopy.en.overviewTitle,
    });
    expect(within(metrics).getByText('15:00')).toBeVisible();
    expect(within(metrics).getByText('0')).toBeVisible();
    expect(within(metrics).getAllByText('—')).toHaveLength(3);
    expect(
      within(metrics).getByLabelText(
        `${resultCopy.en.overviewSummarySections}: ${resultCopy.en.stateUnavailable}`,
      ),
    ).toBeVisible();
  });

  it('orders five whole-card destinations and preserves honest artifact states', async () => {
    const user = userEvent.setup();
    const openArtifact = vi.fn();
    renderOverview(
      {
        ...readyModel,
        tabs: {
          ...readyModel.tabs,
          flashcards: {
            status: 'unavailable',
            reason: 'failed',
            errorCode: 'generation_failed',
          },
          timestamps: { status: 'unavailable', reason: 'not_requested' },
          transcript: { status: 'unavailable', reason: 'pending' },
        },
      },
      openArtifact,
    );

    const links = screen.getByRole('list', { name: resultCopy.en.tabsLabel });
    const cards = within(links).getAllByRole('button');
    expect(cards.map((card) => card.getAttribute('data-artifact'))).toEqual([
      'summary',
      'flashcards',
      'timestamps',
      'transcript',
      'export',
    ]);
    expect(cards.map((card) => card.getAttribute('data-state'))).toEqual([
      'ready',
      'failed',
      'disabled',
      'processing',
      'ready',
    ]);
    expect(cards[1]).toHaveAttribute('aria-disabled', 'true');
    expect(cards[1]).toHaveTextContent(resultCopy.en.stateFailed);
    expect(cards[2]).toHaveTextContent(resultCopy.en.stateNotRequested);
    expect(cards[3]).toHaveTextContent(resultCopy.en.stateProcessing);

    cards[0]!.focus();
    expect(cards[0]).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(openArtifact).toHaveBeenCalledExactlyOnceWith('summary');

    await user.click(cards[1]!);
    expect(openArtifact).toHaveBeenCalledOnce();
  });

  it('continues from the saved owner position without changing the artifact', async () => {
    const user = userEvent.setup();
    const openArtifact = vi.fn();
    const events: unknown[] = [];
    const onAnalytics = (event: Event) =>
      events.push((event as CustomEvent).detail);
    window.addEventListener('gleen:analytics', onAnalytics);
    renderOverview(readyModel, openArtifact);

    await user.click(
      screen.getByRole('button', {
        name: resultCopy.en.overviewContinueWatching,
      }),
    );

    expect(seekTo).toHaveBeenCalledExactlyOnceWith(370_000);
    expect(play).toHaveBeenCalledOnce();
    expect(openArtifact).not.toHaveBeenCalled();
    expect(window.location.hash).toBe('#overview');
    expect(events).toEqual([
      {
        name: 'result_continue_watching_clicked',
        anonymousAnalysisId: readyModel.source.intakeId,
      },
    ]);
    window.removeEventListener('gleen:analytics', onAnalytics);
  });

  it('uses the deterministic recommendation and content-free artifact analytics', async () => {
    const user = userEvent.setup();
    const openArtifact = vi.fn();
    const events: unknown[] = [];
    const onAnalytics = (event: Event) =>
      events.push((event as CustomEvent).detail);
    window.addEventListener('gleen:analytics', onAnalytics);
    renderOverview(
      {
        ...readyModel,
        userState: {
          ...readyModel.userState!,
          lastArtifact: 'summary',
          lastStudyAction: 'summary_opened',
          reviews: [],
        },
        overview: {
          ...readyModel.overview,
          reviewedFlashcardCount: 0,
        },
      },
      openArtifact,
    );

    const recommendation = screen.getByRole('region', {
      name: resultCopy.en.overviewRecommended,
    });
    await user.click(
      within(recommendation).getByRole('button', {
        name: resultCopy.en.overviewStartFlashcards,
      }),
    );

    expect(openArtifact).toHaveBeenCalledExactlyOnceWith('flashcards');
    expect(events).toEqual([
      {
        name: 'result_overview_artifact_opened',
        artifact: 'flashcards',
      },
    ]);
    expect(JSON.stringify(events)).not.toMatch(
      /title|content|query|speaker|token/i,
    );
    window.removeEventListener('gleen:analytics', onAnalytics);
  });

  it('renders the hub entirely from the selected locale copy', () => {
    renderOverview(readyModel, vi.fn(), resultCopy.de);

    expect(screen.getByText(resultCopy.de.overviewOutcome)).toBeVisible();
    expect(
      screen.getByRole('list', { name: resultCopy.de.tabsLabel }),
    ).toBeVisible();
    expect(
      screen.getByRole('region', { name: resultCopy.de.overviewRecommended }),
    ).toBeVisible();
    expect(screen.queryByText(resultCopy.en.overviewOutcome)).toBeNull();
  });
});
