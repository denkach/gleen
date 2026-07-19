'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';
import { z } from 'zod';

import { ResultWorkspace } from '@/components/result-workspace/result-workspace';
import type { ResultSaveState } from '@/lib/result-workspace/actions';
import {
  resultArtifactEditSchema,
  resultTitleEditSchema,
} from '@/lib/result-workspace/edit-schemas';
import type {
  ResultWorkspaceModel,
  SummaryPresentation,
} from '@/lib/result-workspace/presentation';
import { flashcardRatingSchema } from '@/lib/result-workspace/user-state';
import { resultCopy } from '@/lib/result-workspace/copy';

const shareFixtureStorageKey = 'gleen:result-share-fixture';

const fixtureFlashcardReviewSchema = z
  .object({
    analysisId: z.uuid(),
    artifactRevision: z.iso.datetime({ offset: true }),
    cardIndex: z.number().int().nonnegative(),
    rating: flashcardRatingSchema,
  })
  .strict();

type FixturePlayerCommand = Readonly<{
  type: 'destroy' | 'pause' | 'play' | 'seek';
  offsetMs?: number;
}>;

type FixturePlayerState = {
  fixtureId: string;
  currentTime: number;
  playing: boolean;
  seeks: number[];
  commands: FixturePlayerCommand[];
  pause(): void;
  play(): void;
};

declare global {
  interface Window {
    __fixturePlayer?: FixturePlayerState;
  }
}

function installFixturePlayer(
  fixtureId: string,
  initialOffsetMs: number,
  durationSeconds: number,
) {
  const hadPreviousApi = Object.prototype.hasOwnProperty.call(window, 'YT');
  const hadPreviousState = Object.prototype.hasOwnProperty.call(
    window,
    '__fixturePlayer',
  );
  const previousApi = window.YT;
  const previousState = window.__fixturePlayer;

  const state: FixturePlayerState = {
    fixtureId,
    currentTime: initialOffsetMs / 1_000,
    playing: false,
    seeks: [],
    commands: [],
    pause() {
      state.playing = false;
      state.commands.push({ type: 'pause' });
    },
    play() {
      state.playing = true;
      state.commands.push({ type: 'play' });
    },
  };

  class Player {
    readonly iframe = document.createElement('iframe');

    constructor(
      element: HTMLElement,
      options: { events: { onReady(): void } },
    ) {
      this.iframe.dataset.fixturePlayerMount = fixtureId;
      element.replaceChildren(this.iframe);
      queueMicrotask(() => options.events.onReady());
    }

    destroy() {
      state.commands.push({ type: 'destroy' });
      this.iframe.remove();
    }

    getCurrentTime() {
      return state.currentTime;
    }

    getDuration() {
      return durationSeconds;
    }

    getPlaybackRate() {
      return 1.25;
    }

    getAvailablePlaybackRates() {
      return [1, 1.25, 1.5, 2];
    }

    getVolume() {
      return 100;
    }

    isMuted() {
      return false;
    }

    getIframe() {
      return this.iframe;
    }

    pauseVideo() {
      state.pause();
    }

    playVideo() {
      state.play();
    }

    mute() {}

    setPlaybackRate() {}

    setVolume() {}

    seekTo(seconds: number) {
      state.currentTime = seconds;
      state.seeks.push(seconds);
      state.commands.push({
        type: 'seek',
        offsetMs: Math.round(seconds * 1_000),
      });
    }

    unMute() {}
  }

  const api = { Player } as unknown as NonNullable<Window['YT']>;
  window.YT = api;
  window.__fixturePlayer = state;

  return () => {
    if (window.YT === api) {
      if (hadPreviousApi) window.YT = previousApi;
      else delete window.YT;
    }
    if (window.__fixturePlayer === state) {
      if (hadPreviousState) window.__fixturePlayer = previousState;
      else delete window.__fixturePlayer;
    }
  };
}

