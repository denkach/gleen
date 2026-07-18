'use client';

import { useState } from 'react';
import type { ResultSaveState } from '@/lib/result-workspace/actions';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ArtifactState } from './artifact-state';
import { FlashcardsTab } from './flashcards-tab';
import { OverviewTab } from './overview-tab';
import { SummaryTab } from './summary-tab';
import { TimestampsTab } from './timestamps-tab';
import { TranscriptTab } from './transcript-tab';

type SaveAction = (input: unknown) => Promise<ResultSaveState>;
type TabValue =
  | 'overview'
  | 'summary'
  | 'flashcards'
  | 'timestamps'
  | 'transcript'
  | 'export';

export function ResultWorkspace({
  model,
}: Readonly<{
  model: ResultWorkspaceModel;
  saveTitle: SaveAction;
  saveArtifact: SaveAction;
}>) {
  const [tab, setTab] = useState<TabValue>('overview');
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
    <section
      className="min-w-0 overflow-hidden rounded-[20px] border border-[var(--border-default)] bg-[var(--background-elevated)]"
      aria-label="Analysis artifacts"
    >
      <Tabs value={tab} onValueChange={(value) => setTab(value as TabValue)}>
        <TabsList
          aria-label="Result artifacts"
          className="sticky top-0 z-10 w-full overflow-x-auto bg-[var(--background-elevated)] px-3 max-[720px]:px-1"
        >
          {triggers.map((trigger) => (
            <TabsTrigger
              key={trigger.value}
              value={trigger.value}
              aria-disabled={trigger.unavailable || undefined}
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
          <TabsContent value="summary">
            {model.tabs.summary.status === 'ready' ? (
              <SummaryTab summary={model.tabs.summary.data} />
            ) : (
              <ArtifactState state={model.tabs.summary} />
            )}
          </TabsContent>
          <TabsContent value="flashcards">
            {model.tabs.flashcards.status === 'ready' ? (
              <FlashcardsTab artifact={model.tabs.flashcards.data} />
            ) : (
              <ArtifactState state={model.tabs.flashcards} />
            )}
          </TabsContent>
          <TabsContent value="timestamps">
            {model.tabs.timestamps.status === 'ready' ? (
              <TimestampsTab artifact={model.tabs.timestamps.data} />
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
            <section className="rounded-2xl border border-[color-mix(in_srgb,var(--artifact-export)_22%,transparent)] p-6">
              <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-[0.14em] text-[var(--artifact-export)]">
                Export
              </p>
              <h2 className="mt-2 font-[var(--font-display)] text-xl text-[var(--text-primary)]">
                Prepare reusable artifacts
              </h2>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                Export actions are prepared in the next focused workspace task.
              </p>
            </section>
          </TabsContent>
        </div>
      </Tabs>
    </section>
  );
}
