'use client';

import { useState } from 'react';
import type { ResultSaveState } from '@/lib/result-workspace/actions';
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

type SaveAction = (input: unknown) => Promise<ResultSaveState>;
type TabValue =
  | 'overview'
  | 'summary'
  | 'flashcards'
  | 'timestamps'
  | 'transcript'
  | 'export';

function ResultArtifacts({
  model,
  saveTitle,
  saveArtifact,
}: Readonly<{
  model: ResultWorkspaceModel;
  saveTitle: SaveAction;
  saveArtifact: SaveAction;
}>) {
  const [tab, setTab] = useState<TabValue>('overview');
  const modelKey = `${model.revisions.title}:${model.revisions.summary ?? ''}:${model.revisions.flashcards ?? ''}:${model.revisions.timestamps ?? ''}`;
  const [draftModelKey, setDraftModelKey] = useState(modelKey);
  const [draftModel, setDraftModel] = useState(model);
  if (draftModelKey !== modelKey) {
    setDraftModelKey(modelKey);
    setDraftModel(model);
  }
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
    { value: 'overview', label: 'Overview' },
    {
      value: 'summary',
      label: 'Summary',
      unavailable: model.tabs.summary.status !== 'ready',
    },
    {
      value: 'flashcards',
      label: 'Flashcards',
      unavailable: model.tabs.flashcards.status !== 'ready',
    },
    {
      value: 'timestamps',
      label: 'Timestamps',
      unavailable: model.tabs.timestamps.status !== 'ready',
    },
    {
      value: 'transcript',
      label: 'Transcript',
      unavailable: model.tabs.transcript.status !== 'ready',
    },
    { value: 'export', label: 'Export' },
  ];
  return (
    <section className="result-workspace" aria-label="Analysis artifacts">
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
      <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
        <TabsList
          accent={accent}
          aria-label="Result artifacts"
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
            <OverviewTab model={model} openTab={setTab} />
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

const inactiveController: VideoPlayerController = {
  seekTo: () => undefined,
  play: () => undefined,
  pause: () => undefined,
  getCurrentTimeMs: () => 0,
};

export function ResultWorkspace(
  props: Readonly<{
    model: ResultWorkspaceModel;
    saveTitle: SaveAction;
    saveArtifact: SaveAction;
  }>,
) {
  const { model } = props;
  const parentController = useVideoPlayer();
  const [controller, setController] = useState<VideoPlayerController>();
  const duration = new Date(model.source.durationSeconds * 1_000)
    .toISOString()
    .slice(model.source.durationSeconds >= 3600 ? 11 : 14, 19);

  return (
    <PlayerProvider
      controller={controller ?? parentController ?? inactiveController}
    >
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
          onPlayerReady={setController}
        />
        <ResultArtifacts {...props} />
      </div>
    </PlayerProvider>
  );
}
