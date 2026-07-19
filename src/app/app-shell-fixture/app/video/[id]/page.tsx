import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { AnalysisProcessingFixtureScreen } from '@/components/app-shell/analysis-processing-fixture-screen';
import { IntakeReadiness } from '@/components/app-shell/intake-readiness';
import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';
import { unavailableUsage } from '@/lib/app-shell';
import { isUiPreviewEnabled } from '@/lib/ui-preview';
import { fixtureSavedIntake } from '@/lib/youtube-intake/development-fixtures';
import { normalizeResultWorkspace } from '@/lib/result-workspace/presentation';
import type { ResultUserState } from '@/lib/result-workspace/user-state';
import {
  outputLocaleSchema,
  summaryPresetSchema,
} from '@/lib/onboarding/preferences';

import { FixtureResultWorkspace } from './fixture-result-workspace';

const den25UserStateSeed: ResultUserState = {
  favorite: false,
  playbackPositionMs: 370_000,
  lastArtifact: 'overview',
  lastStudyAction: 'flashcards_reviewed',
  reviews: Array.from({ length: 11 }, (_, cardIndex) => ({
    artifactRevision: '2026-07-18T00:00:30.000Z',
    cardIndex,
    rating: 'got_it' as const,
  })),
};

const den25Chapters = [
  ['Begin with purpose', 'Why purpose gives every later decision context.'],
  ['The outside-in default', 'How feature-first explanations lose meaning.'],
  ['The inside-out alternative', 'A clearer order for communicating ideas.'],
  ['Belief before behavior', 'Why conviction precedes durable action.'],
  ['Trust as an outcome', 'How consistent choices make trust observable.'],
  ['Early adopters', 'Why aligned people accept uncertainty sooner.'],
  ['The adoption curve', 'How ideas move from a few people to many.'],
  ['Crossing the threshold', 'What helps a message reach the early majority.'],
  [
    'Clarity under pressure',
    'How a stable purpose guides difficult tradeoffs.',
  ],
  ['Symbols and signals', 'Why actions communicate values more than slogans.'],
  ['Hiring for alignment', 'How shared motivation strengthens a team.'],
  ['Products as proof', 'How an offering can demonstrate a belief.'],
  ['Consistency over novelty', 'Why repetition makes a message credible.'],
  ['Leaders and authority', 'The difference between influence and a title.'],
  ['Movements need ownership', 'How people act when an idea becomes theirs.'],
  [
    'Translate belief into action',
    'A practical sequence from purpose to habit.',
  ],
  ['Review the signal', 'How to test whether actions match stated intent.'],
  ['Close with the why', 'A concise way to carry the central idea forward.'],
] as const;

const den25Summary = {
  schemaVersion: 2 as const,
  title: 'Lead with purpose, then make it visible',
  overview:
    'Clear purpose gives people a reason to trust, participate, and act consistently.',
  keyPoints: [
    {
      text: 'Start communication with the purpose behind the work.',
      sourceOffsetMs: 75_000,
    },
    {
      text: 'Trust grows when decisions repeatedly reflect the same belief.',
      sourceOffsetMs: 250_000,
    },
    {
      text: 'Early adopters respond to meaning before broad social proof exists.',
      sourceOffsetMs: 370_000,
    },
    {
      text: 'Leadership creates willing participation rather than mere compliance.',
      sourceOffsetMs: 620_000,
    },
    {
      text: 'Turn purpose into practical habits that others can recognize and repeat.',
      sourceOffsetMs: 900_000,
    },
  ],
};

const den25SourceTranscriptSegments = [
  {
    text: 'Purpose gives the rest of the talk a clear frame.',
    offsetMs: 0,
    durationMs: 8_000,
  },
  ...den25Summary.keyPoints.map((point) => ({
    text: point.text,
    offsetMs: point.sourceOffsetMs,
    durationMs: 8_000,
  })),
];

const den25Timestamps = {
  schemaVersion: 1 as const,
  chapters: den25Chapters.map(([title, description], index) => ({
    offsetMs: index * 60_000,
    title,
    description,
  })),
};

const den25Flashcards = {
  schemaVersion: 1 as const,
  cards: Array.from({ length: 28 }, (_, index) => {
    const chapter = den25Timestamps.chapters[index % den25Chapters.length];
    return {
      front: `Card ${index + 1}: What is the practical lesson from “${chapter.title}”?`,
      back: chapter.description,
    };
  }),
};

const den25Transcript = {
  schemaVersion: 1 as const,
  language: 'en',
  segments: Array.from({ length: 36 }, (_, index) => {
    const chapter = den25Timestamps.chapters[Math.floor(index / 2)];
    const supporting = index % 2 === 1;
    return {
      text: supporting
        ? `A practical example makes ${chapter.title.toLowerCase()} visible in everyday decisions.`
        : chapter.description,
      offsetMs: chapter.offsetMs + (supporting ? 24_000 : 0),
      durationMs: 8_000,
    };
  }),
};

