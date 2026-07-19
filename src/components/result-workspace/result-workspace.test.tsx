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
import type {
  ResultMutationState,
  ResultSaveState,
} from '@/lib/result-workspace/actions';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

import { PlayerProvider } from './player-context';
import type { VideoPlayerController } from './player-controller';
import { ResultWorkspace } from './result-workspace';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function stubMobileResultViewport(initialMatches: boolean) {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  const mobileQuery = {
    get matches() {
      return matches;
    },
    media: '(max-width: 620px)',
    addEventListener: (_type: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) =>
      listeners.delete(listener),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) =>
      query === mobileQuery.media
        ? mobileQuery
        : {
            matches: false,
            media: query,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
          },
    ),
  );
  return {
    setMatches(nextMatches: boolean) {
      matches = nextMatches;
      listeners.forEach((listener) => listener());
    },
  };
}

const controller: VideoPlayerController = {
  subscribe: () => () => undefined,
  getSnapshot: () => ({
    status: 'ready',
    currentTimeMs: 0,
    durationMs: 900_000,
    playing: false,
    playbackRate: 1,
    availableRates: [1],
    volume: 100,
    muted: false,
    captionsAvailable: false,
  }),
  seekTo: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  getCurrentTimeMs: vi.fn(() => 0),
  setPlaybackRate: vi.fn(),
  setVolume: vi.fn(),
  toggleMute: vi.fn(),
  toggleCaptions: vi.fn(),
  requestFullscreen: vi.fn(async () => undefined),
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

function revisionWorkspace(
  value: ResultWorkspaceModel,
  saveTitle: (input: unknown) => Promise<ResultSaveState>,
  saveArtifact: (input: unknown) => Promise<ResultSaveState>,
) {
  return (
    <PlayerProvider controller={controller}>
      <ResultWorkspace
        model={value}
        saveTitle={saveTitle}
        saveArtifact={saveArtifact}
      />
    </PlayerProvider>
  );
}

function renderWorkspaceWithActions({
  saveTitle = vi.fn(),
  saveArtifact = vi.fn(),
  saveFlashcardReview,
  copy,
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
  saveFlashcardReview?: (
    input: unknown,
  ) => Promise<{ status: 'saved' | 'conflict' | 'error' }>;
  copy?: (typeof resultCopy)[keyof typeof resultCopy];
  value?: ResultWorkspaceModel;
}>) {
  return render(
    <PlayerProvider controller={controller}>
      <ResultWorkspace
        model={value}
        saveTitle={saveTitle}
        saveArtifact={saveArtifact}
        saveFlashcardReview={saveFlashcardReview}
        copy={copy}
      />
    </PlayerProvider>,
  );
}

describe('ResultWorkspace', () => {
  afterEach(async () => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    sessionStorage.clear();
    const scripts = Array.from(
      document.querySelectorAll<HTMLScriptElement>(
        'script[src="https://www.youtube.com/iframe_api"]',
      ),
    );
    await act(async () =>
      scripts.forEach((script) => script.dispatchEvent(new Event('error'))),
    );
    Reflect.deleteProperty(window, 'YT');
    Reflect.deleteProperty(window, 'onYouTubeIframeAPIReady');
    document
      .querySelectorAll('script[src="https://www.youtube.com/iframe_api"]')
      .forEach((script) => script.remove());
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

  it('consumes the typed playback mutation for the active analysis', async () => {
    let currentTime = 0;
    let playerEvents:
      | {
          onReady(): void;
          onStateChange?(event: { data: number }): void;
        }
      | undefined;
    Object.assign(window, {
      YT: {
        Player: vi.fn(function Player(
          _element: HTMLElement,
          options: {
            events: {
              onReady(): void;
              onStateChange?(event: { data: number }): void;
            };
          },
        ) {
          playerEvents = options.events;
          const iframe = document.createElement('iframe');
          queueMicrotask(() => options.events.onReady());
          return {
            destroy: vi.fn(),
            getCurrentTime: () => currentTime,
            getDuration: () => 900,
            getIframe: () => iframe,
            getPlaybackRate: () => 1,
            getAvailablePlaybackRates: () => [1],
            getVolume: () => 100,
            isMuted: () => false,
            pauseVideo: vi.fn(),
            playVideo: vi.fn(),
            seekTo: vi.fn(),
          };
        }),
      },
    });
    const savePlaybackPosition = vi.fn(async () => ({
      status: 'saved' as const,
    }));

    render(
      <ResultWorkspace
        model={model}
        saveTitle={vi.fn()}
        saveArtifact={vi.fn()}
        savePlaybackPosition={savePlaybackPosition}
      />,
    );

    await act(async () => {});
    act(() => playerEvents?.onStateChange?.({ data: 1 }));
    await act(async () => {
      currentTime = 2;
      playerEvents?.onStateChange?.({ data: 2 });
    });

    expect(savePlaybackPosition).toHaveBeenCalledExactlyOnceWith({
      analysisId: model.source.intakeId,
      positionMs: 2_000,
      revision: expect.any(Number),
    });
  });

  it('keeps unavailable shared player state through fallback and resets it for a new lifecycle', async () => {
    const view = render(
      <ResultWorkspace
        model={model}
        saveTitle={vi.fn()}
        saveArtifact={vi.fn()}
      />,
    );
    const failedScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );

    await act(async () => failedScript?.dispatchEvent(new Event('error')));

    expect(screen.getByTestId('result-layout')).toHaveAttribute(
      'data-player-status',
      'unavailable',
    );
    expect(screen.getByRole('status', { name: '' })).toHaveTextContent(
      'Player unavailable',
    );

    view.rerender(
      <ResultWorkspace
        model={{
          ...model,
          source: {
            ...model.source,
            intakeId: 'd41ba30f-b999-409f-8601-29cb209bc0fa',
          },
        }}
        saveTitle={vi.fn()}
        saveArtifact={vi.fn()}
      />,
    );

    expect(screen.getByTestId('result-layout')).toHaveAttribute(
      'data-player-status',
      'loading',
    );

    const replacementScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://www.youtube.com/iframe_api"]',
    );
    await act(async () => replacementScript?.dispatchEvent(new Event('error')));
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

  it('shows one controller-only mobile mini-player and five result destinations after the player leaves view', async () => {
    const callbacks: IntersectionObserverCallback[] = [];
    const disconnect = vi.fn();
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(function Observer(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect,
          takeRecords: vi.fn(() => []),
          root: null,
          rootMargin: '0px',
          thresholds: [0, 0.4],
        };
      }),
    );
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    window.history.replaceState(null, '', '/app/video/result#summary');
    renderWorkspace();
    const playerStage = await waitFor(() => {
      expect(callbacks).toHaveLength(1);
      return document.querySelector('.result-player-stage') as HTMLElement;
    });
    const scrollIntoView = vi.fn();
    Object.defineProperty(playerStage, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });

    act(() =>
      callbacks[0](
        [
          {
            target: playerStage,
            isIntersecting: false,
            intersectionRatio: 0,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      ),
    );

    expect(screen.getAllByTestId('mobile-mini-player')).toHaveLength(1);
    expect(
      screen.getByTestId('mobile-mini-player').querySelectorAll('iframe'),
    ).toHaveLength(0);
    const navigation = document.querySelector('.result-mobile-navigation');
    expect(navigation).not.toBeNull();
    expect(
      within(navigation as HTMLElement).getAllByRole('button'),
    ).toHaveLength(5);

    window.dispatchEvent(new Event('orientationchange'));
    act(() =>
      callbacks[0](
        [
          {
            target: playerStage,
            isIntersecting: false,
            intersectionRatio: 0,
          } as unknown as IntersectionObserverEntry,
        ],
        {} as IntersectionObserver,
      ),
    );
    expect(screen.getAllByTestId('mobile-mini-player')).toHaveLength(1);

    await userEvent.click(
      screen.getByRole('button', { name: resultCopy.en.playerExpand }),
    );
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({
      block: 'start',
      behavior: 'auto',
    });
    expect(window.location.hash).toBe('#summary');
  });

  it('keeps mobile-only navigation out of desktop document semantics', () => {
    renderWorkspace();

    expect(
      document.querySelector('.result-mobile-navigation'),
    ).not.toBeInTheDocument();
  });

  it('mounts mobile surfaces only below the breakpoint and closes Chapters cleanly on rotation to desktop', async () => {
    const callbacks: IntersectionObserverCallback[] = [];
    vi.stubGlobal(
      'IntersectionObserver',
      vi.fn(function Observer(callback: IntersectionObserverCallback) {
        callbacks.push(callback);
        return {
          observe: vi.fn(),
          unobserve: vi.fn(),
          disconnect: vi.fn(),
          takeRecords: vi.fn(() => []),
          root: null,
          rootMargin: '0px',
          thresholds: [0, 0.4],
        };
      }),
    );
    const viewport = stubMobileResultViewport(false);
    const analytics: unknown[] = [];
    const onAnalytics = (event: Event) =>
      analytics.push((event as CustomEvent).detail);
    window.addEventListener('gleen:analytics', onAnalytics);
    const user = userEvent.setup();

    try {
      renderWorkspace();
      const playerStage = await waitFor(() => {
        expect(callbacks).toHaveLength(1);
        return document.querySelector('.result-player-stage') as HTMLElement;
      });
      const fullPlayerControl = playerStage.querySelector(
        '.result-center-play',
      ) as HTMLButtonElement;
      act(() =>
        callbacks[0](
          [
            {
              target: playerStage,
              isIntersecting: false,
              intersectionRatio: 0,
            } as unknown as IntersectionObserverEntry,
          ],
          {} as IntersectionObserver,
        ),
      );

      expect(
        screen.queryByTestId('mobile-mini-player'),
      ).not.toBeInTheDocument();
      expect(
        document.querySelector('.result-mobile-chapters-trigger'),
      ).not.toBeInTheDocument();
      expect(
        analytics.filter(
          (event) =>
            (event as { name?: string }).name ===
            'result_mobile_miniplayer_shown',
        ),
      ).toHaveLength(0);

      act(() => viewport.setMatches(true));
      expect(await screen.findByTestId('mobile-mini-player')).toBeVisible();
      expect(
        screen.getByTestId('mobile-mini-player').querySelectorAll('iframe'),
      ).toHaveLength(0);
      expect(document.querySelectorAll('.result-youtube-player')).toHaveLength(
        1,
      );
      expect(
        analytics.filter(
          (event) =>
            (event as { name?: string }).name ===
            'result_mobile_miniplayer_shown',
        ),
      ).toHaveLength(1);

      const chapterTrigger = document.querySelector(
        '.result-mobile-chapters-trigger',
      ) as HTMLButtonElement;
      await user.click(chapterTrigger);
      expect(
        screen.getByRole('dialog', { name: resultCopy.en.sheetChaptersTitle }),
      ).toBeVisible();

      act(() => viewport.setMatches(false));
      await waitFor(() =>
        expect(
          screen.queryByRole('dialog', {
            name: resultCopy.en.sheetChaptersTitle,
          }),
        ).not.toBeInTheDocument(),
      );
      expect(
        screen.queryByTestId('mobile-mini-player'),
      ).not.toBeInTheDocument();
      expect(
        document.querySelector('.result-mobile-navigation'),
      ).not.toBeInTheDocument();
      expect(document.body).not.toHaveAttribute('data-scroll-locked');
      expect(fullPlayerControl).toHaveFocus();
      expect(
        analytics.filter(
          (event) =>
            (event as { name?: string }).name ===
            'result_mobile_miniplayer_shown',
        ),
      ).toHaveLength(1);
    } finally {
      window.removeEventListener('gleen:analytics', onAnalytics);
    }
  });

  it('opens localized More and Chapters sheets with selection, Escape, and focus restoration', async () => {
    sessionStorage.clear();
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    window.history.replaceState(null, '', '/app/video/result#overview');
    vi.mocked(controller.seekTo).mockClear();
    vi.mocked(controller.play).mockClear();
    const user = userEvent.setup();
    renderWorkspace();

    const mobileNavigation = await waitFor(() =>
      document.querySelector('.result-mobile-navigation'),
    );
    const moreTrigger = within(mobileNavigation as HTMLElement).getByRole(
      'button',
      { name: resultCopy.en.tabMore },
    );
    await user.click(moreTrigger);
    const moreSheet = screen.getByRole('dialog', {
      name: resultCopy.en.sheetMoreTitle,
    });
    expect(moreSheet.querySelector('.result-sheet-handle')).not.toBeNull();
    await user.click(
      within(moreSheet).getByRole('button', {
        name: resultCopy.en.tabTranscript,
      }),
    );
    expect(window.location.hash).toBe('#transcript');
    expect(
      screen.queryByRole('dialog', { name: resultCopy.en.sheetMoreTitle }),
    ).not.toBeInTheDocument();

    const chapterTrigger = document.querySelector(
      '.result-mobile-chapters-trigger',
    ) as HTMLButtonElement;
    expect(chapterTrigger).not.toBeNull();
    await user.click(chapterTrigger);
    const chapterSheet = screen.getByRole('dialog', {
      name: resultCopy.en.sheetChaptersTitle,
    });
    expect(
      within(chapterSheet).getByRole('button', { name: /00:00 Opening/ }),
    ).toHaveAttribute('aria-current', 'true');
    await user.click(
      within(chapterSheet).getByRole('button', { name: /12:35 Sources/ }),
    );
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
    expect(controller.play).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole('dialog', { name: resultCopy.en.sheetChaptersTitle }),
    ).not.toBeInTheDocument();

    await user.click(chapterTrigger);
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('dialog', { name: resultCopy.en.sheetChaptersTitle }),
    ).not.toBeInTheDocument();
    expect(chapterTrigger).toHaveFocus();
  });

  it('saves before artifact changes and restores clamped per-artifact positions without replacing hash', async () => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 5_000,
    });
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      value: 800,
    });
    Object.defineProperty(window, 'scrollY', {
      configurable: true,
      writable: true,
      value: 0,
    });
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      }),
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);
    sessionStorage.setItem(
      `gleen:result-scroll:${model.source.intakeId}:transcript`,
      '9000',
    );
    window.history.replaceState(null, '', '/app/video/result#transcript');
    const user = userEvent.setup();
    renderWorkspace();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Transcript' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 4_200,
      left: 0,
      behavior: 'auto',
    });

    window.scrollY = 720;
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    expect(
      sessionStorage.getItem(
        `gleen:result-scroll:${model.source.intakeId}:transcript`,
      ),
    ).toBe('720');
    window.scrollY = 180;
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    expect(
      sessionStorage.getItem(
        `gleen:result-scroll:${model.source.intakeId}:flashcards`,
      ),
    ).toBe('180');
    await user.click(screen.getByRole('tab', { name: 'Transcript' }));
    expect(scrollTo).toHaveBeenLastCalledWith({
      top: 720,
      left: 0,
      behavior: 'auto',
    });
    expect(window.location.hash).toBe('#transcript');
  });

  it('navigates mobile artifacts by guarded horizontal swipe', async () => {
    vi.stubGlobal('scrollTo', vi.fn());
    vi.stubGlobal(
      'matchMedia',
      vi.fn().mockReturnValue({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      }),
    );
    window.history.replaceState(null, '', '/app/video/result#overview');
    renderWorkspace();
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    await act(async () => {});
    const artifactContent = document.querySelector(
      '.result-artifact-content',
    ) as HTMLElement;

    fireEvent.touchStart(artifactContent, {
      touches: [{ identifier: 1, clientX: 180, clientY: 100 }],
    });
    fireEvent.touchEnd(artifactContent, {
      changedTouches: [{ identifier: 1, clientX: 100, clientY: 102 }],
    });
    await waitFor(() => expect(window.location.hash).toBe('#summary'));
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Summary' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );

    fireEvent.touchStart(artifactContent, {
      touches: [{ identifier: 2, clientX: 180, clientY: 100 }],
    });
    fireEvent.touchEnd(artifactContent, {
      changedTouches: [{ identifier: 2, clientX: 100, clientY: 190 }],
    });
    expect(window.location.hash).toBe('#summary');

    const summaryTitle = screen.getByRole('textbox', { name: 'Summary title' });
    fireEvent.touchStart(summaryTitle, {
      touches: [{ identifier: 3, clientX: 180, clientY: 100 }],
    });
    fireEvent.touchEnd(summaryTitle, {
      changedTouches: [{ identifier: 3, clientX: 100, clientY: 100 }],
    });
    expect(window.location.hash).toBe('#summary');
  });

  it.each([
    { availableExports: [] as string[] },
    { availableExports: ['future-export-id'] },
  ])(
    'opens Export from Overview when pre-generated destinations are %j',
    async ({ availableExports }) => {
      const user = userEvent.setup();
      window.history.replaceState(null, '', '/app/video/result#overview');
      renderWorkspace({
        ...model,
        overview: { ...model.overview, availableExports },
      });

      await user.click(
        screen.getByRole('button', {
          name: new RegExp(
            `${resultCopy.en.overviewOpenArtifact}: ${resultCopy.en.tabExport}`,
            'i',
          ),
        }),
      );

      expect(window.location.hash).toBe('#export');
      expect(
        screen.getByRole('tab', { name: resultCopy.en.tabExport }),
      ).toHaveAttribute('aria-selected', 'true');
      expect(
        screen.getByRole('heading', { name: resultCopy.en.exportTitle }),
      ).toBeVisible();
    },
  );

  it('autosaves a dirty title against a newer server revision without a duplicate save', async () => {
    vi.useFakeTimers();
    const saveTitle = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:04:00.000Z',
    });
    const saveArtifact = vi.fn();
    const view = render(revisionWorkspace(model, saveTitle, saveArtifact));

    fireEvent.change(screen.getByRole('textbox', { name: 'Result title' }), {
      target: { value: 'Dirty local title' },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));
    view.rerender(
      revisionWorkspace(
        {
          ...model,
          revisions: {
            ...model.revisions,
            title: '2026-07-18T00:03:00.000Z',
          },
          source: { ...model.source, title: 'External server title' },
        },
        saveTitle,
        saveArtifact,
      ),
    );
    expect(screen.getByRole('textbox', { name: 'Result title' })).toHaveValue(
      'Dirty local title',
    );
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(saveTitle).toHaveBeenCalledExactlyOnceWith({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: '2026-07-18T00:03:00.000Z',
      title: 'Dirty local title',
    });
    await act(() => vi.advanceTimersByTimeAsync(1_400));
    expect(saveTitle).toHaveBeenCalledTimes(1);
    expect(saveArtifact).not.toHaveBeenCalled();
  });

  it('autosaves a dirty Summary with untouched server edits against the newer revision', async () => {
    const summaryFixture = model.tabs.summary;
    if (summaryFixture.status !== 'ready') {
      throw new Error('Expected a ready Summary fixture');
    }
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/#summary');
    const saveTitle = vi.fn();
    const updatedAt = '2026-07-18T00:04:00.000Z';
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt,
    });
    const view = render(revisionWorkspace(model, saveTitle, saveArtifact));
    await act(() => vi.advanceTimersByTimeAsync(0));
    fireEvent.change(screen.getByRole('textbox', { name: 'Summary title' }), {
      target: { value: 'Dirty local Summary' },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));

    view.rerender(
      revisionWorkspace(
        {
          ...model,
          revisions: {
            ...model.revisions,
            summary: '2026-07-18T00:03:00.000Z',
          },
          tabs: {
            ...model.tabs,
            summary: {
              status: 'ready',
              data: {
                ...summaryFixture.data,
                outcome: 'External server overview',
                overview: 'External server overview',
              },
            },
          },
        },
        saveTitle,
        saveArtifact,
      ),
    );
    expect(screen.getByRole('textbox', { name: 'Summary title' })).toHaveValue(
      'Dirty local Summary',
    );
    expect(
      screen.getByRole('textbox', { name: 'Summary overview' }),
    ).toHaveValue('External server overview');
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(saveArtifact).toHaveBeenCalledExactlyOnceWith({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: '2026-07-18T00:03:00.000Z',
      kind: 'summary',
      content: expect.objectContaining({
        title: 'Dirty local Summary',
        overview: 'External server overview',
      }),
    });
    expect(screen.getByText('Saved')).toBeVisible();
    view.rerender(
      revisionWorkspace(
        {
          ...model,
          revisions: { ...model.revisions, summary: updatedAt },
          tabs: {
            ...model.tabs,
            summary: {
              status: 'ready',
              data: {
                ...summaryFixture.data,
                title: 'Dirty local Summary',
                outcome: 'External server overview',
                overview: 'External server overview',
                sections: summaryFixture.data.sections.map((section) => ({
                  ...section,
                })),
                keyPoints: summaryFixture.data.keyPoints.map((point) => ({
                  ...point,
                })),
              },
            },
          },
        },
        saveTitle,
        saveArtifact,
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('Saved')).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(1_400));
    expect(saveArtifact).toHaveBeenCalledTimes(1);
    expect(saveTitle).not.toHaveBeenCalled();
  });

  it('autosaves dirty Flashcards with untouched server edits against the newer revision', async () => {
    const flashcardsFixture = model.tabs.flashcards;
    if (flashcardsFixture.status !== 'ready') {
      throw new Error('Expected a ready Flashcards fixture');
    }
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/#flashcards');
    const saveTitle = vi.fn();
    const updatedAt = '2026-07-18T00:04:00.000Z';
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt,
    });
    const view = render(revisionWorkspace(model, saveTitle, saveArtifact));
    await act(() => vi.advanceTimersByTimeAsync(0));
    fireEvent.click(screen.getByRole('button', { name: 'Edit flashcards' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Flashcard question' }),
      { target: { value: 'Dirty local question?' } },
    );
    await act(() => vi.advanceTimersByTimeAsync(300));

    view.rerender(
      revisionWorkspace(
        {
          ...model,
          revisions: {
            ...model.revisions,
            flashcards: '2026-07-18T00:03:00.000Z',
          },
          tabs: {
            ...model.tabs,
            flashcards: {
              status: 'ready',
              data: {
                ...flashcardsFixture.data,
                cards: flashcardsFixture.data.cards.map((card, index) =>
                  index === 1
                    ? { ...card, back: 'External server answer.' }
                    : card,
                ),
              },
            },
          },
        },
        saveTitle,
        saveArtifact,
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(saveArtifact).toHaveBeenCalledExactlyOnceWith({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: '2026-07-18T00:03:00.000Z',
      kind: 'flashcards',
      content: {
        ...flashcardsFixture.data,
        cards: [
          {
            ...flashcardsFixture.data.cards[0],
            front: 'Dirty local question?',
          },
          {
            ...flashcardsFixture.data.cards[1],
            back: 'External server answer.',
          },
        ],
      },
    });
    expect(screen.getByText('Saved')).toBeVisible();
    view.rerender(
      revisionWorkspace(
        {
          ...model,
          revisions: { ...model.revisions, flashcards: updatedAt },
          tabs: {
            ...model.tabs,
            flashcards: {
              status: 'ready',
              data: {
                ...flashcardsFixture.data,
                cards: flashcardsFixture.data.cards.map((card, index) => ({
                  ...card,
                  ...(index === 0
                    ? { front: 'Dirty local question?' }
                    : { back: 'External server answer.' }),
                })),
              },
            },
          },
        },
        saveTitle,
        saveArtifact,
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('Saved')).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(1_400));
    expect(saveArtifact).toHaveBeenCalledTimes(1);
    expect(saveTitle).not.toHaveBeenCalled();
  });

  it('autosaves dirty Timestamps with untouched server edits against the newer revision', async () => {
    const timestampsFixture = model.tabs.timestamps;
    if (timestampsFixture.status !== 'ready') {
      throw new Error('Expected a ready Timestamps fixture');
    }
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/#timestamps');
    const saveTitle = vi.fn();
    const updatedAt = '2026-07-18T00:04:00.000Z';
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt,
    });
    const view = render(revisionWorkspace(model, saveTitle, saveArtifact));
    await act(() => vi.advanceTimersByTimeAsync(0));
    fireEvent.change(screen.getByRole('textbox', { name: 'Chapter 1 title' }), {
      target: { value: 'Dirty local chapter' },
    });
    await act(() => vi.advanceTimersByTimeAsync(300));

    view.rerender(
      revisionWorkspace(
        {
          ...model,
          revisions: {
            ...model.revisions,
            timestamps: '2026-07-18T00:03:00.000Z',
          },
          tabs: {
            ...model.tabs,
            timestamps: {
              status: 'ready',
              data: {
                ...timestampsFixture.data,
                chapters: timestampsFixture.data.chapters.map(
                  (chapter, index) =>
                    index === 1
                      ? { ...chapter, description: 'External server details.' }
                      : chapter,
                ),
              },
            },
          },
        },
        saveTitle,
        saveArtifact,
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(700));

    expect(saveArtifact).toHaveBeenCalledExactlyOnceWith({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: '2026-07-18T00:03:00.000Z',
      kind: 'timestamps',
      content: {
        schemaVersion: 1,
        chapters: [
          {
            offsetMs: timestampsFixture.data.chapters[0]!.offsetMs,
            title: 'Dirty local chapter',
            description: timestampsFixture.data.chapters[0]!.description,
          },
          {
            offsetMs: timestampsFixture.data.chapters[1]!.offsetMs,
            title: timestampsFixture.data.chapters[1]!.title,
            description: 'External server details.',
          },
        ],
      },
    });
    expect(screen.getByText('Saved')).toBeVisible();
    view.rerender(
      revisionWorkspace(
        {
          ...model,
          revisions: { ...model.revisions, timestamps: updatedAt },
          tabs: {
            ...model.tabs,
            timestamps: {
              status: 'ready',
              data: {
                ...timestampsFixture.data,
                chapters: timestampsFixture.data.chapters.map(
                  (chapter, index) => ({
                    ...chapter,
                    ...(index === 0
                      ? { title: 'Dirty local chapter' }
                      : { description: 'External server details.' }),
                  }),
                ),
              },
            },
          },
        },
        saveTitle,
        saveArtifact,
      ),
    );
    await act(() => vi.advanceTimersByTimeAsync(0));
    expect(screen.getByText('Saved')).toBeVisible();
    await act(() => vi.advanceTimersByTimeAsync(1_400));
    expect(saveArtifact).toHaveBeenCalledTimes(1);
    expect(saveTitle).not.toHaveBeenCalled();
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

  it('shares repeated owner actions and rolls Favorite back after a failed mutation', async () => {
    const user = userEvent.setup();
    const savePreference = vi.fn().mockResolvedValue({ status: 'error' });
    const onShare = vi.fn();
    render(
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={model}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
          savePreference={savePreference}
          onShare={onShare}
        />
      </PlayerProvider>,
    );

    const favoriteButtons = screen.getAllByRole('button', {
      name: 'Add to favorites',
    });
    expect(favoriteButtons).toHaveLength(2);
    await user.click(favoriteButtons[0]);
    expect(savePreference).toHaveBeenCalledWith({
      analysisId: model.source.intakeId,
      favorite: true,
    });
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: 'Add to favorites' }),
      ).toHaveLength(2),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Favorite could not be updated',
    );

    const shareButtons = screen.getAllByRole('button', {
      name: 'Share result',
    });
    expect(shareButtons).toHaveLength(2);
    await user.click(shareButtons[1]);
    expect(onShare).toHaveBeenCalledOnce();
  });

  it('shares Favorite pending state and ignores repeated actions', async () => {
    const user = userEvent.setup();
    const request = deferred<ResultMutationState>();
    const savePreference = vi.fn(() => request.promise);
    render(
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={model}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
          savePreference={savePreference}
        />
      </PlayerProvider>,
    );

    await user.click(
      screen.getAllByRole('button', { name: 'Add to favorites' })[0]!,
    );
    const pendingButtons = screen.getAllByRole('button', {
      name: 'Remove from favorites',
    });
    expect(pendingButtons).toHaveLength(2);
    pendingButtons.forEach((button) => {
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-busy', 'true');
      fireEvent.click(button);
    });
    expect(savePreference).toHaveBeenCalledOnce();

    request.resolve({ status: 'saved' });
    await waitFor(() =>
      pendingButtons.forEach((button) => expect(button).toBeEnabled()),
    );
  });

  it('does not let a deferred Favorite request update a new lifecycle', async () => {
    const user = userEvent.setup();
    const requestA = deferred<ResultMutationState>();
    const requestB = deferred<ResultMutationState>();
    const savePreference = vi
      .fn()
      .mockImplementationOnce(() => requestA.promise)
      .mockImplementationOnce(() => requestB.promise);
    const renderResult = (nextModel: ResultWorkspaceModel) => (
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={nextModel}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
          savePreference={savePreference}
        />
      </PlayerProvider>
    );
    const view = render(renderResult(model));

    await user.click(
      screen.getAllByRole('button', { name: 'Add to favorites' })[0]!,
    );
    const modelB: ResultWorkspaceModel = {
      ...model,
      source: { ...model.source, intakeId: 'analysis-b' },
      userState: { ...model.userState!, favorite: false },
    };
    view.rerender(renderResult(modelB));
    await user.click(
      screen.getAllByRole('button', { name: 'Add to favorites' })[0]!,
    );

    requestA.resolve({ status: 'saved' });
    await act(async () => {});
    expect(screen.queryByText('Added to favorites')).not.toBeInTheDocument();
    screen
      .getAllByRole('button', { name: 'Remove from favorites' })
      .forEach((button) => expect(button).toBeDisabled());

    requestB.resolve({ status: 'saved' });
    await waitFor(() =>
      expect(screen.getByText('Added to favorites')).toBeInTheDocument(),
    );
    expect(savePreference).toHaveBeenNthCalledWith(2, {
      analysisId: 'analysis-b',
      favorite: true,
    });
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
    expect(
      screen.getByRole('button', {
        name: /legacy text remains readable/i,
        expanded: true,
      }),
    ).toBeVisible();
    expect(screen.queryByRole('button', { name: '0:00' })).toBeNull();
    await user.click(
      screen.getByRole('button', {
        name: /sources remain grounded/i,
        expanded: false,
      }),
    );
    await user.click(screen.getByRole('button', { name: '12:35' }));
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
  });

  it('matches the Summary hero, metrics, disclosure, copy, and grounded source interactions', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    renderWorkspace();

    await user.click(screen.getByRole('tab', { name: 'Summary' }));

    expect(screen.getByText('Summary in one sentence')).toBeVisible();
    expect(screen.getByText('Structured sections')).toBeVisible();
    expect(screen.getByText('Reading time')).toBeVisible();
    expect(screen.getByText('Study cards')).toBeVisible();
    const hero = document.querySelector('.result-summary-hero');
    const stats = document.querySelector('.result-summary-stats');
    expect(hero?.nextElementSibling).toBe(stats);
    expect(
      screen
        .getByRole('textbox', { name: 'Summary title' })
        .closest('.result-summary-content'),
    ).not.toBeNull();

    const disclosure = screen.getByRole('button', {
      name: /legacy text remains readable/i,
      expanded: true,
    });
    expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    await user.click(disclosure);
    expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await user.click(disclosure);

    await user.click(
      screen.getByRole('button', {
        name: /copy.*legacy text remains readable/i,
      }),
    );
    expect(writeText).toHaveBeenCalledWith('Legacy text remains readable.');
    expect(screen.getByRole('status')).toHaveTextContent('Copied');

    await user.click(
      screen.getByRole('button', {
        name: /sources remain grounded/i,
        expanded: false,
      }),
    );
    await user.click(screen.getByRole('button', { name: '12:35' }));
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
  });

  it('flips and navigates flashcards, records study actions, and supports reduced motion', async () => {
    const user = userEvent.setup();
    renderWorkspaceWithActions({
      saveFlashcardReview: vi.fn().mockResolvedValue({ status: 'saved' }),
    });
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
    expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
      'data-reviewed-count',
      '1',
    );
    expect(card.closest('[data-reduced-motion]')).toBeTruthy();
  });

  it('persists one optimistic flashcard rating per current revision and rolls progress back on failure', async () => {
    const user = userEvent.setup();
    const review = deferred<{ status: 'error' }>();
    const saveFlashcardReview = vi.fn(() => review.promise);
    renderWorkspaceWithActions({
      saveFlashcardReview,
      value: {
        ...model,
        userState: {
          ...model.userState!,
          reviews: [
            {
              artifactRevision: 'stale-revision',
              cardIndex: 0,
              rating: 'again',
            },
            {
              artifactRevision: model.revisions.flashcards!,
              cardIndex: 1,
              rating: 'hard',
            },
          ],
        },
      },
    });

    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
      'data-reviewed-count',
      '1',
    );

    await user.click(screen.getByRole('button', { name: 'Got it' }));

    expect(saveFlashcardReview).toHaveBeenCalledWith({
      analysisId: model.source.intakeId,
      artifactRevision: model.revisions.flashcards,
      cardIndex: 0,
      rating: 'got_it',
    });
    expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
      'data-reviewed-count',
      '2',
    );
    expect(screen.getByText('What stays grounded?')).toBeVisible();

    review.resolve({ status: 'error' });
    await waitFor(() =>
      expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
        'data-reviewed-count',
        '1',
      ),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Review could not be saved',
    );
  });

  it('keeps flashcard editors out of study mode and autosaves edits on demand', async () => {
    const user = userEvent.setup();
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt: '2026-07-18T00:02:00.000Z',
    });
    renderWorkspaceWithActions({ saveArtifact });
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));

    expect(
      screen.queryByRole('textbox', { name: 'Flashcard question' }),
    ).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Edit flashcards' }));
    const question = screen.getByRole('textbox', {
      name: 'Flashcard question',
    });
    await user.clear(question);
    await user.type(question, 'Edited study question?');
    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));

    expect(saveArtifact).toHaveBeenCalledWith({
      analysisId: model.source.intakeId,
      expectedUpdatedAt: model.revisions.flashcards,
      kind: 'flashcards',
      content: expect.objectContaining({
        cards: expect.arrayContaining([
          expect.objectContaining({ front: 'Edited study question?' }),
        ]),
      }),
    });
  });

  it('rates an edited flashcard against the revision returned by its successful autosave', async () => {
    const user = userEvent.setup();
    const updatedAt = '2026-07-18T00:04:00.000Z';
    const saveArtifact = vi.fn().mockResolvedValue({
      status: 'saved',
      updatedAt,
    });
    const saveFlashcardReview = vi.fn().mockResolvedValue({ status: 'saved' });
    renderWorkspaceWithActions({ saveArtifact, saveFlashcardReview });
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    await user.click(screen.getByRole('button', { name: 'Edit flashcards' }));
    await user.type(
      screen.getByRole('textbox', { name: 'Flashcard question' }),
      ' updated',
    );
    await waitFor(() => expect(saveArtifact).toHaveBeenCalled(), {
      timeout: 1_200,
    });
    await waitFor(() => expect(screen.getByText('Saved')).toBeVisible());

    await user.click(screen.getByRole('button', { name: 'Got it' }));

    expect(saveFlashcardReview).toHaveBeenCalledWith(
      expect.objectContaining({ artifactRevision: updatedAt }),
    );
  });

  it('blocks review writes while an edit is dirty, debouncing, or saving, then uses the saved revision', async () => {
    const user = userEvent.setup();
    const artifactSave = deferred<{
      status: 'saved';
      updatedAt: string;
    }>();
    const saveArtifact = vi.fn(() => artifactSave.promise);
    const saveFlashcardReview = vi.fn().mockResolvedValue({ status: 'saved' });
    const copy = resultCopy.ru;
    renderWorkspaceWithActions({
      copy,
      saveArtifact,
      saveFlashcardReview,
    });
    await user.click(screen.getByRole('tab', { name: copy.tabFlashcards }));
    await user.click(screen.getByRole('button', { name: copy.flashcardsEdit }));
    fireEvent.change(
      screen.getByRole('textbox', { name: copy.flashcardsQuestionField }),
      { target: { value: 'Изменённый вопрос' } },
    );

    const blockedReview = screen.getByRole('button', {
      name: new RegExp(`${copy.flashcardsGotIt}.*${copy.stateSaving}`, 'i'),
    });
    expect(blockedReview).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(copy.stateSaving);
    fireEvent.click(blockedReview);
    expect(saveFlashcardReview).not.toHaveBeenCalled();

    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));
    expect(saveArtifact).toHaveBeenCalledOnce();
    expect(blockedReview).toBeDisabled();
    fireEvent.click(blockedReview);
    expect(saveFlashcardReview).not.toHaveBeenCalled();

    artifactSave.resolve({
      status: 'saved',
      updatedAt: '2026-07-18T00:05:00.000Z',
    });
    const enabledReview = await screen.findByRole('button', {
      name: copy.flashcardsGotIt,
    });
    expect(enabledReview).toBeEnabled();
    await user.click(enabledReview);
    expect(saveFlashcardReview).toHaveBeenCalledWith(
      expect.objectContaining({
        artifactRevision: '2026-07-18T00:05:00.000Z',
      }),
    );
  });

  it('keeps review writes disabled after an autosave error until retry saves', async () => {
    const user = userEvent.setup();
    const saveArtifact = vi
      .fn()
      .mockResolvedValueOnce({ status: 'error' })
      .mockResolvedValueOnce({
        status: 'saved',
        updatedAt: '2026-07-18T00:06:00.000Z',
      });
    const saveFlashcardReview = vi.fn().mockResolvedValue({ status: 'saved' });
    renderWorkspaceWithActions({ saveArtifact, saveFlashcardReview });
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    await user.click(screen.getByRole('button', { name: 'Edit flashcards' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'Flashcard question' }),
      { target: { value: 'Unsaved question' } },
    );
    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));

    expect(
      screen.getByText('Check your connection and try again'),
    ).toBeVisible();
    const review = screen.getByRole('button', {
      name: /got it.*check your connection/i,
    });
    expect(review).toBeDisabled();
    fireEvent.click(review);
    expect(saveFlashcardReview).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeEnabled();
  });

  it('resumes at the first unreviewed card and renders prototype position progress', async () => {
    const user = userEvent.setup();
    renderWorkspaceWithActions({
      saveFlashcardReview: vi.fn().mockResolvedValue({ status: 'saved' }),
      value: {
        ...model,
        tabs: {
          ...model.tabs,
          flashcards: {
            status: 'ready',
            data: {
              schemaVersion: 1,
              cards: [
                { front: 'Reviewed', back: 'One' },
                { front: 'Resume here', back: 'Two' },
                { front: 'Later', back: 'Three' },
              ],
            },
          },
        },
        userState: {
          ...model.userState!,
          reviews: [
            {
              artifactRevision: model.revisions.flashcards!,
              cardIndex: 0,
              rating: 'got_it',
            },
          ],
        },
      },
    });
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));

    expect(screen.getByText('Resume here')).toBeVisible();
    expect(
      screen.getByText('2 / 3', {
        selector: '.result-deck-progress-row span:last-child',
      }),
    ).toBeVisible();
    expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
      'data-reviewed-count',
      '1',
    );
  });

  it('resumes an all-reviewed deck at its final card', async () => {
    const user = userEvent.setup();
    renderWorkspaceWithActions({
      saveFlashcardReview: vi.fn().mockResolvedValue({ status: 'saved' }),
      value: {
        ...model,
        userState: {
          ...model.userState!,
          reviews: [0, 1].map((cardIndex) => ({
            artifactRevision: model.revisions.flashcards!,
            cardIndex,
            rating: 'got_it' as const,
          })),
        },
      },
    });
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));

    expect(screen.getByText('What stays grounded?')).toBeVisible();
    expect(
      screen.getByText('2 / 2', {
        selector: '.result-deck-progress-row span:last-child',
      }),
    ).toBeVisible();
  });

  it('renders unknown flashcard progress truthfully and does not coerce it to zero', async () => {
    const user = userEvent.setup();
    renderWorkspaceWithActions({
      saveFlashcardReview: vi.fn().mockResolvedValue({ status: 'saved' }),
      value: { ...model, userState: null },
    });
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));

    expect(screen.getByText('Progress unavailable')).toBeVisible();
    expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
      'data-reviewed-count',
      'unknown',
    );
    expect(screen.queryByText(/0 \/ 2 reviewed/i)).toBeNull();
  });

  it('rolls repeated in-flight same-card ratings back to the persisted baseline when both fail', async () => {
    const user = userEvent.setup();
    const first = deferred<ResultMutationState>();
    const second = deferred<ResultMutationState>();
    const saveFlashcardReview = vi
      .fn()
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    renderWorkspaceWithActions({
      saveFlashcardReview,
      value: {
        ...model,
        overview: { ...model.overview, flashcardCount: 1 },
        tabs: {
          ...model.tabs,
          flashcards: {
            status: 'ready',
            data: {
              schemaVersion: 1,
              cards: [{ front: 'Only card', back: 'Only answer' }],
            },
          },
        },
      },
    });
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
    await user.click(screen.getByRole('button', { name: 'Again' }));
    await user.click(screen.getByRole('button', { name: 'Got it' }));
    expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
      'data-reviewed-count',
      '1',
    );

    first.resolve({ status: 'error' });
    await waitFor(() => expect(saveFlashcardReview).toHaveBeenCalledTimes(2));
    second.resolve({ status: 'error' });

    await waitFor(() =>
      expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
        'data-reviewed-count',
        '0',
      ),
    );
  });

  it.each(['failure-first', 'success-first'] as const)(
    'reconciles different-card review writes per card when completion is %s',
    async (completionOrder) => {
      const user = userEvent.setup();
      const first = deferred<ResultMutationState>();
      const second = deferred<ResultMutationState>();
      const saveFlashcardReview = vi
        .fn()
        .mockReturnValueOnce(first.promise)
        .mockReturnValueOnce(second.promise);
      renderWorkspaceWithActions({ saveFlashcardReview });
      await user.click(screen.getByRole('tab', { name: 'Flashcards' }));
      await user.click(screen.getByRole('button', { name: 'Again' }));
      await user.click(screen.getByRole('button', { name: 'Got it' }));
      await waitFor(() => expect(saveFlashcardReview).toHaveBeenCalledTimes(2));

      if (completionOrder === 'failure-first') {
        first.resolve({ status: 'error' });
        await waitFor(() =>
          expect(
            document.querySelector('.result-deck-progress'),
          ).toHaveAttribute('data-reviewed-count', '1'),
        );
        second.resolve({ status: 'saved' });
      } else {
        second.resolve({ status: 'saved' });
        await waitFor(() =>
          expect(
            document.querySelector('.result-deck-progress'),
          ).toHaveAttribute('data-reviewed-count', '2'),
        );
        first.resolve({ status: 'error' });
      }

      await waitFor(() =>
        expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
          'data-reviewed-count',
          '1',
        ),
      );
    },
  );

  it('does not claim a review can persist when no review action is supplied', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Flashcards' }));

    expect(
      screen.getByRole('button', {
        name: /got it.*review saving is unavailable/i,
      }),
    ).toBeDisabled();
    expect(document.querySelector('.result-deck-progress')).toHaveAttribute(
      'data-reviewed-count',
      '0',
    );
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
    expect(
      screen.getByText('1 / 1', {
        selector: '.result-deck-progress-row span:last-child',
      }),
    ).toBeVisible();
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
          saveTitle={vi.fn().mockResolvedValue({ status: 'error' })}
          saveArtifact={vi.fn().mockResolvedValue({ status: 'error' })}
        />
      </PlayerProvider>,
    );

    expect(screen.getByRole('textbox', { name: 'Summary title' })).toHaveValue(
      'Unsaved local summary',
    );
  });

  it.each([
    ['unchanged', model.revisions.summary],
    ['changed', '2026-07-18T00:03:00.000Z'],
  ])(
    'reconciles a pending transcript with local drafts when the summary revision is %s',
    async (_label, summaryRevision) => {
      const summaryFixture = model.tabs.summary;
      const transcriptFixture = model.tabs.transcript;
      if (
        summaryFixture.status !== 'ready' ||
        transcriptFixture.status !== 'ready'
      ) {
        throw new Error('Expected ready result fixtures');
      }
      const user = userEvent.setup();
      const pendingModel: ResultWorkspaceModel = {
        ...model,
        tabs: {
          ...model.tabs,
          transcript: { status: 'unavailable', reason: 'pending' },
        },
      };
      const view = renderWorkspace(pendingModel);
      await user.click(screen.getByRole('tab', { name: 'Summary' }));
      const title = screen.getByRole('textbox', { name: 'Summary title' });
      await user.clear(title);
      await user.type(title, 'Unsaved local summary');
      await user.click(screen.getByRole('tab', { name: 'Export' }));
      await user.click(screen.getByRole('button', { name: /Obsidian/i }));
      expect(
        screen.getByRole('checkbox', { name: /Full transcript/i }),
      ).toBeDisabled();

      view.rerender(
        <PlayerProvider controller={controller}>
          <ResultWorkspace
            model={{
              ...model,
              revision: model.revision + 1,
              revisions: { ...model.revisions, summary: summaryRevision },
              tabs: {
                ...model.tabs,
                summary: {
                  status: 'ready',
                  data: {
                    ...summaryFixture.data,
                    overview: 'Newest server overview',
                  },
                },
                transcript: {
                  status: 'ready',
                  data: {
                    ...transcriptFixture.data,
                    segments: [
                      {
                        text: 'Newest transcript segment.',
                        offsetMs: 1_000,
                        durationMs: 2_000,
                        segmentType: 'other',
                        speakerLabel: null,
                      },
                    ],
                  },
                },
              },
            }}
            saveTitle={vi.fn().mockResolvedValue({ status: 'error' })}
            saveArtifact={vi.fn().mockResolvedValue({ status: 'conflict' })}
          />
        </PlayerProvider>,
      );

      expect(
        screen.getByRole('button', { name: /^Obsidian/i }),
      ).toHaveAttribute('aria-pressed', 'true');
      const transcript = screen.getByRole('checkbox', {
        name: /Full transcript/i,
      });
      expect(transcript).toBeEnabled();
      expect(transcript).not.toBeChecked();
      await user.click(transcript);
      expect(screen.getByTestId('export-preview')).toHaveTextContent(
        'Unsaved local summary',
      );
      expect(screen.getByTestId('export-preview')).toHaveTextContent(
        'Newest server overview',
      );
      expect(screen.getByTestId('export-preview')).toHaveTextContent(
        'Newest transcript segment.',
      );
    },
  );

  it('seeks timestamps and exposes the active chapter', async () => {
    const user = userEvent.setup();
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Timestamps' }));
    await user.click(screen.getByRole('button', { name: '12:35' }));
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
    const timestamps = screen.getByRole('tabpanel', { name: 'Timestamps' });
    expect(
      within(timestamps)
        .getByRole('textbox', { name: 'Chapter 2 title' })
        .closest('li'),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('renders prototype moments with derived durations and seeks without scrolling the page', async () => {
    const user = userEvent.setup();
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    });
    renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Timestamps' }));

    expect(
      screen.getByRole('heading', { name: '2 key moments' }),
    ).toBeVisible();
    expect(screen.getByText('Auto-generated')).toBeVisible();
    expect(
      screen.getByText('12:35', { selector: '.result-moment-duration' }),
    ).toBeVisible();
    expect(
      screen.getByText('2:25', { selector: '.result-moment-duration' }),
    ).toBeVisible();
    const timestamps = screen.getByRole('tabpanel', { name: 'Timestamps' });
    expect(
      within(timestamps).getAllByRole('img', { name: /light and learning/i }),
    ).toHaveLength(2);

    await user.click(
      screen.getByRole('button', { name: /play this moment.*sources/i }),
    );
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
    expect(controller.play).toHaveBeenCalled();
    expect(scrollIntoView).not.toHaveBeenCalled();
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
      const timestamps = screen.getByRole('tabpanel', { name: 'Timestamps' });
      expect(
        within(timestamps)
          .getByRole('textbox', { name: 'Chapter 1 title' })
          .closest('li'),
      ).toHaveAttribute('aria-current', 'true');

      vi.mocked(controller.getCurrentTimeMs).mockReturnValue(755_000);
      await act(async () => {
        const synchronize = interval.mock.calls
          .filter(([, delay]) => delay === 500)
          .at(-1)?.[0];
        if (typeof synchronize === 'function') synchronize();
      });

      expect(
        within(timestamps)
          .getByRole('textbox', { name: 'Chapter 2 title' })
          .closest('li'),
      ).toHaveAttribute('aria-current', 'true');
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
      '00:00 A prism separates light.\n12:35 Sources stay grounded.',
    );
    const transcript = screen.getByRole('tabpanel', { name: 'Transcript' });
    await user.click(
      within(transcript).getByRole('button', {
        name: /12:35.*Sources stay grounded/i,
      }),
    );
    expect(controller.seekTo).toHaveBeenCalledWith(755_000);
    expect(controller.play).toHaveBeenCalled();
  });

  it('marks the shared player snapshot segment accessibly', async () => {
    renderWorkspace();
    await userEvent.click(screen.getByRole('tab', { name: 'Transcript' }));
    const transcript = screen.getByRole('tabpanel', { name: 'Transcript' });
    expect(
      within(transcript).getByText('A prism separates light.').closest('li'),
    ).toHaveAttribute('aria-current', 'true');
  });

  it('preserves transcript controls across tab and revision remounts but resets for another analysis', async () => {
    const user = userEvent.setup();
    const enrichedModel: ResultWorkspaceModel = {
      ...model,
      tabs: {
        ...model.tabs,
        transcript: {
          status: 'ready',
          data: {
            schemaVersion: 2,
            language: 'en',
            segments: [
              {
                text: 'Purpose begins with a question.',
                offsetMs: 0,
                durationMs: 3_000,
                segmentType: 'question',
                speakerLabel: 'Host',
              },
              {
                text: 'Purpose creates trust.',
                offsetMs: 3_000,
                durationMs: 3_000,
                segmentType: 'insight',
                speakerLabel: 'Guest',
              },
            ],
          },
        },
      },
    };
    const view = renderWorkspace(enrichedModel);
    await user.click(screen.getByRole('tab', { name: 'Transcript' }));
    await user.type(
      screen.getByRole('searchbox', { name: 'Search transcript' }),
      'purpose',
    );
    await user.click(screen.getByRole('button', { name: 'Question' }));
    await user.click(screen.getByRole('switch', { name: 'Speaker labels' }));
    await user.click(screen.getByRole('switch', { name: 'Auto-scroll' }));

    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    await user.click(screen.getByRole('tab', { name: 'Transcript' }));
    expect(
      screen.getByRole('searchbox', { name: 'Search transcript' }),
    ).toHaveValue('purpose');
    expect(screen.getByRole('button', { name: 'Question' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('switch', { name: 'Speaker labels' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('switch', { name: 'Auto-scroll' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    view.rerender(
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={{
            ...enrichedModel,
            revision: enrichedModel.revision + 1,
            revisions: {
              ...enrichedModel.revisions,
              title: '2026-07-19T00:00:00.000Z',
            },
          }}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
        />
      </PlayerProvider>,
    );
    await waitFor(() =>
      expect(screen.getByRole('tab', { name: 'Transcript' })).toHaveAttribute(
        'aria-selected',
        'true',
      ),
    );
    expect(
      screen.getByRole('searchbox', { name: 'Search transcript' }),
    ).toHaveValue('purpose');
    expect(screen.getByRole('switch', { name: 'Auto-scroll' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    view.rerender(
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={{
            ...enrichedModel,
            source: { ...enrichedModel.source, intakeId: 'another-analysis' },
          }}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
        />
      </PlayerProvider>,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('searchbox', { name: 'Search transcript' }),
      ).toHaveValue(''),
    );
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('switch', { name: 'Speaker labels' }),
    ).toHaveAttribute('aria-checked', 'false');
    expect(screen.getByRole('switch', { name: 'Auto-scroll' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
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

  it('keeps Summary autosave feedback visible while editing a non-first open section', async () => {
    const user = userEvent.setup();
    const saveArtifact = vi.fn().mockResolvedValue({ status: 'error' });
    renderWorkspaceWithActions({ saveArtifact });
    await user.click(screen.getByRole('tab', { name: 'Summary' }));
    await user.click(
      screen.getByRole('button', {
        name: /legacy text remains readable/i,
        expanded: true,
      }),
    );
    await user.click(
      screen.getByRole('button', {
        name: /sources remain grounded/i,
        expanded: false,
      }),
    );
    fireEvent.change(screen.getByRole('textbox', { name: 'Summary point 2' }), {
      target: { value: 'Edited second section' },
    });

    expect(screen.getByRole('status')).toHaveTextContent('Saving');
    expect(screen.getByRole('status')).toBeVisible();
    await act(() => new Promise((resolve) => setTimeout(resolve, 750)));
    expect(screen.getByRole('status')).toHaveTextContent(
      'Check your connection and try again',
    );
    expect(screen.getByRole('status')).toBeVisible();
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
    await user.click(
      screen.getByRole('button', { name: 'Export to Markdown' }),
    );
    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:result');
  });

  it('preserves export choices across tab unmount and resets them for a new analysis', async () => {
    const user = userEvent.setup();
    const view = renderWorkspace();
    await user.click(screen.getByRole('tab', { name: 'Export' }));
    await user.click(screen.getByRole('button', { name: /Obsidian/i }));
    await user.click(screen.getByRole('checkbox', { name: /Summary/i }));
    await user.click(screen.getByRole('tab', { name: 'Overview' }));
    await user.click(screen.getByRole('tab', { name: 'Export' }));

    expect(screen.getByRole('button', { name: /^Obsidian/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(
      screen.getByRole('checkbox', { name: /Summary/i }),
    ).not.toBeChecked();

    view.rerender(
      <PlayerProvider controller={controller}>
        <ResultWorkspace
          model={{
            ...model,
            source: {
              ...model.source,
              intakeId: 'analysis-b',
              title: 'Second analysis',
            },
          }}
          saveTitle={vi.fn()}
          saveArtifact={vi.fn()}
        />
      </PlayerProvider>,
    );
    await user.click(screen.getByRole('tab', { name: 'Export' }));

    expect(screen.getByRole('button', { name: /^Markdown/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('checkbox', { name: /Summary/i })).toBeChecked();
    expect(screen.getByTestId('export-preview')).toHaveTextContent(
      'Second analysis',
    );
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
    await user.click(screen.getByRole('button', { name: 'Edit flashcards' }));
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
    expect(markdown).not.toContain('Draft export question?');
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
