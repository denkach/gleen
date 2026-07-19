'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type {
  ResultMutationState,
  ResultSaveState,
  ResultShareState,
} from '@/lib/result-workspace/actions';
import { trackResultEvent } from '@/lib/analytics/result-events';
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
import { ChapterSheet } from './chapter-sheet';
import { EditableTitle } from './editable-title';
import {
  ExportTab,
  initialExportUiState,
  type ExportUiState,
} from './export-tab';
import { FlashcardsTab } from './flashcards-tab';
import { MobileMiniPlayer } from './mobile-mini-player';
import { MobileResultNavigation } from './mobile-result-navigation';
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
import { ResultShareDialog } from './result-share-dialog';
import { SourcePanel } from './source-panel';
import { useArtifactSwipe } from './use-artifact-swipe';
import { useMobileResultLayout } from './use-mobile-result-layout';
import { usePlaybackPersistence } from './use-playback-persistence';
import { usePlayerVisibility } from './use-player-visibility';
import { useResultScrollMemory } from './use-result-scroll-memory';

type SaveAction = (input: unknown) => Promise<ResultSaveState>;
type MutationAction = (input: unknown) => Promise<ResultMutationState>;
type ShareAction = (input: unknown) => Promise<ResultShareState>;
type TabValue = ResultArtifact;
type ResultArtifactsProps = Readonly<{
  model: ResultWorkspaceModel;
  saveTitle: SaveAction;
  saveArtifact: SaveAction;
  copy: ResultCopy;
  favorite: boolean;
  favoritePending: boolean;
  mobileResultLayout: boolean;
  workspaceFocusRef: RefObject<HTMLElement | null>;
  onFavorite?: () => void;
  onShare?: () => void;
  saveFlashcardReview?: MutationAction;
  transcriptUiState: TranscriptUiState;
  onTranscriptUiStateChange: (nextState: TranscriptUiState) => void;
  exportUiState: ExportUiState;
  onExportUiStateChange: (nextState: ExportUiState) => void;
  publicMode: boolean;
}>;

