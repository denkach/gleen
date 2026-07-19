'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  ResultMutationState,
  ResultSaveState,
} from '@/lib/result-workspace/actions';
import { getAddressableResultArtifacts } from '@/lib/result-workspace/artifact-availability';
import { resultCopy, type ResultCopy } from '@/lib/result-workspace/copy';
import {
  initializeResultArtifactNavigation,
  navigateToResultArtifact,
  subscribeToResultArtifactNavigation,
  type ResultArtifact,
} from '@/lib/result-workspace/navigation';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';
import { Tabs, TabsContent, type TabsAccent } from '@/components/ui/tabs';

import { ArtifactState } from './artifact-state';
import { EditableTitle } from './editable-title';
import {
  ExportTab,
  initialExportUiState,
  type ExportUiState,
} from './export-tab';
import { FlashcardsTab } from './flashcards-tab';
import { OverviewTab } from './overview-tab';
import { flushPlaybackPositionOnPageHide } from './playback-pagehide-transport';
import { SummaryTab } from './summary-tab';
import { TimestampsTab } from './timestamps-tab';
import {
  initialTranscriptUiState,
  TranscriptTab,
  type TranscriptUiState,
} from './transcript-tab';
import {
  PlayerProvider,
  useVideoPlayer,
  useVideoPlayerSnapshot,
} from './player-context';
import type { VideoPlayerController } from './player-controller';
import { ResultHeader } from './result-header';
import { ResultNavigation } from './result-navigation';
import { SourcePanel } from './source-panel';
import { usePlaybackPersistence } from './use-playback-persistence';

type SaveAction = (input: unknown) => Promise<ResultSaveState>;
type MutationAction = (input: unknown) => Promise<ResultMutationState>;
type TabValue = ResultArtifact;
type ResultArtifactsProps = Readonly<{
  model: ResultWorkspaceModel;
  saveTitle: SaveAction;
  saveArtifact: SaveAction;
  copy: ResultCopy;
  favorite: boolean;
  favoritePending: boolean;
  onFavorite?: () => void;
  onShare?: () => void;
  saveFlashcardReview?: MutationAction;
  transcriptUiState: TranscriptUiState;
  onTranscriptUiStateChange: (nextState: TranscriptUiState) => void;
  exportUiState: ExportUiState;
  onExportUiStateChange: (nextState: ExportUiState) => void;
}>;

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length &&
      left.every((value, index) => valuesEqual(value, right[index]))
    );
  }
  if (
    left !== null &&
    right !== null &&
    typeof left === 'object' &&
    typeof right === 'object'
  ) {
    const leftRecord = left as Record<string, unknown>;
    const rightRecord = right as Record<string, unknown>;
    const leftKeys = Object.keys(leftRecord);
    const rightKeys = Object.keys(rightRecord);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) =>
          Object.hasOwn(rightRecord, key) &&
          valuesEqual(leftRecord[key], rightRecord[key]),
      )
    );
  }
  return false;
}

function mergeDraftValue<T>(base: T, draft: T, incoming: T): T {
  if (valuesEqual(draft, base)) return incoming;
  if (valuesEqual(incoming, base)) return draft;
  if (Array.isArray(base) && Array.isArray(draft) && Array.isArray(incoming)) {
    if (base.length !== draft.length || base.length !== incoming.length) {
      return draft;
    }
    return draft.map((value, index) =>
      mergeDraftValue(base[index], value, incoming[index]),
    ) as T;
  }
  if (
    base !== null &&
    draft !== null &&
    incoming !== null &&
    typeof base === 'object' &&
    typeof draft === 'object' &&
    typeof incoming === 'object'
  ) {
    const baseRecord = base as Record<string, unknown>;
    const draftRecord = draft as Record<string, unknown>;
    const incomingRecord = incoming as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(incomingRecord).map((key) => [
        key,
        mergeDraftValue(baseRecord[key], draftRecord[key], incomingRecord[key]),
      ]),
    ) as T;
  }
  return draft;
}

