import { z } from 'zod';

import {
  flashcardsArtifactSchema,
  summaryArtifactSchema,
  timestampsArtifactSchema,
  type FlashcardsArtifact,
  type TimestampsArtifact,
} from '@/lib/analysis-pipeline/artifact-schemas';
import type {
  AnalysisArtifact,
  AnalysisSnapshot,
  ArtifactKind,
} from '@/lib/analysis-pipeline/domain';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';

export type NormalizedSummaryKeyPoint = Readonly<{
  text: string;
  sourceOffsetMs: number | null;
}>;

export type SummaryPresentation = Readonly<{
  schemaVersion: 1 | 2;
  title: string;
  overview: string;
  keyPoints: readonly NormalizedSummaryKeyPoint[];
}>;

const transcriptArtifactSchema = z
  .object({
    schemaVersion: z.literal(1),
    language: z.string().trim().min(1),
    segments: z.array(
      z
        .object({
          text: z.string().trim().min(1),
          offsetMs: z.number().int().nonnegative(),
          durationMs: z.number().int().nonnegative(),
        })
        .strict(),
    ),
  })
  .strict();

export type TranscriptPresentation = Readonly<
  z.infer<typeof transcriptArtifactSchema>
>;

export type ReadyTab<T> = Readonly<{ status: 'ready'; data: T }>;
export type UnavailableTab =
  | Readonly<{ status: 'unavailable'; reason: 'not_requested' }>
  | Readonly<{ status: 'unavailable'; reason: 'missing' }>
  | Readonly<{ status: 'unavailable'; reason: 'pending' }>
  | Readonly<{ status: 'unavailable'; reason: 'malformed' }>
  | Readonly<{
      status: 'unavailable';
      reason: 'failed';
      errorCode: string;
    }>;
export type ResultTab<T> = ReadyTab<T> | UnavailableTab;

export type ResultWorkspaceModel = Readonly<{
  source: Readonly<{
    intakeId: string;
    youtubeVideoId: string;
    title: string;
    channelTitle: string;
    durationSeconds: number;
    thumbnailUrl: string;
  }>;
  revision: number;
  revisions: Readonly<{
    title: string;
    summary?: string;
    flashcards?: string;
    timestamps?: string;
  }>;
  tabs: Readonly<{
    summary: ResultTab<SummaryPresentation>;
    flashcards: ResultTab<FlashcardsArtifact>;
    timestamps: ResultTab<TimestampsArtifact>;
    transcript: ResultTab<TranscriptPresentation>;
  }>;
}>;

function unavailableArtifact(
  requested: boolean,
  artifact: AnalysisArtifact | undefined,
): UnavailableTab | null {
  if (!requested) return { status: 'unavailable', reason: 'not_requested' };
  if (!artifact) return { status: 'unavailable', reason: 'missing' };
  if (artifact.status === 'pending')
    return { status: 'unavailable', reason: 'pending' };
  if (artifact.status === 'failed')
    return {
      status: 'unavailable',
      reason: 'failed',
      errorCode: artifact.errorCode ?? 'artifact_failed',
    };
  return null;
}

function normalizeArtifact<T>(
  requested: boolean,
  artifact: AnalysisArtifact | undefined,
  parse: (content: unknown) => T,
): ResultTab<T> {
  const unavailable = unavailableArtifact(requested, artifact);
  if (unavailable) return unavailable;

  try {
    return { status: 'ready', data: parse(artifact?.content) };
  } catch {
    return { status: 'unavailable', reason: 'malformed' };
  }
}

function normalizeSummary(
  content: unknown,
  durationMs: number,
): SummaryPresentation {
  const summary = summaryArtifactSchema.parse(content);
  return {
    ...summary,
    keyPoints: summary.keyPoints.map((keyPoint) => {
      if (typeof keyPoint === 'string')
        return { text: keyPoint, sourceOffsetMs: null };
      const sourceOffsetMs = keyPoint.sourceOffsetMs;
      return {
        text: keyPoint.text,
        sourceOffsetMs:
          sourceOffsetMs === undefined || sourceOffsetMs > durationMs
            ? null
            : sourceOffsetMs,
      };
    }),
  };
}

export function normalizeResultWorkspace(
  intake: AnalysisIntake,
  snapshot: AnalysisSnapshot,
): ResultWorkspaceModel {
  const artifacts = new Map<ArtifactKind, AnalysisArtifact>(
    snapshot.artifacts.map((artifact) => [artifact.kind, artifact]),
  );
  const requested = new Set(intake.configuration.artifacts);
  const durationMs = intake.durationSeconds * 1_000;
  const summaryArtifact = artifacts.get('summary');
  const flashcardsArtifact = artifacts.get('flashcards');
  const timestampsArtifact = artifacts.get('timestamps');

  return {
    source: {
      intakeId: intake.id,
      youtubeVideoId: intake.youtubeVideoId,
      title: intake.title,
      channelTitle: intake.channelTitle,
      durationSeconds: intake.durationSeconds,
      thumbnailUrl: intake.thumbnailUrl,
    },
    revision: snapshot.job.revision,
    revisions: {
      title: intake.updatedAt ?? intake.createdAt,
      summary: summaryArtifact?.updatedAt,
      flashcards: flashcardsArtifact?.updatedAt,
      timestamps: timestampsArtifact?.updatedAt,
    },
    tabs: {
      summary: normalizeArtifact(
        requested.has('summary'),
        summaryArtifact,
        (content) => normalizeSummary(content, durationMs),
      ),
      flashcards: normalizeArtifact(
        requested.has('flashcards'),
        flashcardsArtifact,
        (content) => flashcardsArtifactSchema.parse(content),
      ),
      timestamps: normalizeArtifact(
        requested.has('timestamps'),
        timestampsArtifact,
        (content) => timestampsArtifactSchema.parse(content),
      ),
      transcript: normalizeArtifact(
        requested.has('transcript'),
        artifacts.get('transcript'),
        (content) => transcriptArtifactSchema.parse(content),
      ),
    },
  };
}
