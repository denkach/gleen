'use client';

import { useState, useSyncExternalStore } from 'react';

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
}: Readonly<{ initialModel: ResultWorkspaceModel }>) {
  const storageKey = `gleen:result-fixture:${initialModel.source.intakeId}`;
  const [model, setModel] = useState(initialModel);
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

  if (!hydrated) return null;

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