function reconcileResultDraft(
  base: ResultWorkspaceModel,
  draft: ResultWorkspaceModel,
  incoming: ResultWorkspaceModel,
): ResultWorkspaceModel {
  return {
    ...incoming,
    source: {
      ...incoming.source,
      title: mergeDraftValue(
        base.source.title,
        draft.source.title,
        incoming.source.title,
      ),
    },
    tabs: {
      ...incoming.tabs,
      summary: mergeDraftValue(
        base.tabs.summary,
        draft.tabs.summary,
        incoming.tabs.summary,
      ),
      flashcards: mergeDraftValue(
        base.tabs.flashcards,
        draft.tabs.flashcards,
        incoming.tabs.flashcards,
      ),
      timestamps: mergeDraftValue(
        base.tabs.timestamps,
        draft.tabs.timestamps,
        incoming.tabs.timestamps,
      ),
      transcript: incoming.tabs.transcript,
    },
  };
}

function ResultArtifacts({
  model,
  saveTitle,
  saveArtifact,
  copy,
  favorite,
  favoritePending,
  onFavorite,
  onShare,
  saveFlashcardReview,
  transcriptUiState,
  onTranscriptUiStateChange,
  exportUiState,
  onExportUiStateChange,
}: ResultArtifactsProps) {
  const [tab, setTab] = useState<TabValue>('overview');
  const [draftState, setDraftState] = useState(() => ({
    base: model,
    draft: model,
  }));
  const reconciledDraftState =
    draftState.base === model
      ? draftState
      : {
          base: model,
          draft: reconcileResultDraft(draftState.base, draftState.draft, model),
        };
  if (reconciledDraftState !== draftState) {
    setDraftState(reconciledDraftState);
  }
  const draftModel = reconciledDraftState.draft;
  const setDraftModel = (
    update: (current: ResultWorkspaceModel) => ResultWorkspaceModel,
  ) => {
    setDraftState((current) => {
      const synchronizedDraft =
        current.base === model
          ? current.draft
          : reconcileResultDraft(current.base, current.draft, model);
      return { base: model, draft: update(synchronizedDraft) };
    });
  };
  const availableArtifacts = useMemo(
    () => getAddressableResultArtifacts(model.tabs),
    [model.tabs],
  );
  useEffect(() => {
    let subscribed = true;
    const initialArtifact =
      initializeResultArtifactNavigation(availableArtifacts);
    queueMicrotask(() => {
      if (subscribed) setTab(initialArtifact);
    });
    const unsubscribe = subscribeToResultArtifactNavigation(
      setTab,
      availableArtifacts,
    );
    return () => {
      subscribed = false;
      unsubscribe();
    };
  }, [availableArtifacts]);

  const selectTab = (value: string) => {
    const artifact = value as ResultArtifact;
    setTab(artifact);
    navigateToResultArtifact(artifact);
  };
  const accent: TabsAccent =
    tab === 'summary' ||
    tab === 'flashcards' ||
    tab === 'timestamps' ||
    tab === 'export'
      ? tab
      : 'neutral';
  const triggers: readonly {
    value: TabValue;
    label: string;
    unavailable?: boolean;
  }[] = [
    { value: 'overview', label: copy.tabOverview },
    {
      value: 'summary',
      label: copy.tabSummary,
      unavailable: model.tabs.summary.status !== 'ready',
    },
    {
      value: 'flashcards',
      label: copy.tabFlashcards,
      unavailable: model.tabs.flashcards.status !== 'ready',
    },
    {
      value: 'timestamps',
      label: copy.tabTimestamps,
      unavailable: model.tabs.timestamps.status !== 'ready',
    },
    {
      value: 'transcript',
      label: copy.tabTranscript,
      unavailable: model.tabs.transcript.status !== 'ready',
    },
    { value: 'export', label: copy.tabExport },
  ];
  return (
    <section className="result-workspace" aria-label={copy.workspaceLabel}>
      <Tabs value={tab} onValueChange={selectTab}>
        <ResultHeader
          title={
            <EditableTitle
              analysisId={model.source.intakeId}
              title={draftModel.source.title}
              onTitleChange={(title) =>
                setDraftModel((current) => ({
                  ...current,
                  source: { ...current.source, title },
                }))
              }
              revision={model.revisions.title}
              saveTitle={saveTitle}
            />
          }
          subtitle={model.source.channelTitle}
          favorite={favorite}
          favoritePending={favoritePending}
          copy={copy}
          onFavorite={onFavorite}
          onShare={onShare}
          navigation={
            <ResultNavigation accent={accent} copy={copy} items={triggers} />
          }
        />
        <div className="result-artifact-content">
          <TabsContent value="overview">
            <OverviewTab model={model} openTab={selectTab} copy={copy} />
          </TabsContent>
          <TabsContent
            value="summary"
            forceMount
            aria-hidden={tab !== 'summary'}
            className="data-[state=inactive]:hidden"
          >
            {model.tabs.summary.status === 'ready' ? (
              <SummaryTab
                key={model.revisions.summary}
                analysisId={model.source.intakeId}
                summary={
                  draftModel.tabs.summary.status === 'ready'
                    ? draftModel.tabs.summary.data
                    : model.tabs.summary.data
                }
                onSummaryChange={(summary) =>
                  setDraftModel((current) => ({
                    ...current,
                    tabs: {
                      ...current.tabs,
                      summary: { status: 'ready', data: summary },
                    },
                  }))
                }
                revision={model.revisions.summary!}
                saveArtifact={saveArtifact}
                flashcardCount={model.overview.flashcardCount}
                copy={copy}
              />
            ) : (
              <ArtifactState state={model.tabs.summary} />
            )}
          </TabsContent>
          <TabsContent
            value="flashcards"
            forceMount
            aria-hidden={tab !== 'flashcards'}
            className="data-[state=inactive]:hidden"
          >
            {model.tabs.flashcards.status === 'ready' ? (
              <FlashcardsTab
                key={model.revisions.flashcards}
                analysisId={model.source.intakeId}
                artifact={
                  draftModel.tabs.flashcards.status === 'ready'
                    ? draftModel.tabs.flashcards.data
                    : model.tabs.flashcards.data
                }
                onArtifactChange={(flashcards) =>
                  setDraftModel((current) => ({
                    ...current,
                    tabs: {
                      ...current.tabs,
                      flashcards: { status: 'ready', data: flashcards },
                    },
                  }))
                }
                revision={model.revisions.flashcards!}
                saveArtifact={saveArtifact}
                saveFlashcardReview={saveFlashcardReview}
                reviews={model.userState?.reviews ?? null}
                copy={copy}
              />
            ) : (
              <ArtifactState state={model.tabs.flashcards} />
            )}
          </TabsContent>
          <TabsContent
            value="timestamps"
            forceMount
            aria-hidden={tab !== 'timestamps'}
            className="data-[state=inactive]:hidden"
          >
            {model.tabs.timestamps.status === 'ready' ? (
              <TimestampsTab
                key={model.revisions.timestamps}
                analysisId={model.source.intakeId}
                artifact={
                  draftModel.tabs.timestamps.status === 'ready'
                    ? draftModel.tabs.timestamps.data
                    : model.tabs.timestamps.data
                }
                onArtifactChange={(timestamps) =>
                  setDraftModel((current) => ({
                    ...current,
                    tabs: {
                      ...current.tabs,
                      timestamps: { status: 'ready', data: timestamps },
                    },
                  }))
                }
                revision={model.revisions.timestamps!}
                saveArtifact={saveArtifact}
                durationSeconds={model.source.durationSeconds}
                thumbnailUrl={model.source.thumbnailUrl}
                sourceTitle={model.source.title}
                copy={copy}
              />
            ) : (
              <ArtifactState state={model.tabs.timestamps} />
            )}
          </TabsContent>
          <TabsContent value="transcript">
            {model.tabs.transcript.status === 'ready' ? (
              <TranscriptTab
                transcript={model.tabs.transcript.data}
                copy={copy}
                active={tab === 'transcript'}
                uiState={transcriptUiState}
                onUiStateChange={onTranscriptUiStateChange}
              />
            ) : (
              <ArtifactState state={model.tabs.transcript} />
            )}
          </TabsContent>
          <TabsContent value="export">
            <ExportTab
              model={draftModel}
              copy={copy}
              uiState={exportUiState}
              onUiStateChange={onExportUiStateChange}
            />
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}

function ResultArtifactsStateOwner({
  ...props
}: Omit<
  ResultArtifactsProps,
  | 'transcriptUiState'
  | 'onTranscriptUiStateChange'
  | 'exportUiState'
  | 'onExportUiStateChange'
>) {
  const [transcriptUiState, setTranscriptUiState] = useState(
    initialTranscriptUiState,
  );
  const [exportUiState, setExportUiState] = useState(initialExportUiState);

  return (
    <ResultArtifacts
      {...props}
      transcriptUiState={transcriptUiState}
      onTranscriptUiStateChange={setTranscriptUiState}
      exportUiState={exportUiState}
      onExportUiStateChange={setExportUiState}
    />
  );
}

export type ResultWorkspaceProps = Readonly<{
  model: ResultWorkspaceModel;
  copy?: ResultCopy;
  saveTitle: SaveAction;
  saveArtifact: SaveAction;
  savePreference?: MutationAction;
  savePlaybackPosition?: MutationAction;
  saveFlashcardReview?: MutationAction;
  onShare?: () => void;
}>;

function PlaybackPersistence({
  analysisId,
  initialPositionMs,
  savePlaybackPosition,
}: Readonly<{
  analysisId: string;
  initialPositionMs: number;
  savePlaybackPosition?: MutationAction;
}>) {
  usePlaybackPersistence({
    analysisId,
    flushPlaybackPosition: flushPlaybackPositionOnPageHide,
    initialPositionMs,
    savePlaybackPosition,
  });
  return null;
}

const selectPlayerStatus = (snapshot: { status: string }) => snapshot.status;

function ResultLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const playerStatus = useVideoPlayerSnapshot(selectPlayerStatus);

  return (
    <div
      className="result-page-layout"
      data-testid="result-layout"
      data-player-status={playerStatus}
    >
      {children}
    </div>
  );
}

