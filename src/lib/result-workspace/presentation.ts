import {
  flashcardsArtifactSchema,
  summaryArtifactSchema,
  timestampsArtifactSchema,
  transcriptArtifactSchema,
  type FlashcardsArtifact,
} from '@/lib/analysis-pipeline/artifact-schemas';
import type {
  AnalysisArtifact,
  AnalysisSnapshot,
  ArtifactKind,
} from '@/lib/analysis-pipeline/domain';
import type { AnalysisIntake } from '@/lib/youtube-intake/repository';
import { defaultResultUserState, type ResultUserState } from './user-state';

export type NormalizedSummaryKeyPoint = Readonly<{
  text: string;
  sourceOffsetMs: number | null;
}>;

export type NormalizedSummarySection = Readonly<{
  title: string;
  summary: string;
  details: string;
  supportingQuote: string | null;
  sourceOffsetMs: number | null;
}>;

export type SummaryPresentation = Readonly<{
  schemaVersion: 1 | 2 | 3;
  title: string;
  outcome: string;
  sections: readonly NormalizedSummarySection[];
  /** Compatibility aliases retained for the DEN-18 editor and serializer. */
  overview: string;
  keyPoints: readonly NormalizedSummaryKeyPoint[];
}>;

export type TranscriptPresentation = Readonly<{
  schemaVersion: 1 | 2;
  language: string;
  segments: readonly Readonly<{
    text: string;
    offsetMs: number;
    durationMs: number;
    segmentType: 'insight' | 'question' | 'example' | 'story' | 'other';
    speakerLabel: string | null;
  }>[];
}>;

export type TimestampsPresentation = {
  schemaVersion: 1;
  chapters: {
    offsetMs: number;
    title: string;
    description: string;
    /** Present on normalized server data; optional while a legacy editor draft is active. */
    durationMs?: number;
  }[];
};

export type ResultOverviewData = Readonly<{
  outcome: string;
  durationSeconds: number;
  summarySectionCount: number | null;
  flashcardCount: number | null;
  reviewedFlashcardCount: number | null;
  keyMomentCount: number | null;
  transcriptWordCount: number | null;
  currentTimeSeconds: number;
  currentChapter: Readonly<{
    id: string;
    title: string;
    startSeconds: number;
    endSeconds?: number;
    thumbnailUrl?: string;
  }> | null;
  availableExports: readonly string[];
}>;

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
  overview: ResultOverviewData;
  userState: ResultUserState;
  tabs: Readonly<{
    summary: ResultTab<SummaryPresentation>;
    flashcards: ResultTab<FlashcardsArtifact>;
    timestamps: ResultTab<TimestampsPresentation>;
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
  sourceTranscriptText: string,
): SummaryPresentation {
  const summary = summaryArtifactSchema.parse(content);
  if (summary.schemaVersion === 3) {
    const normalizedTranscript = sourceTranscriptText
      .normalize('NFKC')
      .trim()
      .replace(/\s+/gu, ' ')
      .toLocaleLowerCase();
    const sections = summary.sections.map((section) => {
      const normalizedQuote = section.supportingQuote
        ?.normalize('NFKC')
        .trim()
        .replace(/\s+/gu, ' ')
        .toLocaleLowerCase();
      return {
        ...section,
        supportingQuote:
          normalizedQuote && normalizedTranscript.includes(normalizedQuote)
            ? section.supportingQuote
            : null,
        sourceOffsetMs:
          section.sourceOffsetMs !== null && section.sourceOffsetMs > durationMs
            ? null
            : section.sourceOffsetMs,
      };
    });
    return {
      schemaVersion: summary.schemaVersion,
      title: summary.title,
      outcome: summary.outcome,
      sections,
      overview: summary.outcome,
      keyPoints: sections.map((section) => ({
        text: section.summary,
        sourceOffsetMs: section.sourceOffsetMs,
      })),
    };
  }

  const keyPoints = summary.keyPoints.map((keyPoint) => {
    if (typeof keyPoint === 'string')
      return { text: keyPoint, sourceOffsetMs: null };
    return {
      text: keyPoint.text,
      sourceOffsetMs:
        keyPoint.sourceOffsetMs > durationMs ? null : keyPoint.sourceOffsetMs,
    };
  });
  return {
    schemaVersion: summary.schemaVersion,
    title: summary.title,
    outcome: summary.overview,
    sections: keyPoints.map((keyPoint) => ({
      title: keyPoint.text,
      summary: keyPoint.text,
      details: keyPoint.text,
      supportingQuote: null,
      sourceOffsetMs: keyPoint.sourceOffsetMs,
    })),
    overview: summary.overview,
    keyPoints,
  };
}

function normalizeTranscript(content: unknown): TranscriptPresentation {
  const transcript = transcriptArtifactSchema.parse(content);
  return {
    schemaVersion: transcript.schemaVersion,
    language: transcript.language,
    segments: transcript.segments.map((segment) => ({
      ...segment,
      segmentType:
        'segmentType' in segment ? segment.segmentType : ('other' as const),
      speakerLabel: 'speakerLabel' in segment ? segment.speakerLabel : null,
    })),
  };
}

