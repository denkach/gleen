import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { AnalysisProcessingFixtureScreen } from '@/components/app-shell/analysis-processing-fixture-screen';
import { IntakeReadiness } from '@/components/app-shell/intake-readiness';
import { ResultWorkspace } from '@/components/result-workspace/result-workspace';
import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import { unavailableUsage } from '@/lib/app-shell';
import { isUiPreviewEnabled } from '@/lib/ui-preview';
import { fixtureSavedIntake } from '@/lib/youtube-intake/development-fixtures';
import { normalizeResultWorkspace } from '@/lib/result-workspace/presentation';
import {
  outputLocaleSchema,
  summaryPresetSchema,
} from '@/lib/onboarding/preferences';

const allowedIds = new Set([
  fixtureSavedIntake.id,
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  'pipeline-queued',
  'pipeline-validating',
  'pipeline-transcript',
  'pipeline-structuring',
  'pipeline-artifacts',
  'pipeline-partial',
  'pipeline-failed',
  'pipeline-retrying',
  'pipeline-complete',
  'result-complete',
  'result-legacy',
  'result-partial',
  'result-corrupted',
  'result-empty',
]);

const resultIds = new Set([
  'result-complete',
  'result-legacy',
  'result-partial',
  'result-corrupted',
  'result-empty',
]);

const pipelineStages = {
  'pipeline-queued': ['queued', 'validating'],
  'pipeline-validating': ['running', 'validating'],
  'pipeline-transcript': ['running', 'transcript'],
  'pipeline-structuring': ['running', 'structuring'],
  'pipeline-artifacts': ['running', 'artifacts'],
  'pipeline-partial': ['partial', 'artifacts'],
  'pipeline-failed': ['failed', 'artifacts'],
  'pipeline-retrying': ['running', 'artifacts'],
  'pipeline-complete': ['complete', 'complete'],
} as const;

function pipelineSnapshot(
  analysisId: string,
  fixtureId: keyof typeof pipelineStages,
): AnalysisSnapshot {
  const [status, stage] = pipelineStages[fixtureId];
  const isPartial = fixtureId === 'pipeline-partial';
  return {
    job: {
      id: `job-${fixtureId}`,
      analysisId,
      userId: 'fixture-user',
      workflowRunId: 'fixture-run',
      status,
      stage,
      attempt: fixtureId === 'pipeline-retrying' ? 2 : 1,
      revision: fixtureId === 'pipeline-retrying' ? 8 : 7,
      errorCode: status === 'failed' ? 'safe_fixture_failure' : null,
      startedAt: '2026-07-17T00:00:00.000Z',
      completedAt: ['partial', 'failed', 'complete'].includes(status)
        ? '2026-07-17T00:01:00.000Z'
        : null,
      createdAt: '2026-07-17T00:00:00.000Z',
      updatedAt: '2026-07-17T00:01:00.000Z',
    },
    events: [],
    artifacts: isPartial
      ? [
          {
            id: 'fixture-summary',
            analysisId,
            userId: 'fixture-user',
            kind: 'summary',
            status: 'ready',
            schemaVersion: 1,
            content: { schemaVersion: 1, sections: [] },
            errorCode: null,
            generatedAt: '2026-07-17T00:00:30.000Z',
            updatedAt: '2026-07-17T00:00:30.000Z',
          },
          {
            id: 'fixture-flashcards',
            analysisId,
            userId: 'fixture-user',
            kind: 'flashcards',
            status: 'failed',
            schemaVersion: 1,
            content: null,
            errorCode: 'generation_failed',
            generatedAt: null,
            updatedAt: '2026-07-17T00:00:40.000Z',
          },
        ]
      : [],
    usageReservation: {
      id: 'fixture-reservation',
      jobId: `job-${fixtureId}`,
      userId: 'fixture-user',
      status:
        status === 'complete'
          ? 'settled'
          : ['partial', 'failed'].includes(status)
            ? 'released'
            : 'reserved',
      updatedAt: '2026-07-17T00:01:00.000Z',
    },
  };
}

