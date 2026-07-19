import 'server-only';

import { randomBytes } from 'node:crypto';

import { z } from 'zod';

import {
  flashcardsArtifactSchema,
  summaryArtifactSchema,
  timestampsArtifactSchema,
  transcriptArtifactSchema,
} from '@/lib/analysis-pipeline/artifact-schemas';

import type {
  ResultTab,
  ResultWorkspaceModel,
  SummaryPresentation,
  TimestampsPresentation,
  TranscriptPresentation,
} from './presentation';

export const resultShareTokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export type PublicResultProjection = ResultWorkspaceModel &
  Readonly<{ userState: null }>;

export function createResultShareToken(): string {
  return resultShareTokenSchema.parse(randomBytes(32).toString('base64url'));
}

const publicSourceRowSchema = z
  .object({
    youtube_video_id: z.string().regex(/^[A-Za-z0-9_-]{11}$/),
    title: z.string().trim().min(1),
    channel_title: z.string().trim().min(1),
    duration_seconds: z.number().int().positive(),
    thumbnail_url: z.url().startsWith('https://'),
    transcript_language: z.string().trim().min(1),
  })
  .strict();

const publicArtifactRowSchema = z
  .object({
    kind: z.enum(['summary', 'flashcards', 'timestamps', 'transcript']),
    content: z.unknown(),
    updated_at: z.iso.datetime({ offset: true }),
  })
  .strict();

export type PublicSourceRow = z.infer<typeof publicSourceRowSchema>;
export type PublicArtifactRow = z.infer<typeof publicArtifactRowSchema>;

function normalizePublicSummary(content: unknown): SummaryPresentation {
  const summary = summaryArtifactSchema.parse(content);
  if (summary.schemaVersion === 3) {
    return {
      ...summary,
      overview: summary.outcome,
      keyPoints: summary.sections.map((section) => ({
        text: section.summary,
        sourceOffsetMs: section.sourceOffsetMs,
      })),
    };
  }
  const keyPoints = summary.keyPoints.map((point) =>
    typeof point === 'string'
      ? { text: point, sourceOffsetMs: null }
      : { text: point.text, sourceOffsetMs: point.sourceOffsetMs },
  );
  return {
    ...summary,
    outcome: summary.overview,
    sections: keyPoints.map((point) => ({
      title: point.text,
      summary: point.text,
      details: point.text,
      supportingQuote: null,
      sourceOffsetMs: point.sourceOffsetMs,
    })),
    keyPoints,
  };
}

function normalizePublicTimestamps(
  content: unknown,
  durationSeconds: number,
): TimestampsPresentation {
  const timestamps = timestampsArtifactSchema.parse(content);
  const durationMs = durationSeconds * 1_000;
  const chapters = timestamps.chapters.filter(
    (chapter) => chapter.offsetMs <= durationMs,
  );
  if (chapters.length === 0) throw new Error('No public timestamp chapters');
  return {
    ...timestamps,
    chapters: chapters.map((chapter, index) => ({
      ...chapter,
      durationMs: Math.max(
        0,
        (chapters[index + 1]?.offsetMs ?? durationMs) - chapter.offsetMs,
      ),
    })),
  };
}

function normalizePublicTranscript(content: unknown): TranscriptPresentation {
  const transcript = transcriptArtifactSchema.parse(content);
  return {
    ...transcript,
    segments: transcript.segments.map((segment) => ({
      ...segment,
      segmentType:
        'segmentType' in segment ? segment.segmentType : ('other' as const),
      speakerLabel: 'speakerLabel' in segment ? segment.speakerLabel : null,
    })),
  };
}

function unavailable<T>(): ResultTab<T> {
  return { status: 'unavailable', reason: 'missing' };
}

export function projectPublicResult(
  sourceInput: unknown,
  artifactsInput: unknown,
): PublicResultProjection | null {
  const source = publicSourceRowSchema.safeParse(sourceInput);
  const artifacts = z.array(publicArtifactRowSchema).safeParse(artifactsInput);
  if (!source.success || !artifacts.success) return null;

  try {
    const rows = new Map(artifacts.data.map((row) => [row.kind, row]));
    const summaryRow = rows.get('summary');
    const flashcardsRow = rows.get('flashcards');
    const timestampsRow = rows.get('timestamps');
    const transcriptRow = rows.get('transcript');
    const summary = summaryRow
      ? ({
          status: 'ready',
          data: normalizePublicSummary(summaryRow.content),
        } as const)
      : unavailable<SummaryPresentation>();
    const flashcards = flashcardsRow
      ? ({
          status: 'ready',
          data: flashcardsArtifactSchema.parse(flashcardsRow.content),
        } as const)
      : unavailable<ReturnType<typeof flashcardsArtifactSchema.parse>>();
    const timestamps = timestampsRow
      ? ({
          status: 'ready',
          data: normalizePublicTimestamps(
            timestampsRow.content,
            source.data.duration_seconds,
          ),
        } as const)
      : unavailable<TimestampsPresentation>();
    const transcript = transcriptRow
      ? ({
          status: 'ready',
          data: normalizePublicTranscript(transcriptRow.content),
        } as const)
      : unavailable<TranscriptPresentation>();
    const transcriptWordCount =
      transcript.status === 'ready'
        ? transcript.data.segments.reduce(
            (count, segment) =>
              count +
              (segment.text.trim()
                ? segment.text.trim().split(/\s+/u).length
                : 0),
            0,
          )
        : null;
    const firstChapter =
      timestamps.status === 'ready' ? timestamps.data.chapters[0] : undefined;
    const availableExports = [summary, flashcards, timestamps, transcript].some(
      (tab) => tab.status === 'ready',
    )
      ? ['markdown', 'obsidian', 'notebooklm']
      : [];

    return {
      source: {
        intakeId: 'public-result',
        youtubeVideoId: source.data.youtube_video_id,
        title: source.data.title,
        channelTitle: source.data.channel_title,
        durationSeconds: source.data.duration_seconds,
        thumbnailUrl: source.data.thumbnail_url,
      },
      revision: 1,
      revisions: {
        title: '1970-01-01T00:00:00.000Z',
        summary: summaryRow?.updated_at,
        flashcards: flashcardsRow?.updated_at,
        timestamps: timestampsRow?.updated_at,
      },
      overview: {
        outcome:
          summary.status === 'ready' ? summary.data.outcome : source.data.title,
        durationSeconds: source.data.duration_seconds,
        summarySectionCount:
          summary.status === 'ready' ? summary.data.sections.length : null,
        flashcardCount:
          flashcards.status === 'ready' ? flashcards.data.cards.length : null,
        reviewedFlashcardCount: null,
        keyMomentCount:
          timestamps.status === 'ready'
            ? timestamps.data.chapters.length
            : null,
        transcriptWordCount,
        currentTimeSeconds: 0,
        currentChapter: firstChapter
          ? {
              id: 'chapter-0',
              title: firstChapter.title,
              startSeconds: firstChapter.offsetMs / 1_000,
              endSeconds:
                (firstChapter.offsetMs + (firstChapter.durationMs ?? 0)) /
                1_000,
            }
          : null,
        availableExports,
      },
      userState: null,
      tabs: { summary, flashcards, timestamps, transcript },
    };
  } catch {
    return null;
  }
}
