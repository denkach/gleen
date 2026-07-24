import { describe, expect, it } from 'vitest';

import type {
  AnalysisArtifact,
  AnalysisSnapshot,
} from '@/lib/analysis-pipeline/domain';
import { fixtureSavedIntake } from '@/lib/youtube-intake/development-fixtures';

import type { ResultUserState } from './user-state';
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

const userState: ResultUserState = {
  favorite: true,
  playbackPositionMs: 750,
  lastArtifact: 'flashcards',
  lastStudyAction: 'flashcards_reviewed',
  reviews: [
    { artifactRevision: 'stale-revision', cardIndex: 0, rating: 'again' },
    {
      artifactRevision: '2026-07-18T00:00:00.000Z',
      cardIndex: 0,
      rating: 'got_it',
    },
    {
      artifactRevision: '2026-07-18T00:00:00.000Z',
      cardIndex: -1,
      rating: 'hard',
    },
    {
      artifactRevision: '2026-07-18T00:00:00.000Z',
      cardIndex: 0.5,
      rating: 'again',
    },
  ],
};

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
        outcome: 'Overview',
        sections: [
          {
            title: 'Legacy point',
            summary: 'Legacy point',
            details: 'Legacy point',
            supportingQuote: null,
            sourceOffsetMs: null,
          },
        ],
        keyPoints: [{ text: 'Legacy point', sourceOffsetMs: null }],
      },
    });
  });

  it('normalizes summary v2 into sections without inventing quotes', () => {
    const summary = artifact('summary', 'ready', {
      schemaVersion: 2,
      title: 'Current summary',
      overview: 'A grounded outcome.',
      keyPoints: [{ text: 'A sourced point', sourceOffsetMs: 12_000 }],
    });

    const model = normalizeResultWorkspace(
      {
        ...fixtureSavedIntake,
        transcriptSegments: [
          ...fixtureSavedIntake.transcriptSegments,
          { text: 'A sourced point', offsetMs: 12_000, durationMs: 1_000 },
        ],
      },
      snapshot([summary]),
    );

    expect(model.tabs.summary).toMatchObject({
      status: 'ready',
      data: {
        outcome: 'A grounded outcome.',
        sections: [
          {
            title: 'A sourced point',
            summary: 'A sourced point',
            details: 'A sourced point',
            supportingQuote: null,
            sourceOffsetMs: 12_000,
          },
        ],
      },
    });
  });

  it('normalizes summary v3 and nulls offsets outside the video duration', () => {
    const summary = artifact('summary', 'ready', {
      schemaVersion: 3,
      title: 'Current summary',
      outcome: 'A grounded outcome.',
      sections: [
        {
          title: 'Section',
          summary: 'Summary',
          details: 'Details',
          supportingQuote: '  FIXTURE   TRANSCRIPT SEGMENT ',
          sourceOffsetMs: 212_001,
        },
        {
          title: 'Ungrounded section',
          summary: 'Summary',
          details: 'Details',
          supportingQuote: 'This was not in the transcript',
          sourceOffsetMs: null,
        },
        {
          title: 'Fabricated offset',
          summary: 'Summary',
          details: 'Details',
          supportingQuote: null,
          sourceOffsetMs: 500,
        },
        {
          title: 'Real source start',
          summary: 'Summary',
          details: 'Details',
          supportingQuote: null,
          sourceOffsetMs: 0,
        },
      ],
    });

    const model = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([summary]),
    );

    expect(model.tabs.summary).toMatchObject({
      status: 'ready',
      data: {
        schemaVersion: 3,
        outcome: 'A grounded outcome.',
        sections: [
          {
            supportingQuote: 'FIXTURE   TRANSCRIPT SEGMENT',
            sourceOffsetMs: null,
          },
          { supportingQuote: null, sourceOffsetMs: null },
          { supportingQuote: null, sourceOffsetMs: null },
          { supportingQuote: null, sourceOffsetMs: 0 },
        ],
      },
    });
  });

  it('adds honest transcript defaults for v1 and preserves v2 metadata', () => {
    const currentTranscript = artifact('transcript', 'ready', {
      schemaVersion: 2,
      language: 'en',
      segments: [
        {
          text: 'Is this grounded?',
          offsetMs: 1_000,
          durationMs: 500,
          segmentType: 'question',
          speakerLabel: null,
        },
      ],
    });

    const legacyModel = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([transcript]),
    );
    const currentModel = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([currentTranscript]),
    );

    expect(legacyModel.tabs.transcript).toMatchObject({
      status: 'ready',
      data: {
        segments: [{ segmentType: 'other', speakerLabel: null }],
      },
    });
    expect(currentModel.tabs.transcript).toMatchObject({
      status: 'ready',
      data: {
        segments: [{ segmentType: 'question', speakerLabel: null }],
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
      {
        ...fixtureSavedIntake,
        transcriptSegments: [
          ...fixtureSavedIntake.transcriptSegments,
          { text: 'At the boundary', offsetMs: 212_000, durationMs: 0 },
        ],
      },
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

  it('derives truthful overview, chapter durations, and current revision reviews', () => {
    const flashcards = artifact('flashcards', 'ready', {
      schemaVersion: 1,
      cards: [
        { front: 'One?', back: 'One.' },
        { front: 'Two?', back: 'Two.' },
      ],
    });
    const chapters = artifact('timestamps', 'ready', {
      schemaVersion: 1,
      chapters: [
        { offsetMs: 0, title: 'Start', description: 'Opening' },
        { offsetMs: 1_000, title: 'Next', description: 'Continuation' },
      ],
    });
    const words = artifact('transcript', 'ready', {
      schemaVersion: 1,
      language: 'en',
      segments: [
        { text: 'one two', offsetMs: 0, durationMs: 500 },
        { text: 'three', offsetMs: 500, durationMs: 500 },
      ],
    });

    const model = normalizeResultWorkspace(
      {
        ...fixtureSavedIntake,
        configuration: {
          ...fixtureSavedIntake.configuration,
          artifacts: ['summary', 'flashcards', 'timestamps', 'transcript'],
          flashcardPreset: 18,
        },
      },
      snapshot([legacySummary, flashcards, chapters, words]),
      userState,
    );

    expect(model.overview).toEqual({
      outcome: 'Overview',
      durationSeconds: fixtureSavedIntake.durationSeconds,
      summarySectionCount: 1,
      flashcardCount: 2,
      reviewedFlashcardCount: 1,
      keyMomentCount: 2,
      transcriptWordCount: 3,
      currentTimeSeconds: 0.75,
      currentChapter: {
        id: 'chapter-0',
        title: 'Start',
        startSeconds: 0,
        endSeconds: 1,
      },
      availableExports: ['markdown', 'obsidian', 'notebooklm'],
    });
    expect(model.userState?.reviews).toEqual([
      {
        artifactRevision: '2026-07-18T00:00:00.000Z',
        cardIndex: 0,
        rating: 'got_it',
      },
    ]);
    expect(model.tabs.timestamps).toMatchObject({
      status: 'ready',
      data: {
        chapters: [
          { offsetMs: 0, durationMs: 1_000 },
          { offsetMs: 1_000, durationMs: 211_000 },
        ],
      },
    });
  });

  it('uses null rather than false zero for unavailable overview counts', () => {
    const partialModel = normalizeResultWorkspace(
      {
        ...fixtureSavedIntake,
        configuration: {
          ...fixtureSavedIntake.configuration,
          artifacts: ['summary', 'flashcards', 'timestamps', 'transcript'],
        },
      },
      snapshot([legacySummary]),
    );

    expect(partialModel.overview).toMatchObject({
      summarySectionCount: 1,
      flashcardCount: null,
      reviewedFlashcardCount: null,
      keyMomentCount: null,
      transcriptWordCount: null,
      currentChapter: null,
    });
  });

  it('reports reviewed count as unknown when owner state is unavailable', () => {
    const flashcards = artifact('flashcards', 'ready', {
      schemaVersion: 1,
      cards: [{ front: 'Question?', back: 'Answer.' }],
    });
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
      snapshot([legacySummary, flashcards]),
      null,
    );

    expect(model.overview.flashcardCount).toBe(1);
    expect(model.overview.reviewedFlashcardCount).toBeNull();
    expect(model.userState).toBeNull();
  });

  it('rejects unsorted chapters and excludes chapters beyond video duration', () => {
    const unsorted = artifact('timestamps', 'ready', {
      schemaVersion: 1,
      chapters: [
        { offsetMs: 1_000, title: 'Later', description: 'Later' },
        { offsetMs: 0, title: 'Earlier', description: 'Earlier' },
      ],
    });
    const bounded = artifact('timestamps', 'ready', {
      schemaVersion: 1,
      chapters: [
        { offsetMs: 0, title: 'Start', description: 'Opening' },
        { offsetMs: 211_000, title: 'End', description: 'Closing' },
        { offsetMs: 212_001, title: 'Beyond', description: 'Invalid' },
      ],
    });
    const stateAtEnd: ResultUserState = {
      ...userState,
      playbackPositionMs: 999_000,
      reviews: [],
    };

    const unsortedModel = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([unsorted]),
      stateAtEnd,
    );
    const boundedModel = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([bounded]),
      stateAtEnd,
    );

    expect(unsortedModel.tabs.timestamps).toEqual({
      status: 'unavailable',
      reason: 'malformed',
    });
    expect(unsortedModel.overview.keyMomentCount).toBeNull();
    expect(boundedModel.tabs.timestamps).toMatchObject({
      status: 'ready',
      data: {
        chapters: [
          { title: 'Start', durationMs: 211_000 },
          { title: 'End', durationMs: 1_000 },
        ],
      },
    });
    expect(boundedModel.overview.keyMomentCount).toBe(2);
    expect(boundedModel.overview.currentChapter).toMatchObject({
      title: 'End',
      startSeconds: 211,
      endSeconds: 212,
    });
  });

  it('treats timestamps as malformed when every chapter is beyond duration', () => {
    const beyondDuration = artifact('timestamps', 'ready', {
      schemaVersion: 1,
      chapters: [
        { offsetMs: 212_001, title: 'Beyond', description: 'Invalid' },
        { offsetMs: 213_000, title: 'Later', description: 'Also invalid' },
      ],
    });

    const model = normalizeResultWorkspace(
      fixtureSavedIntake,
      snapshot([beyondDuration]),
    );

    expect(model.tabs.timestamps).toEqual({
      status: 'unavailable',
      reason: 'malformed',
    });
    expect(model.overview.keyMomentCount).toBeNull();
    expect(model.overview.currentChapter).toBeNull();
  });
});