function resultSnapshot(analysisId: string): AnalysisSnapshot {
  const complete = analysisId === 'result-complete';
  const legacy = analysisId === 'result-legacy';
  const partial = analysisId === 'result-partial';
  const corrupted = analysisId === 'result-corrupted';
  const empty = analysisId === 'result-empty';
  const ready = (
    kind: 'summary' | 'flashcards' | 'timestamps' | 'transcript',
    content: unknown,
  ) => ({
    id: `fixture-${kind}`,
    analysisId,
    userId: 'fixture-user',
    kind,
    status: 'ready' as const,
    schemaVersion: 1,
    content,
    errorCode: null,
    generatedAt: '2026-07-18T00:00:30.000Z',
    updatedAt: '2026-07-18T00:00:30.000Z',
  });
  const artifacts = empty
    ? []
    : [
        ready(
          'summary',
          corrupted
            ? {
                schemaVersion: 2,
                title: 'Broken',
                overview: 'Isolated',
                keyPoints: [{ text: 'Invalid', sourceOffsetMs: -1 }],
              }
            : legacy
              ? {
                  schemaVersion: 1,
                  title: 'Legacy knowledge',
                  overview: 'Readable without fabricated links.',
                  keyPoints: ['Legacy point'],
                }
              : {
                  schemaVersion: 2,
                  title: 'Reusable knowledge',
                  overview: 'A video becomes grounded artifacts.',
                  keyPoints: [
                    {
                      text: 'Jump to the central idea',
                      sourceOffsetMs: 63_000,
                    },
                  ],
                },
        ),
        ...(partial
          ? [
              {
                id: 'fixture-flashcards',
                analysisId,
                userId: 'fixture-user',
                kind: 'flashcards' as const,
                status: 'failed' as const,
                schemaVersion: 1,
                content: null,
                errorCode: 'generation_failed',
                generatedAt: null,
                updatedAt: '2026-07-18T00:00:30.000Z',
              },
            ]
          : complete
            ? [
                ready('flashcards', {
                  schemaVersion: 1,
                  cards: [
                    {
                      front: 'What does Gleen create?',
                      back: 'Reusable knowledge artifacts.',
                    },
                    {
                      front: 'Why source links?',
                      back: 'To verify important claims.',
                    },
                  ],
                }),
                ready('timestamps', {
                  schemaVersion: 1,
                  chapters: [
                    {
                      offsetMs: 0,
                      title: 'Opening',
                      description: 'The premise',
                    },
                    {
                      offsetMs: 63_000,
                      title: 'Central idea',
                      description: 'Grounded learning',
                    },
                  ],
                }),
                ready('transcript', {
                  schemaVersion: 1,
                  language: 'en',
                  segments: [
                    {
                      text: 'A video becomes reusable knowledge.',
                      offsetMs: 0,
                      durationMs: 3000,
                    },
                    {
                      text: 'Important claims remain grounded.',
                      offsetMs: 63_000,
                      durationMs: 3000,
                    },
                  ],
                }),
              ]
            : []),
      ];
  return {
    job: {
      id: `job-${analysisId}`,
      analysisId,
      userId: 'fixture-user',
      workflowRunId: null,
      status: partial ? 'partial' : 'complete',
      stage: partial ? 'artifacts' : 'complete',
      attempt: 1,
      revision: 9,
      errorCode: null,
      startedAt: '2026-07-18T00:00:00.000Z',
      completedAt: '2026-07-18T00:01:00.000Z',
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T00:01:00.000Z',
    },
    events: [],
    artifacts,
    usageReservation: {
      id: 'result-reservation',
      jobId: `job-${analysisId}`,
      userId: 'fixture-user',
      status: partial ? 'released' : 'settled',
      updatedAt: '2026-07-18T00:01:00.000Z',
    },
  };
}

export default async function FixtureReadinessPage({
  params,
  searchParams,
}: Readonly<{
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    flashcardPreset?: string;
    outputLocale?: string;
    summaryPreset?: string;
  }>;
}>) {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  )
    notFound();
  const { id } = await params;
  const { flashcardPreset, outputLocale, summaryPreset } = await searchParams;
  if (!allowedIds.has(id)) notFound();
  const intake = {
    ...fixtureSavedIntake,
    id,
    configuration: {
      ...fixtureSavedIntake.configuration,
      outputLocale:
        outputLocaleSchema.safeParse(outputLocale).data ??
        fixtureSavedIntake.configuration.outputLocale,
      summaryPreset:
        summaryPresetSchema.safeParse(summaryPreset).data ??
        fixtureSavedIntake.configuration.summaryPreset,
      artifacts: resultIds.has(id)
        ? (['summary', 'flashcards', 'timestamps', 'transcript'] as const)
        : flashcardPreset === '18' || flashcardPreset === '30'
          ? [
              ...fixtureSavedIntake.configuration.artifacts,
              'flashcards' as const,
            ]
          : fixtureSavedIntake.configuration.artifacts,
      flashcardPreset:
        flashcardPreset === '18' || flashcardPreset === '30'
          ? (Number(flashcardPreset) as 18 | 30)
          : fixtureSavedIntake.configuration.flashcardPreset,
    },
    attempt: id.startsWith('4444') ? 2 : 1,
    reanalysisOf: id.startsWith('4444') ? fixtureSavedIntake.id : null,
  };
  const pipelineFixture =
    id in pipelineStages ? (id as keyof typeof pipelineStages) : null;
  const snapshot = pipelineFixture
    ? pipelineSnapshot(id, pipelineFixture)
    : null;
  const result = resultIds.has(id) ? resultSnapshot(id) : null;
  const retrySnapshot =
    pipelineFixture === 'pipeline-partial' && snapshot
      ? {
          ...pipelineSnapshot(id, 'pipeline-retrying'),
          artifacts: snapshot.artifacts.map((artifact) =>
            artifact.status === 'ready'
              ? artifact
              : {
                  ...artifact,
                  status: 'pending' as const,
                  errorCode: null,
                },
          ),
        }
      : undefined;
  return (
    <AppShell
      identity={{
        displayName: 'Test User',
        email: 'test@example.com',
        initials: 'TU',
      }}
      usage={unavailableUsage}
      pathnameOverride="/app"
    >
      {result ? (
        <ResultWorkspace
          model={normalizeResultWorkspace(intake, result)}
          saveTitle={async () => {
            'use server';
            return { status: 'saved', updatedAt: new Date().toISOString() };
          }}
          saveArtifact={async () => {
            'use server';
            return { status: 'saved', updatedAt: new Date().toISOString() };
          }}
        />
      ) : snapshot ? (
        <AnalysisProcessingFixtureScreen
          intake={intake}
          initialSnapshot={snapshot}
          retrySnapshot={retrySnapshot}
        />
      ) : (
        <IntakeReadiness intake={intake} />
      )}
    </AppShell>
  );
}
