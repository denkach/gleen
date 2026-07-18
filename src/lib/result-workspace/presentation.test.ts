import { describe, expect, it } from 'vitest';

import type {
  AnalysisArtifact,
  AnalysisSnapshot,
} from '@/lib/analysis-pipeline/domain';
import { fixtureSavedIntake } from '@/lib/youtube-intake/development-fixtures';

import { normalizeResultWorkspace } from './presentation';

const artifact = (
  kind: AnalysisArtifact['kind'],
  status: AnalysisArtifact['status'],
  content: unknown,
  errorCode: string | null = null,
): AnalysisArtifact => ({
  id: `artifact-${kind}`,
  analysisId: fixtureSavedIntake.id,
  userId: fixtureSavedIntake.userId,
  kind,
  status,
  schemaVersion: 1,
  content,
  errorCode,
  generatedAt: status === 'ready' ? '2026-07-18T00:00:00.000Z' : null,
  updatedAt: '2026-07-18T00:00:00.000Z',
});

const snapshot = (
  artifacts: readonly AnalysisArtifact[],
): AnalysisSnapshot => ({
  job: {
    id: 'job-1',
    analysisId: fixtureSavedIntake.id,
    userId: fixtureSavedIntake.userId,
    workflowRunId: null,
    status: 'complete',
    stage: 'complete',
    attempt: 1,
    revision: 1,
    errorCode: null,
    startedAt: '2026-07-18T00:00:00.000Z',
    completedAt: '2026-07-18T00:01:00.000Z',
    createdAt: '2026-07-18T00:00:00.000Z',
    updatedAt: '2026-07-18T00:01:00.000Z',
  },
  events: [],
  artifacts,
  usageReservation: {
    id: 'reservation-1',
    jobId: 'job-1',
    userId: fixtureSavedIntake.userId,
    status: 'settled',
    updatedAt: '2026-07-18T00:01:00.000Z',
  },
});

const legacySummary = artifact('summary', 'ready', {
  schemaVersion: 1,
  title: 'Legacy summary',
  overview: 'Overview',
  keyPoints: ['Legacy point'],
});
const timestamps = artifact('timestamps', 'ready', {
  schemaVersion: 1,
  chapters: [{ offsetMs: 0, title: 'Start', description: 'Opening' }],
});
const transcript = artifact('transcript', 'ready', {
  schemaVersion: 1,
  language: 'en',
  segments: [{ text: 'Opening', offsetMs: 0, durationMs: 1_000 }],
});

describe('normalizeResultWorkspace', () => {
  it('normalizes complete requested artifacts independently', () => {
    const model = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([legacySummary, timestamps, transcript]),
    );

    expect(model.tabs.summary).toMatchObject({ status: 'ready' });
    expect(model.tabs.timestamps).toMatchObject({ status: 'ready' });
    expect(model.tabs.transcript).toMatchObject({ status: 'ready' });
    expect(model.tabs.flashcards).toEqual({
      status: 'unavailable',
      reason: 'not_requested',
    });
    expect(model.revisions).toEqual({
      title: fixtureSavedIntake.updatedAt ?? fixtureSavedIntake.createdAt,
      summary: legacySummary.updatedAt,
      flashcards: undefined,
      timestamps: timestamps.updatedAt,
    });
  });

  it('normalizes legacy key points without inventing source offsets', () => {
    const model = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([legacySummary]),
    );

    expect(model.tabs.summary).toMatchObject({
      status: 'ready',
      data: {
        keyPoints: [{ text: 'Legacy point', sourceOffsetMs: null }],
      },
    });
  });

  it('preserves text but clamps source offsets beyond the video duration', () => {
    const summary = artifact('summary', 'ready', {
      schemaVersion: 2,
      title: 'Current summary',
      overview: 'Overview',
      keyPoints: [
        { text: 'At the end', sourceOffsetMs: 212_001 },
        { text: 'At the boundary', sourceOffsetMs: 212_000 },
      ],
    });

    const model = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([summary]),
    );

    expect(model.tabs.summary).toMatchObject({
      status: 'ready',
      data: {
        keyPoints: [
          { text: 'At the end', sourceOffsetMs: null },
          { text: 'At the boundary', sourceOffsetMs: 212_000 },
        ],
      },
    });
  });

  it('keeps valid tabs ready when another requested artifact failed', () => {
    const intake = {
      ...fixtureSavedIntake,
      configuration: {
        ...fixtureSavedIntake.configuration,
        artifacts: ['summary', 'flashcards'] as const,
        flashcardPreset: 18 as const,
      },
    };
    const model = normalizeResultWorkspace(
      intake,
      snapshot([
        legacySummary,
        artifact('flashcards', 'failed', null, 'generation_failed'),
      ]),
    );

    expect(model.tabs.summary).toMatchObject({ status: 'ready' });
    expect(model.tabs.flashcards).toEqual({
      status: 'unavailable',
      reason: 'failed',
      errorCode: 'generation_failed',
    });
  });

  it('reports a requested artifact missing from the snapshot', () => {
    const model = normalizeResultWorkspace(fixtureSavedIntake, snapshot([]));

    expect(model.tabs.summary).toEqual({
      status: 'unavailable',
      reason: 'missing',
    });
  });

  it('isolates malformed ready artifacts from valid tabs', () => {
    const malformedSummary = artifact('summary', 'ready', {
      schemaVersion: 2,
      title: 'Broken',
      overview: 'Overview',
      keyPoints: [{ text: 'Bad offset', sourceOffsetMs: -1 }],
    });
    const model = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([malformedSummary, timestamps]),
    );

    expect(model.tabs.summary).toEqual({
      status: 'unavailable',
      reason: 'malformed',
    });
    expect(model.tabs.timestamps).toMatchObject({ status: 'ready' });
  });
});
