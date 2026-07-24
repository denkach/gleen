import { describe, expect, it } from 'vitest';

import { parseAnalysisSnapshot } from './domain';

const snapshotRowFixture = (overrides: Record<string, unknown> = {}) => ({
  job: {
    id: 'job-1',
    analysis_id: 'analysis-1',
    user_id: 'user-1',
    workflow_run_id: null,
    status: 'partial',
    stage: 'artifacts',
    attempt: 1,
    revision: 3,
    error_code: 'ARTIFACT_FAILED',
    started_at: '2026-07-17T10:00:00.000Z',
    completed_at: null,
    created_at: '2026-07-17T09:59:00.000Z',
    updated_at: '2026-07-17T10:01:00.000Z',
    ...overrides,
  },
  events: [],
  artifacts: [
    {
      id: 'artifact-1',
      analysis_id: 'analysis-1',
      user_id: 'user-1',
      kind: 'summary',
      status: 'ready',
      schema_version: 1,
      content: { title: 'Summary' },
      error_code: null,
      generated_at: '2026-07-17T10:01:00.000Z',
      updated_at: '2026-07-17T10:01:00.000Z',
    },
    {
      id: 'artifact-2',
      analysis_id: 'analysis-1',
      user_id: 'user-1',
      kind: 'flashcards',
      status: 'failed',
      schema_version: 1,
      content: null,
      error_code: 'PROVIDER_OUTPUT_INVALID',
      generated_at: null,
      updated_at: '2026-07-17T10:01:00.000Z',
    },
  ],
  usage_reservation: {
    id: 'reservation-1',
    job_id: 'job-1',
    user_id: 'user-1',
    status: 'released',
    updated_at: '2026-07-17T10:01:00.000Z',
  },
});

describe('parseAnalysisSnapshot', () => {
  it('parses a partial snapshot with one ready and one failed artifact', () => {
    const snapshot = parseAnalysisSnapshot(
      snapshotRowFixture({ status: 'partial' }),
    );

    expect(snapshot.job.status).toBe('partial');
    expect(
      snapshot.artifacts.map(({ kind, status }) => [kind, status]),
    ).toEqual([
      ['summary', 'ready'],
      ['flashcards', 'failed'],
    ]);
    expect(snapshot.job.analysisId).toBe('analysis-1');
    expect(snapshot.usageReservation.jobId).toBe('job-1');
  });

  it('rejects content on a failed artifact', () => {
    const fixture = snapshotRowFixture();
    (fixture.artifacts[1] as { content: unknown }).content = { cards: [] };

    expect(() => parseAnalysisSnapshot(fixture)).toThrow();
  });
});