const allowedIds = new Set([
  fixtureSavedIntake.id,
  '33333333-3333-4333-8333-333333333333',
  '44444444-4444-4444-8444-444444444444',
  'pipeline-queued',
  'pipeline-validating',
  'pipeline-transcript',
  'pipeline-structuring',
  'pipeline-artifacts',
  'pipeline-live-partial',
  'pipeline-partial',
  'pipeline-failed',
  'pipeline-retrying',
  'pipeline-complete',
  'result-complete',
  'result-legacy',
  'result-partial',
  'result-corrupted',
  'result-empty',
  'result-den-25',
  'result-den-25-partial',
  'result-den-25-public',
]);

const resultIds = new Set([
  'result-complete',
  'result-legacy',
  'result-partial',
  'result-corrupted',
  'result-empty',
  'result-den-25',
  'result-den-25-partial',
  'result-den-25-public',
]);

const resultAnalysisIds: Record<string, string> = {
  'result-complete': '60000000-0000-4000-8000-000000000001',
  'result-legacy': '60000000-0000-4000-8000-000000000002',
  'result-partial': '60000000-0000-4000-8000-000000000003',
  'result-corrupted': '60000000-0000-4000-8000-000000000004',
  'result-empty': '60000000-0000-4000-8000-000000000005',
  'result-den-25': '60000000-0000-4000-8000-000000000006',
  'result-den-25-partial': '60000000-0000-4000-8000-000000000007',
  'result-den-25-public': '60000000-0000-4000-8000-000000000008',
};

const pipelineStages = {
  'pipeline-queued': ['queued', 'validating'],
  'pipeline-validating': ['running', 'validating'],
  'pipeline-transcript': ['running', 'transcript'],
  'pipeline-structuring': ['running', 'structuring'],
  'pipeline-artifacts': ['running', 'artifacts'],
  'pipeline-live-partial': ['running', 'artifacts'],
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

function den25ResultSnapshot(analysisId: string): AnalysisSnapshot {
  const partial = analysisId === 'result-den-25-partial';
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
  const pending = (kind: 'flashcards' | 'transcript') => ({
    id: `fixture-${kind}`,
    analysisId,
    userId: 'fixture-user',
    kind,
    status: 'pending' as const,
    schemaVersion: 1,
    content: null,
    errorCode: null,
    generatedAt: null,
    updatedAt: '2026-07-18T00:00:30.000Z',
  });
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
    artifacts: [
      ready('summary', den25Summary),
      ...(partial
        ? [
            pending('flashcards'),
            ready('timestamps', den25Timestamps),
            pending('transcript'),
          ]
        : [
            ready('flashcards', den25Flashcards),
            ready('timestamps', den25Timestamps),
            ready('transcript', den25Transcript),
          ]),
    ],
    usageReservation: {
      id: 'result-reservation',
      jobId: `job-${analysisId}`,
      userId: 'fixture-user',
      status: partial ? 'released' : 'settled',
      updatedAt: '2026-07-18T00:01:00.000Z',
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
  const den25Fixture = id.startsWith('result-den-25');
  const intake = {
    ...fixtureSavedIntake,
    id: resultAnalysisIds[id] ?? id,
    ...(den25Fixture
      ? {
          youtubeVideoId: 'den25fixture',
          title: 'How purpose becomes consistent action',
          channelTitle: 'Gleen Local Fixture',
          durationSeconds: 1_043,
          thumbnailUrl: '/app-icons.svg',
          transcriptSegments: den25SourceTranscriptSegments,
        }
      : {}),
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
  const result = resultIds.has(id)
    ? den25Fixture
      ? den25ResultSnapshot(id)
      : resultSnapshot(id)
    : null;
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
        <FixtureResultWorkspace
          initialModel={normalizeResultWorkspace(
            intake,
            result,
            id === 'result-den-25-public' ? null : den25UserStateSeed,
          )}
          fixturePlayerStartMs={
            den25Fixture
              ? id === 'result-den-25-public'
                ? 0
                : den25UserStateSeed.playbackPositionMs
              : undefined
          }
        />
      ) : snapshot ? (
        <AnalysisProcessingFixtureScreen
          intake={intake}
          initialSnapshot={snapshot}
          retrySnapshot={retrySnapshot}
          transitionSnapshot={
            pipelineFixture === 'pipeline-live-partial'
              ? {
                  ...pipelineSnapshot(id, 'pipeline-partial'),
                  job: {
                    ...pipelineSnapshot(id, 'pipeline-partial').job,
                    revision: 8,
                    updatedAt: '2026-07-17T00:02:00.000Z',
                  },
                }
              : undefined
          }
        />
      ) : (
        <IntakeReadiness intake={intake} />
      )}
    </AppShell>
  );
}
