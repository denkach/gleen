import { describe, expect, it, vi } from 'vitest';

import type { AnalysisSnapshot, ArtifactKind } from './domain';
import { createDeterministicProvider } from './deterministic-provider';
import type { AnalysisRepository } from './repository';
import type { UsageLedger } from './usage-ledger';
import { executeAnalysisPipeline } from './workflow';

function harness(
  options: {
    ready?: readonly ArtifactKind[];
    fail?: readonly string[];
  } = {},
) {
  const ready = new Set(options.ready ?? []);
  const failed = new Set<ArtifactKind>();
  let jobStatus: AnalysisSnapshot['job']['status'] = 'queued';
  const artifacts: ArtifactKind[] = [
    'transcript',
    'summary',
    'flashcards',
    'timestamps',
  ];
  const snapshot = (): AnalysisSnapshot =>
    ({
      job: {
        id: 'job-id',
        analysisId: 'analysis-id',
        userId: 'user-id',
        workflowRunId: null,
        status: jobStatus,
        stage: 'validating',
        attempt: 1,
        revision: 1,
        errorCode: null,
        startedAt: null,
        completedAt: null,
        createdAt: '2026-07-17T00:00:00.000Z',
        updatedAt: '2026-07-17T00:00:00.000Z',
      },
      events: [],
      artifacts: artifacts.map((kind) => ({
        id: `artifact-${kind}`,
        analysisId: 'analysis-id',
        userId: 'user-id',
        kind,
        status: ready.has(kind)
          ? 'ready'
          : failed.has(kind)
            ? 'failed'
            : 'pending',
        schemaVersion: 1,
        content: ready.has(kind) ? { schemaVersion: 1 } : null,
        errorCode: failed.has(kind) ? 'provider_unavailable' : null,
        generatedAt: ready.has(kind) ? '2026-07-17T00:00:00.000Z' : null,
        updatedAt: '2026-07-17T00:00:00.000Z',
      })),
      usageReservation: {
        id: 'reservation-id',
        jobId: 'job-id',
        userId: 'user-id',
        status: 'reserved',
        updatedAt: '2026-07-17T00:00:00.000Z',
      },
    }) as AnalysisSnapshot;
  const repository = {
    findSnapshotByJobId: vi.fn(async () => snapshot()),
    recordEvent: vi.fn(async () => undefined),
    setJobState: vi.fn(async (_id, state) => {
      jobStatus = state.status;
    }),
    saveArtifactReady: vi.fn(async ({ kind }) => {
      ready.add(kind);
      failed.delete(kind);
    }),
    saveArtifactFailed: vi.fn(async ({ kind }) => failed.add(kind)),
  } as unknown as AnalysisRepository;
  const provider = createDeterministicProvider(
    {
      gleen_summary_v1: {
        schemaVersion: 2,
        title: 'Title',
        overview: 'Overview',
        keyPoints: [{ text: 'Point', sourceOffsetMs: 0 }],
      },
      gleen_flashcards_v1: {
        schemaVersion: 1,
        cards: [{ front: 'Q', back: 'A' }],
      },
      gleen_timestamps_v1: {
        schemaVersion: 1,
        chapters: [{ offsetMs: 0, title: 'Start', description: 'Intro' }],
      },
    },
    Object.fromEntries(
      (options.fail ?? []).map((name) => [name, { count: 10 }]),
    ),
  );
  const ledger: UsageLedger = {
    settle: vi.fn(async () => undefined),
    release: vi.fn(async () => undefined),
  };
  return { repository, provider, ledger, snapshot };
}

const context = {
  outputLocale: 'en' as const,
  transcriptLanguage: 'en',
  summaryPreset: 'balanced' as const,
  flashcardPreset: 18 as const,
  durationSeconds: 60,
  transcriptSegments: [{ text: 'Transcript', offsetMs: 0, durationMs: 1_000 }],
};

describe('analysis workflow orchestration', () => {
  it('persists the validated transcript snapshot as a versioned artifact', async () => {
    const { repository, provider, ledger } = harness();

    await executeAnalysisPipeline({
      jobId: 'job-id',
      repository,
      provider,
      ledger,
      context,
    });

    expect(repository.saveArtifactReady).toHaveBeenCalledWith({
      jobId: 'job-id',
      analysisId: 'analysis-id',
      kind: 'transcript',
      schemaVersion: 1,
      content: {
        schemaVersion: 1,
        language: 'en',
        segments: context.transcriptSegments,
      },
    });
  });

  it('persists each generated artifact with its content schema version', async () => {
    const { repository, provider, ledger } = harness();

    await executeAnalysisPipeline({
      jobId: 'job-id',
      repository,
      provider,
      ledger,
      context,
    });

    expect(repository.saveArtifactReady).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'transcript', schemaVersion: 1 }),
    );
    expect(repository.saveArtifactReady).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'summary', schemaVersion: 2 }),
    );
    expect(repository.saveArtifactReady).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'flashcards', schemaVersion: 1 }),
    );
    expect(repository.saveArtifactReady).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'timestamps', schemaVersion: 1 }),
    );
  });

  it('persists stages and settles after all requested artifacts succeed', async () => {
    const { repository, provider, ledger, snapshot } = harness();

    await executeAnalysisPipeline({
      jobId: 'job-id',
      repository,
      provider,
      ledger,
      context,
    });

    expect(repository.recordEvent).toHaveBeenCalledTimes(5);
    expect(snapshot().job.status).toBe('complete');
    expect(ledger.settle).toHaveBeenCalledWith('job-id');
  });

  it('keeps ready artifacts, marks partial, and releases reservation', async () => {
    const { repository, provider, ledger, snapshot } = harness({
      fail: ['gleen_flashcards_v1'],
    });

    await executeAnalysisPipeline({
      jobId: 'job-id',
      repository,
      provider,
      ledger,
      context,
    });

    expect(
      snapshot().artifacts.find(({ kind }) => kind === 'summary')?.status,
    ).toBe('ready');
    expect(snapshot().job.status).toBe('partial');
    expect(ledger.release).toHaveBeenCalledWith('job-id');
  });

  it('skips ready artifacts during a retry attempt', async () => {
    const { repository, provider, ledger } = harness({ ready: ['summary'] });

    await executeAnalysisPipeline({
      jobId: 'job-id',
      repository,
      provider,
      ledger,
      context,
    });

    expect(provider.requests.map(({ name }) => name)).not.toContain(
      'gleen_summary_v1',
    );
  });
});
