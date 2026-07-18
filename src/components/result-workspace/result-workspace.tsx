'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type {
  ResultMutationState,
  ResultSaveState,
} from '@/lib/result-workspace/actions';
import { resultCopy, type ResultCopy } from '@/lib/result-workspace/copy';
import {
  initializeResultArtifactNavigation,
  navigateToResultArtifact,
  subscribeToResultArtifactNavigation,
  type ResultArtifact,
} from '@/lib/result-workspace/navigation';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  type TabsAccent,
} from '@/components/ui/tabs';

import { ArtifactState } from './artifact-state';
import { EditableTitle } from './editable-title';
import { ExportTab } from './export-tab';
import { FlashcardsTab } from './flashcards-tab';
import { OverviewTab } from './overview-tab';
import { SummaryTab } from './summary-tab';
import { TimestampsTab } from './timestamps-tab';
import { TranscriptTab } from './transcript-tab';
import { PlayerProvider, useVideoPlayer } from './player-context';
import type { VideoPlayerController } from './player-controller';
import { SourcePanel } from './source-panel';
import { usePlaybackPersistence } from './use-playback-persistence';

type SaveAction = (input: unknown) => Promise<ResultSaveState>;
type MutationAction = (input: unknown) => Promise<ResultMutationState>;
type TabValue = ResultArtifact;

function ResultArtifacts({
  model,
  saveTitle,
  saveArtifact,
  copy,
}: Readonly<{
  model: ResultWorkspaceModel;
  saveTitle: SaveAction;
  saveArtifact: SaveAction;
  copy: ResultCopy;
}>) {
  const [tab, setTab] = useState<TabValue>('overview');
  const [draftModel, setDraftModel] = useState(model);
  const availableArtifacts = useMemo<readonly ResultArtifact[]>(() => {
    const artifacts: ResultArtifact[] = ['overview'];
    if (model.tabs.summary.status === 'ready') artifacts.push('summary');
    if (model.tabs.flashcards.status === 'ready') artifacts.push('flashcards');
    if (model.tabs.timestamps.status === 'ready') artifacts.push('timestamps');
    if (model.tabs.transcript.status === 'ready') artifacts.push('transcript');
    artifacts.push('export');
    return artifacts;
  }, [
    model.tabs.flashcards.status,
    model.tabs.summary.status,
    model.tabs.timestamps.status,
    model.tabs.transcript.status,
  ]);
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
      <Tabs value={tab} onValueChange={selectTab}>
        <TabsList
          accent={accent}
          aria-label={copy.tabsLabel}
          className="sticky top-0 z-10 w-full overflow-x-auto bg-[var(--background-elevated)] px-3 max-[720px]:px-1"
        >
          {triggers.map((trigger) => (
            <TabsTrigger
              key={trigger.value}
              value={trigger.value}
              data-artifact-unavailable={trigger.unavailable || undefined}
              className="min-h-11 shrink-0"
            >
              {trigger.label}
            </TabsTrigger>
          ))}
        </TabsList>
        <div className="p-6 max-[720px]:p-4">
          <TabsContent value="overview">
            <OverviewTab model={model} openTab={selectTab} />
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
              />
            ) : (
              <ArtifactState state={model.tabs.timestamps} />
            )}
          </TabsContent>
          <TabsContent value="transcript">
            {model.tabs.transcript.status === 'ready' ? (
              <TranscriptTab transcript={model.tabs.transcript.data} />
            ) : (
              <ArtifactState state={model.tabs.transcript} />
            )}
          </TabsContent>
          <TabsContent value="export">
            <ExportTab model={draftModel} />
          </TabsContent>
        </div>
      </Tabs>
    </section>
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
    initialPositionMs,
    savePlaybackPosition,
  });
  return null;
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
  const artifactRevisionKey = `${model.source.intakeId}:${model.revisions.title}:${model.revisions.summary ?? ''}:${model.revisions.flashcards ?? ''}:${model.revisions.timestamps ?? ''}`;

  return (
    <PlayerProvider controller={parentController ?? controller ?? null}>
      <PlaybackPersistence
        analysisId={model.source.intakeId}
        initialPositionMs={playbackPositionMs}
        savePlaybackPosition={props.savePlaybackPosition}
      />
      <div className="result-layout" data-testid="result-layout">
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
          playerLifecycleKey={lifecycleKey}
          initialPositionMs={playbackPositionMs}
          onPlayerReady={updateController}
        />
        <ResultArtifacts
          key={artifactRevisionKey}
          model={model}
          copy={copy}
          saveTitle={props.saveTitle}
          saveArtifact={props.saveArtifact}
        />
      </div>
    </PlayerProvider>
  );
}