function normalizeTimestamps(
  content: unknown,
  durationMs: number,
): TimestampsPresentation {
  const timestamps = timestampsArtifactSchema.parse(content);
  return {
    ...timestamps,
    chapters: timestamps.chapters.map((chapter, index) => {
      const nextOffset = timestamps.chapters[index + 1]?.offsetMs ?? durationMs;
      return {
        ...chapter,
        durationMs: Math.max(
          0,
          Math.min(durationMs, nextOffset) - chapter.offsetMs,
        ),
      };
    }),
  };
}

function countTranscriptWords(transcript: TranscriptPresentation): number {
  return transcript.segments.reduce((count, segment) => {
    const text = segment.text.trim();
    return count + (text === '' ? 0 : text.split(/\s+/u).length);
  }, 0);
}

export function normalizeResultWorkspace(
  intake: AnalysisIntake,
  snapshot: AnalysisSnapshot,
  userState: ResultUserState = defaultResultUserState,
): ResultWorkspaceModel {
  const artifacts = new Map<ArtifactKind, AnalysisArtifact>(
    snapshot.artifacts.map((artifact) => [artifact.kind, artifact]),
  );
  const requested = new Set(intake.configuration.artifacts);
  const durationMs = intake.durationSeconds * 1_000;
  const summaryArtifact = artifacts.get('summary');
  const flashcardsArtifact = artifacts.get('flashcards');
  const timestampsArtifact = artifacts.get('timestamps');
  const transcriptArtifact = artifacts.get('transcript');
  const sourceTranscriptText = intake.transcriptSegments
    .map((segment) => segment.text)
    .join(' ');
  const summaryTab = normalizeArtifact(
    requested.has('summary'),
    summaryArtifact,
    (content) => normalizeSummary(content, durationMs, sourceTranscriptText),
  );
  const flashcardsTab = normalizeArtifact(
    requested.has('flashcards'),
    flashcardsArtifact,
    (content) => flashcardsArtifactSchema.parse(content),
  );
  const timestampsTab = normalizeArtifact(
    requested.has('timestamps'),
    timestampsArtifact,
    (content) => normalizeTimestamps(content, durationMs),
  );
  const transcriptTab = normalizeArtifact(
    requested.has('transcript'),
    transcriptArtifact,
    normalizeTranscript,
  );
  const flashcardRevision = flashcardsArtifact?.updatedAt;
  const currentReviews =
    flashcardsTab.status === 'ready' && flashcardRevision
      ? [
          ...new Map(
            userState.reviews
              .filter(
                (review) =>
                  review.artifactRevision === flashcardRevision &&
                  review.cardIndex < flashcardsTab.data.cards.length,
              )
              .map((review) => [review.cardIndex, review]),
          ).values(),
        ]
      : [];
  const normalizedPlaybackPositionMs = Math.min(
    durationMs,
    Math.max(0, userState.playbackPositionMs),
  );
  const currentChapterIndex =
    timestampsTab.status === 'ready'
      ? timestampsTab.data.chapters.findLastIndex(
          (chapter) => chapter.offsetMs <= normalizedPlaybackPositionMs,
        )
      : -1;
  const currentChapter =
    timestampsTab.status === 'ready' && currentChapterIndex >= 0
      ? timestampsTab.data.chapters[currentChapterIndex]
      : undefined;
  const hasExportableArtifact = [
    summaryTab,
    flashcardsTab,
    timestampsTab,
    transcriptTab,
  ].some((tab) => tab.status === 'ready');
  const normalizedUserState: ResultUserState = {
    ...userState,
    playbackPositionMs: normalizedPlaybackPositionMs,
    reviews: currentReviews,
  };

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
    overview: {
      outcome:
        summaryTab.status === 'ready' ? summaryTab.data.outcome : intake.title,
      durationSeconds: intake.durationSeconds,
      summarySectionCount:
        summaryTab.status === 'ready' ? summaryTab.data.sections.length : null,
      flashcardCount:
        flashcardsTab.status === 'ready'
          ? flashcardsTab.data.cards.length
          : null,
      reviewedFlashcardCount:
        flashcardsTab.status === 'ready' ? currentReviews.length : null,
      keyMomentCount:
        timestampsTab.status === 'ready'
          ? timestampsTab.data.chapters.length
          : null,
      transcriptWordCount:
        transcriptTab.status === 'ready'
          ? countTranscriptWords(transcriptTab.data)
          : null,
      currentTimeSeconds: normalizedPlaybackPositionMs / 1_000,
      currentChapter: currentChapter
        ? {
            id: `chapter-${currentChapterIndex}`,
            title: currentChapter.title,
            startSeconds: currentChapter.offsetMs / 1_000,
            endSeconds:
              (currentChapter.offsetMs + (currentChapter.durationMs ?? 0)) /
              1_000,
          }
        : null,
      availableExports: hasExportableArtifact
        ? ['markdown', 'obsidian', 'notebooklm']
        : [],
    },
    userState: normalizedUserState,
    tabs: {
      summary: summaryTab,
      flashcards: flashcardsTab,
      timestamps: timestampsTab,
      transcript: transcriptTab,
    },
  };
}