const unavailableSaveAction: SaveAction = async () => ({ status: 'error' });

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
  if (valuesEqual(draft, incoming)) return incoming;
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
  mobileResultLayout,
  workspaceFocusRef,
  onFavorite,
  onShare,
  saveFlashcardReview,
  transcriptUiState,
  onTranscriptUiStateChange,
  exportUiState,
  onExportUiStateChange,
  publicMode,
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
  const { restoreScrollPosition, saveScrollPosition } = useResultScrollMemory(
    model.source.intakeId,
  );
  useEffect(() => {
    let subscribed = true;
    const initialArtifact =
      initializeResultArtifactNavigation(availableArtifacts);
    queueMicrotask(() => {
      if (subscribed) setTab(initialArtifact);
    });
    const unsubscribe = subscribeToResultArtifactNavigation((artifact) => {
      setTab((current) => {
        if (current !== artifact) saveScrollPosition(current);
        return artifact;
      });
    }, availableArtifacts);
    return () => {
      subscribed = false;
      unsubscribe();
    };
  }, [availableArtifacts, saveScrollPosition]);

  useEffect(() => {
    restoreScrollPosition(tab);
  }, [restoreScrollPosition, tab]);

  const selectTab = (value: string) => {
    const artifact = value as ResultArtifact;
    if (artifact === tab) return;
    saveScrollPosition(tab);
    setTab(artifact);
    navigateToResultArtifact(artifact);
  };
  const navigateByOffset = (offset: -1 | 1) => {
    const currentIndex = availableArtifacts.indexOf(tab);
    const nextArtifact = availableArtifacts[currentIndex + offset];
    if (nextArtifact) selectTab(nextArtifact);
  };
  const swipeHandlers = useArtifactSwipe({
    onNext: () => navigateByOffset(1),
    onPrevious: () => navigateByOffset(-1),
  });
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
    <section
      ref={workspaceFocusRef}
      className="result-workspace"
      aria-label={copy.workspaceLabel}
      tabIndex={-1}
    >
      <Tabs value={tab} onValueChange={selectTab}>
        <ResultHeader
          title={
            publicMode ? (
              <h1>{model.source.title}</h1>
            ) : (
              <EditableTitle
                analysisId={model.source.intakeId}
                title={draftModel.source.title}
                serverTitle={model.source.title}
                onTitleChange={(title) =>
                  setDraftModel((current) => ({
                    ...current,
                    source: { ...current.source, title },
                  }))
                }
                revision={model.revisions.title}
                saveTitle={saveTitle}
              />
            )
          }
          subtitle={model.source.channelTitle}
          favorite={favorite}
          favoritePending={favoritePending}
          copy={copy}
          onFavorite={publicMode ? undefined : onFavorite}
          onShare={publicMode ? undefined : onShare}
          navigation={
            <ResultNavigation accent={accent} copy={copy} items={triggers} />
          }
        />
        <div className="result-artifact-content" {...swipeHandlers}>
          <TabsContent value="overview">
            <OverviewTab
              model={model}
              openTab={selectTab}
              copy={copy}
              publicMode={publicMode}
            />
          </TabsContent>
          <TabsContent
            value="summary"
            forceMount
            aria-hidden={tab !== 'summary'}
            className="data-[state=inactive]:hidden"
          >
            {model.tabs.summary.status === 'ready' ? (
              <SummaryTab
                analysisId={model.source.intakeId}
                summary={
                  draftModel.tabs.summary.status === 'ready'
                    ? draftModel.tabs.summary.data
                    : model.tabs.summary.data
                }
                serverSummary={model.tabs.summary.data}
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
                readOnly={publicMode}
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
                analysisId={model.source.intakeId}
                artifact={
                  draftModel.tabs.flashcards.status === 'ready'
                    ? draftModel.tabs.flashcards.data
                    : model.tabs.flashcards.data
                }
                serverArtifact={model.tabs.flashcards.data}
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
                readOnly={publicMode}
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
                analysisId={model.source.intakeId}
                artifact={
                  draftModel.tabs.timestamps.status === 'ready'
                    ? draftModel.tabs.timestamps.data
                    : model.tabs.timestamps.data
                }
                serverArtifact={model.tabs.timestamps.data}
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
                readOnly={publicMode}
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
        {mobileResultLayout ? (
          <MobileResultNavigation
            activeArtifact={tab}
            copy={copy}
            items={triggers}
            onSelect={selectTab}
            responsiveFallbackRef={workspaceFocusRef}
          />
        ) : null}
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
  mode?: 'owner' | 'public';
  saveTitle?: SaveAction;
  saveArtifact?: SaveAction;
  savePreference?: MutationAction;
  savePlaybackPosition?: MutationAction;
  saveFlashcardReview?: MutationAction;
  onShare?: () => void;
  createShare?: ShareAction;
  revokeShare?: MutationAction;
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
  const publicMode = props.mode === 'public';
  const parentController = useVideoPlayer();
  const lifecycleKey = model.source.intakeId;
  const playerStageRef = useRef<HTMLDivElement>(null);
  const workspaceFocusRef = useRef<HTMLElement>(null);
  const chapterSheetTriggerRef = useRef<HTMLElement | null>(null);
  const playerVisible = usePlayerVisibility(playerStageRef);
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
  const favoriteAction =
    !publicMode && savePreference ? toggleFavorite : undefined;
  const [shareOpen, setShareOpen] = useState(false);
  const managedShare = Boolean(props.createShare && props.revokeShare);
  const shareAction = publicMode
    ? undefined
    : (props.onShare ?? (managedShare ? () => setShareOpen(true) : undefined));
  const chapters =
    model.tabs.timestamps.status === 'ready'
      ? model.tabs.timestamps.data.chapters
      : [];
  const [chapterSheetState, setChapterSheetState] = useState({
    lifecycleKey,
    open: false,
  });
  const chapterSheetOpen =
    chapterSheetState.lifecycleKey === lifecycleKey && chapterSheetState.open;
  const setChapterSheetOpen = useCallback(
    (open: boolean) => setChapterSheetState({ lifecycleKey, open }),
    [lifecycleKey],
  );
  const openChapterSheet = useCallback(() => {
    chapterSheetTriggerRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    trackResultEvent({
      name: 'result_chapter_sheet_opened',
      anonymousAnalysisId: lifecycleKey,
    });
    setChapterSheetOpen(true);
  }, [lifecycleKey, setChapterSheetOpen]);
  const handleMobileResultLayoutChange = useCallback(
    (mobile: boolean) => {
      if (mobile || !chapterSheetOpen) return;
      chapterSheetTriggerRef.current = workspaceFocusRef.current;
      setChapterSheetOpen(false);
    },
    [chapterSheetOpen, setChapterSheetOpen],
  );
  const mobileResultLayout = useMobileResultLayout(
    handleMobileResultLayoutChange,
  );
  const expandPlayer = useCallback(() => {
    trackResultEvent({
      name: 'result_mobile_miniplayer_expanded',
      anonymousAnalysisId: lifecycleKey,
    });
    const reduceMotion =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    playerStageRef.current?.scrollIntoView({
      block: 'start',
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [lifecycleKey]);

  return (
    <PlayerProvider controller={parentController ?? controller ?? null}>
      {!publicMode ? (
        <PlaybackPersistence
          analysisId={model.source.intakeId}
          initialPositionMs={playbackPositionMs}
          savePlaybackPosition={props.savePlaybackPosition}
        />
      ) : null}
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
          chapters={chapters}
          favorite={favorite}
          favoritePending={favoritePending}
          onFavorite={favoriteAction}
          onShare={shareAction}
          playerLifecycleKey={lifecycleKey}
          initialPositionMs={playbackPositionMs}
          onPlayerReady={updateController}
          onOpenChapters={mobileResultLayout ? openChapterSheet : undefined}
          playerStageRef={playerStageRef}
        />
        <ResultArtifactsStateOwner
          key={lifecycleKey}
          model={model}
          copy={copy}
          saveTitle={props.saveTitle ?? unavailableSaveAction}
          saveArtifact={props.saveArtifact ?? unavailableSaveAction}
          favorite={favorite}
          favoritePending={favoritePending}
          mobileResultLayout={mobileResultLayout}
          workspaceFocusRef={workspaceFocusRef}
          onFavorite={favoriteAction}
          onShare={shareAction}
          saveFlashcardReview={
            publicMode ? undefined : props.saveFlashcardReview
          }
          publicMode={publicMode}
        />
        {mobileResultLayout && !playerVisible ? (
          <MobileMiniPlayer
            analysisId={lifecycleKey}
            chapters={chapters}
            copy={copy}
            onChapters={openChapterSheet}
            onExpand={expandPlayer}
            thumbnailUrl={model.source.thumbnailUrl}
            title={model.source.title}
          />
        ) : null}
        {mobileResultLayout || chapterSheetOpen ? (
          <ChapterSheet
            analysisId={lifecycleKey}
            chapters={chapters}
            copy={copy}
            open={chapterSheetOpen}
            onOpenChange={setChapterSheetOpen}
            responsiveFallbackRef={workspaceFocusRef}
            restoreFocusRef={chapterSheetTriggerRef}
          />
        ) : null}
        {!publicMode && props.createShare && props.revokeShare ? (
          <ResultShareDialog
            key={`share-${lifecycleKey}`}
            analysisId={lifecycleKey}
            copy={copy}
            createShare={props.createShare}
            revokeShare={props.revokeShare}
            open={shareOpen}
            onOpenChange={setShareOpen}
          />
        ) : null}
      </ResultLayout>
    </PlayerProvider>
  );
}