function useFixturePlayerReady(
  fixtureId: string,
  initialOffsetMs: number | undefined,
  durationSeconds: number,
) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (initialOffsetMs !== undefined) {
        const cleanup = installFixturePlayer(
          fixtureId,
          initialOffsetMs,
          durationSeconds,
        );
        onStoreChange();
        return cleanup;
      }
      return () => undefined;
    },
    [durationSeconds, fixtureId, initialOffsetMs],
  );
  const getSnapshot = useCallback(
    () =>
      initialOffsetMs === undefined ||
      window.__fixturePlayer?.fixtureId === fixtureId,
    [fixtureId, initialOffsetMs],
  );
  const getServerSnapshot = useCallback(
    () => initialOffsetMs === undefined,
    [initialOffsetMs],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

function normalizeSummary(
  content: Extract<
    ReturnType<typeof resultArtifactEditSchema.parse>,
    { kind: 'summary' }
  >['content'],
): SummaryPresentation {
  if (content.schemaVersion === 3) {
    return {
      ...content,
      overview: content.outcome,
      keyPoints: content.sections.map((section) => ({
        text: section.summary,
        sourceOffsetMs: section.sourceOffsetMs,
      })),
    };
  }
  const keyPoints = content.keyPoints.map((point) =>
    typeof point === 'string'
      ? { text: point, sourceOffsetMs: null }
      : { text: point.text, sourceOffsetMs: point.sourceOffsetMs ?? null },
  );
  return {
    ...content,
    outcome: content.overview,
    sections: keyPoints.map((point) => ({
      title: point.text,
      summary: point.text,
      details: point.text,
      supportingQuote: null,
      sourceOffsetMs: point.sourceOffsetMs,
    })),
    keyPoints,
  };
}

const subscribeToHydration = () => () => undefined;

function readStoredModel(storageKey: string): ResultWorkspaceModel | undefined {
  const saved = window.localStorage.getItem(storageKey);
  if (!saved) return undefined;
  try {
    return JSON.parse(saved) as ResultWorkspaceModel;
  } catch {
    window.localStorage.removeItem(storageKey);
    return undefined;
  }
}

export function FixtureResultWorkspace({
  favoriteSaveFails = false,
  initialModel,
  fixturePlayerStartMs,
  mode = 'owner',
}: Readonly<{
  favoriteSaveFails?: boolean;
  initialModel: ResultWorkspaceModel;
  fixturePlayerStartMs?: number;
  mode?: 'owner' | 'public';
}>) {
  const storageKey = `gleen:result-fixture:${initialModel.source.intakeId}`;
  const [model, setModel] = useState(initialModel);
  const fixturePlayerReady = useFixturePlayerReady(
    initialModel.source.intakeId,
    fixturePlayerStartMs,
    initialModel.source.durationSeconds,
  );
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    () => true,
    () => false,
  );
  const displayedModel =
    hydrated && model === initialModel
      ? (readStoredModel(storageKey) ?? model)
      : model;
  const publicShareAvailable = useSyncExternalStore(
    subscribeToHydration,
    () => window.localStorage.getItem(shareFixtureStorageKey) !== 'revoked',
    () => true,
  );

  const update = (
    transform: (
      current: ResultWorkspaceModel,
      updatedAt: string,
    ) => ResultWorkspaceModel,
  ): ResultSaveState => {
    const updatedAt = new Date().toISOString();
    setModel((current) => {
      const next = transform(
        current === initialModel
          ? (readStoredModel(storageKey) ?? current)
          : current,
        updatedAt,
      );
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    return { status: 'saved', updatedAt };
  };

  if (!hydrated || !fixturePlayerReady) return null;
  if (mode === 'public' && !publicShareAvailable) {
    return (
      <main className="result-public-unavailable">
        <section>
          <h1>{resultCopy.en.publicViewUnavailable}</h1>
          <p>{resultCopy.en.publicViewExpired}</p>
        </section>
      </main>
    );
  }

  return (
    <ResultWorkspace
      mode={mode}
      model={displayedModel}
      saveTitle={async (input) => {
        const edit = resultTitleEditSchema.parse(input);
        return update((current) => ({
          ...current,
          source: { ...current.source, title: edit.title },
        }));
      }}
      saveArtifact={async (input) => {
        const edit = resultArtifactEditSchema.parse(input);
        return update((current, updatedAt) => ({
          ...current,
          revisions: { ...current.revisions, [edit.kind]: updatedAt },
          tabs: {
            ...current.tabs,
            [edit.kind]: {
              status: 'ready',
              data:
                edit.kind === 'summary'
                  ? normalizeSummary(edit.content)
                  : edit.content,
            },
          },
        }));
      }}
      saveFlashcardReview={
        mode === 'owner' && displayedModel.userState
          ? async (input) => {
              const review = fixtureFlashcardReviewSchema.parse(input);
              if (review.analysisId !== displayedModel.source.intakeId)
                return { status: 'error' };
              update((current) => {
                if (!current.userState) return current;
                const reviews = [
                  ...current.userState.reviews.filter(
                    (item) =>
                      item.artifactRevision !== review.artifactRevision ||
                      item.cardIndex !== review.cardIndex,
                  ),
                  review,
                ];
                const reviewedFlashcardCount = new Set(
                  reviews
                    .filter(
                      (item) =>
                        item.artifactRevision === current.revisions.flashcards,
                    )
                    .map((item) => item.cardIndex),
                ).size;
                return {
                  ...current,
                  overview: { ...current.overview, reviewedFlashcardCount },
                  userState: {
                    ...current.userState,
                    lastStudyAction: 'flashcards_reviewed',
                    reviews,
                  },
                };
              });
              return { status: 'saved' };
            }
          : undefined
      }
      savePreference={
        mode === 'owner' && displayedModel.userState
          ? async (input) => {
              const preference = z
                .object({
                  analysisId: z.uuid(),
                  favorite: z.boolean(),
                })
                .strict()
                .parse(input);
              if (favoriteSaveFails) {
                await new Promise((resolve) => setTimeout(resolve, 250));
                return { status: 'error' } as const;
              }
              return update((current) =>
                current.userState &&
                preference.analysisId === current.source.intakeId
                  ? {
                      ...current,
                      userState: {
                        ...current.userState,
                        favorite: preference.favorite,
                      },
                    }
                  : current,
              );
            }
          : undefined
      }
      createShare={
        mode === 'owner'
          ? async () => {
              window.localStorage.setItem(shareFixtureStorageKey, 'active');
              return {
                status: 'created',
                url: `${window.location.origin}/app-shell-fixture/app/video/result-den-25-public`,
              } as const;
            }
          : undefined
      }
      revokeShare={
        mode === 'owner'
          ? async () => {
              window.localStorage.setItem(shareFixtureStorageKey, 'revoked');
              return { status: 'saved' } as const;
            }
          : undefined
      }
    />
  );
}
