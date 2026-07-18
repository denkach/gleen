'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';

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

function installFixturePlayer(fixtureId: string, initialOffsetMs: number) {
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

    getIframe() {
      return this.iframe;
    }

    pauseVideo() {
      state.pause();
    }

    playVideo() {
      state.play();
    }

    seekTo(seconds: number) {
      state.currentTime = seconds;
      state.seeks.push(seconds);
      state.commands.push({
        type: 'seek',
        offsetMs: Math.round(seconds * 1_000),
      });
    }
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
) {
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      if (initialOffsetMs !== undefined) {
        const cleanup = installFixturePlayer(fixtureId, initialOffsetMs);
        onStoreChange();
        return cleanup;
      }
      return () => undefined;
    },
    [fixtureId, initialOffsetMs],
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
  return {
    ...content,
    keyPoints: content.keyPoints.map((point) =>
      typeof point === 'string'
        ? { text: point, sourceOffsetMs: null }
        : { text: point.text, sourceOffsetMs: point.sourceOffsetMs ?? null },
    ),
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
  initialModel,
  fixturePlayerStartMs,
}: Readonly<{
  initialModel: ResultWorkspaceModel;
  fixturePlayerStartMs?: number;
}>) {
  const storageKey = `gleen:result-fixture:${initialModel.source.intakeId}`;
  const [model, setModel] = useState(initialModel);
  const fixturePlayerReady = useFixturePlayerReady(
    initialModel.source.intakeId,
    fixturePlayerStartMs,
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

  const update = (
    transform: (current: ResultWorkspaceModel) => ResultWorkspaceModel,
  ): ResultSaveState => {
    const updatedAt = new Date().toISOString();
    setModel((current) => {
      const next = transform(
        current === initialModel
          ? (readStoredModel(storageKey) ?? current)
          : current,
      );
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
    return { status: 'saved', updatedAt };
  };

  if (!hydrated || !fixturePlayerReady) return null;

  return (
    <ResultWorkspace
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
        return update((current) => ({
          ...current,
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
    />
  );
}
