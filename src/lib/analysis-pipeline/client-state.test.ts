import { describe, expect, test } from 'vitest';

import type { AnalysisSnapshot } from './domain';
import {
  chooseNewestSnapshot,
  isTerminalAnalysis,
  toAnalysisVisualState,
} from './client-state';

function snapshot(
  status: AnalysisSnapshot['job']['status'],
  stage: AnalysisSnapshot['job']['stage'],
  revision = 1,
): AnalysisSnapshot {
  return {
    job: {
      id: 'job-1',
      analysisId: 'analysis-1',
      userId: 'user-1',
      workflowRunId: null,
      status,
      stage,
      attempt: 1,
      revision,
      errorCode: null,
      startedAt: null,
      completedAt: null,
      createdAt: '2026-07-17T00:00:00Z',
      updatedAt: '2026-07-17T00:00:00Z',
    },
    events: [],
    artifacts: [],
    usageReservation: {
      id: 'reservation-1',
      jobId: 'job-1',
      userId: 'user-1',
      status: 'reserved',
      updatedAt: '2026-07-17T00:00:00Z',
    },
  };
}

describe('analysis client state', () => {
  test.each([
    ['queued', 'validating', 'validating'],
    ['running', 'transcript', 'transcript'],
    ['running', 'structuring', 'structuring'],
    ['running', 'artifacts', 'artifacts'],
    ['complete', 'complete', 'complete'],
    ['failed', 'artifacts', 'error'],
    ['partial', 'artifacts', 'error'],
  ] as const)('maps %s/%s to %s', (status, stage, expected) => {
    expect(toAnalysisVisualState(snapshot(status, stage))).toBe(expected);
  });

  test('rejects snapshots that would regress the persisted revision', () => {
    const current = snapshot('running', 'artifacts', 4);
    expect(
      chooseNewestSnapshot(current, snapshot('running', 'transcript', 3)),
    ).toBe(current);
    expect(
      chooseNewestSnapshot(current, snapshot('complete', 'complete', 5)).job
        .status,
    ).toBe('complete');
  });

  test('recognizes every terminal job status', () => {
    expect(isTerminalAnalysis(snapshot('partial', 'artifacts'))).toBe(true);
    expect(isTerminalAnalysis(snapshot('running', 'artifacts'))).toBe(false);
  });
});
