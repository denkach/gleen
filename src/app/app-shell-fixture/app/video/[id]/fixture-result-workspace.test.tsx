import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';

import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

import { FixtureResultWorkspace } from './fixture-result-workspace';

const model: ResultWorkspaceModel = {
  source: {
    intakeId: '60000000-0000-4000-8000-000000000099',
    youtubeVideoId: 'fixture-video',
    title: 'Fixture lifecycle',
    channelTitle: 'Local fixture',
    durationSeconds: 1_043,
    thumbnailUrl: '/app-icons.svg',
  },
  revision: 1,
  revisions: { title: '2026-07-18T00:00:00.000Z' },
  overview: {
    outcome: 'Fixture lifecycle',
    durationSeconds: 1_043,
    summarySectionCount: null,
    flashcardCount: null,
    reviewedFlashcardCount: null,
    keyMomentCount: null,
    transcriptWordCount: null,
    currentTimeSeconds: 0,
    currentChapter: null,
    availableExports: [],
  },
  userState: {
    favorite: false,
    playbackPositionMs: 0,
    lastArtifact: 'overview',
    lastStudyAction: null,
    reviews: [],
  },
  tabs: {
    summary: { status: 'unavailable', reason: 'not_requested' },
    flashcards: { status: 'unavailable', reason: 'not_requested' },
    timestamps: { status: 'unavailable', reason: 'not_requested' },
    transcript: { status: 'unavailable', reason: 'not_requested' },
  },
};

function playerApi(label: string) {
  class Player {
    readonly iframe = document.createElement('iframe');

    constructor(
      element: HTMLElement,
      options: { events: { onReady(): void } },
    ) {
      this.iframe.dataset.playerOwner = label;
      element.append(this.iframe);
      queueMicrotask(() => options.events.onReady());
    }

    destroy() {
      this.iframe.remove();
    }

    getCurrentTime() {
      return 0;
    }

    getIframe() {
      return this.iframe;
    }

    pauseVideo() {}

    playVideo() {}

    seekTo() {}
  }

  return { Player } as unknown as NonNullable<Window['YT']>;
}

function playerState(label: string) {
  return {
    fixtureId: label,
    currentTime: 0,
    playing: false,
    seeks: [],
    commands: [],
    pause() {},
    play() {},
  };
}

afterEach(() => {
  delete window.YT;
  delete window.__fixturePlayer;
  window.localStorage.clear();
});

describe('FixtureResultWorkspace player global lifecycle', () => {
  it('does not expose a falsely successful review action when private state is unknown', async () => {
    const unknownModel: ResultWorkspaceModel = {
      ...model,
      revisions: {
        ...model.revisions,
        flashcards: '2026-07-18T00:01:00.000Z',
      },
      overview: { ...model.overview, flashcardCount: 1 },
      userState: null,
      tabs: {
        ...model.tabs,
        flashcards: {
          status: 'ready',
          data: {
            schemaVersion: 1,
            cards: [{ front: 'Unknown progress', back: 'No fake save' }],
          },
        },
      },
    };
    render(<FixtureResultWorkspace initialModel={unknownModel} />);
    await userEvent.click(
      await screen.findByRole('tab', { name: 'Flashcards' }),
    );

    expect(
      screen.getByRole('button', {
        name: /got it.*review saving is unavailable/i,
      }),
    ).toBeDisabled();
  });

  it('restores pre-existing player globals when the fixture unmounts', async () => {
    const previousApi = playerApi('DEN-18 player');
    const previousState = playerState('DEN-18 state');
    window.YT = previousApi;
    window.__fixturePlayer = previousState;

    const { unmount } = render(
      <FixtureResultWorkspace
        initialModel={model}
        fixturePlayerStartMs={370_000}
      />,
    );

    await waitFor(() => expect(window.YT).not.toBe(previousApi));
    expect(window.__fixturePlayer).not.toBe(previousState);

    unmount();

    expect(window.YT).toBe(previousApi);
    expect(window.__fixturePlayer).toBe(previousState);
    const restoredMount = document.createElement('div');
    const restoredPlayer = new window.YT!.Player(restoredMount, {
      videoId: 'den-18-video',
      playerVars: { playsinline: 1, rel: 0 },
      events: { onReady() {}, onError() {} },
    });
    expect(restoredPlayer.getIframe()).toHaveAttribute(
      'data-player-owner',
      'DEN-18 player',
    );
  });

  it('preserves a newer player API while restoring fixture state', async () => {
    const previousApi = playerApi('DEN-18 player');
    const previousState = playerState('DEN-18 state');
    window.YT = previousApi;
    window.__fixturePlayer = previousState;

    const { unmount } = render(
      <FixtureResultWorkspace
        initialModel={model}
        fixturePlayerStartMs={370_000}
      />,
    );
    await waitFor(() => expect(window.YT).not.toBe(previousApi));

    const newerApi = playerApi('real player');
    window.YT = newerApi;

    unmount();

    expect(window.YT).toBe(newerApi);
    expect(window.__fixturePlayer).toBe(previousState);
  });

  it('preserves newer player state while restoring the previous API', async () => {
    const previousApi = playerApi('DEN-18 player');
    const previousState = playerState('DEN-18 state');
    window.YT = previousApi;
    window.__fixturePlayer = previousState;

    const { unmount } = render(
      <FixtureResultWorkspace
        initialModel={model}
        fixturePlayerStartMs={370_000}
      />,
    );
    await waitFor(() => expect(window.__fixturePlayer).not.toBe(previousState));

    const newerState = playerState('real state');
    window.__fixturePlayer = newerState;

    unmount();

    expect(window.YT).toBe(previousApi);
    expect(window.__fixturePlayer).toBe(newerState);
  });
});