export function ResultWorkspace(props: ResultWorkspaceProps) {
  const { model, copy = resultCopy.en } = props;
  const parentController = useVideoPlayer();
  const lifecycleKey = model.source.intakeId;
  const [controllerState, setControllerState] = useState<{
    lifecycleKey: string;
    controller?: VideoPlayerController;
  }>({ lifecycleKey });
  const controller =
    controllerState.lifecycleKey === lifecycleKey
      ? controllerState.controller
      : undefined;
  const updateController = useCallback(
    (next: VideoPlayerController | null, replaced?: VideoPlayerController) => {
      setControllerState((current) => {
        if (next) return { lifecycleKey, controller: next };
        if (current.controller !== replaced) return current;
        return { lifecycleKey };
      });
    },
    [lifecycleKey],
  );
  const duration = new Date(model.source.durationSeconds * 1_000)
    .toISOString()
    .slice(model.source.durationSeconds >= 3600 ? 11 : 14, 19);
  const playbackPositionMs = model.userState?.playbackPositionMs ?? 0;
  const initialFavorite = model.userState?.favorite ?? false;
  const [favoriteState, setFavoriteState] = useState<{
    lifecycleKey: string;
    value: boolean;
    pending: boolean;
    requestId: number;
  }>({ lifecycleKey, value: initialFavorite, pending: false, requestId: 0 });
  const favorite =
    favoriteState.lifecycleKey === lifecycleKey
      ? favoriteState.value
      : initialFavorite;
  const favoritePending =
    favoriteState.lifecycleKey === lifecycleKey && favoriteState.pending;
  const activeFavoriteLifecycleRef = useRef(lifecycleKey);
  useLayoutEffect(() => {
    activeFavoriteLifecycleRef.current = lifecycleKey;
  }, [lifecycleKey]);
  const favoriteRequestSequenceRef = useRef(0);
  const favoriteRequestTokensRef = useRef(new Map<string, number>());
  const [favoriteMessages, setFavoriteMessages] = useState<
    Readonly<Record<string, string>>
  >({});
  const favoriteMessage = favoriteMessages[lifecycleKey] ?? '';
  const savePreference = props.savePreference;
  const toggleFavorite = useCallback(() => {
    if (!savePreference || favoritePending) return;
    const previous = favorite;
    const next = !previous;
    const requestId = ++favoriteRequestSequenceRef.current;
    favoriteRequestTokensRef.current.set(lifecycleKey, requestId);
    const requestIsCurrent = () =>
      activeFavoriteLifecycleRef.current === lifecycleKey &&
      favoriteRequestTokensRef.current.get(lifecycleKey) === requestId;
    const settleFavorite = (value: boolean) =>
      setFavoriteState((current) =>
        current.lifecycleKey === lifecycleKey && current.requestId === requestId
          ? { lifecycleKey, value, pending: false, requestId }
          : current,
      );
    const announce = (value: string) =>
      setFavoriteMessages((current) => ({
        ...current,
        [lifecycleKey]: value,
      }));
    setFavoriteState({
      lifecycleKey,
      value: next,
      pending: true,
      requestId,
    });
    void savePreference({ analysisId: lifecycleKey, favorite: next })
      .then((result) => {
        if (!requestIsCurrent()) return;
        if (result.status === 'saved') {
          settleFavorite(next);
          announce(next ? copy.favoriteAdded : copy.favoriteRemoved);
          return;
        }
        settleFavorite(previous);
        announce(copy.favoriteError);
      })
      .catch(() => {
        if (!requestIsCurrent()) return;
        settleFavorite(previous);
        announce(copy.favoriteError);
      });
  }, [copy, favorite, favoritePending, lifecycleKey, savePreference]);
  const favoriteAction = savePreference ? toggleFavorite : undefined;

  return (
    <PlayerProvider controller={parentController ?? controller ?? null}>
      <PlaybackPersistence
        analysisId={model.source.intakeId}
        initialPositionMs={playbackPositionMs}
        savePlaybackPosition={props.savePlaybackPosition}
      />
      <ResultLayout>
        {favoriteMessage ? (
          <span className="sr-only" role="status" aria-live="polite">
            {favoriteMessage}
          </span>
        ) : null}
        <SourcePanel
          source={{
            videoId: model.source.youtubeVideoId,
            title: model.source.title,
            channel: model.source.channelTitle,
            duration,
            language:
              model.tabs.transcript.status === 'ready'
                ? model.tabs.transcript.data.language.toUpperCase()
                : '—',
            thumbnailUrl: model.source.thumbnailUrl,
          }}
          copy={copy}
          chapters={
            model.tabs.timestamps.status === 'ready'
              ? model.tabs.timestamps.data.chapters
              : []
          }
          favorite={favorite}
          favoritePending={favoritePending}
          onFavorite={favoriteAction}
          onShare={props.onShare}
          playerLifecycleKey={lifecycleKey}
          initialPositionMs={playbackPositionMs}
          onPlayerReady={updateController}
        />
        <ResultArtifactsStateOwner
          key={lifecycleKey}
          model={model}
          copy={copy}
          saveTitle={props.saveTitle}
          saveArtifact={props.saveArtifact}
          favorite={favorite}
          favoritePending={favoritePending}
          onFavorite={favoriteAction}
          onShare={props.onShare}
          saveFlashcardReview={props.saveFlashcardReview}
        />
      </ResultLayout>
    </PlayerProvider>
  );
}
