import {
  formatKeyMomentsCount,
  type ResultCopy,
} from '@/lib/result-workspace/copy';
import { isResultArtifactAddressable } from '@/lib/result-workspace/artifact-availability';
import {
  recommendNextArtifact,
  type ResultArtifact,
} from '@/lib/result-workspace/navigation';
import type {
  ResultTab,
  ResultWorkspaceModel,
  UnavailableTab,
} from '@/lib/result-workspace/presentation';

import type {
  ArtifactLinkCardAccent,
  ArtifactLinkCardState,
} from './artifact-link-card';

export type ArtifactDestination = Exclude<ResultArtifact, 'overview'>;

export type OverviewArtifactCard = Readonly<{
  accent: ArtifactLinkCardAccent;
  artifact: ArtifactDestination;
  description: string;
  label: string;
  state: ArtifactLinkCardState;
}>;

export type OverviewMetric = Readonly<{
  label: string;
  value: string | null;
}>;

export type OverviewViewModel = Readonly<{
  cards: readonly OverviewArtifactCard[];
  continuation: Readonly<{
    chapterTitle: string | null;
    progress: number;
    savedPositionMs: number | null;
    timeLabel: string | null;
  }>;
  insight: Readonly<{
    label: string;
    state: ArtifactLinkCardState;
    text: string;
  }>;
  metrics: readonly OverviewMetric[];
  recommendation: Readonly<{
    artifact: Extract<ResultArtifact, 'summary' | 'flashcards' | 'transcript'>;
    available: boolean;
    description: string;
    label: string;
  }>;
}>;

export function formatOverviewTime(seconds: number): string {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(wholeSeconds / 3_600);
  const minutes = Math.floor((wholeSeconds % 3_600) / 60);
  const remainder = wholeSeconds % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
  }
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
}

function unavailableState(
  state: UnavailableTab,
  copy: ResultCopy,
): Readonly<{
  cardState: ArtifactLinkCardState;
  description: string;
}> {
  if (state.reason === 'pending') {
    return { cardState: 'processing', description: copy.stateProcessing };
  }
  if (state.reason === 'failed' || state.reason === 'malformed') {
    return {
      cardState: 'failed',
      description:
        state.reason === 'failed' ? copy.stateFailed : copy.stateMalformed,
    };
  }
  return {
    cardState: 'disabled',
    description:
      state.reason === 'not_requested'
        ? copy.stateNotRequested
        : copy.stateMissing,
  };
}

function cardState<T>(
  tab: ResultTab<T>,
  readyDescription: string,
  copy: ResultCopy,
): Readonly<{
  cardState: ArtifactLinkCardState;
  description: string;
}> {
  if (tab.status === 'ready') {
    return { cardState: 'ready', description: readyDescription };
  }
  return unavailableState(tab, copy);
}

function readyCountDescription(
  count: number | null,
  label: string,
  numberFormat: Intl.NumberFormat,
  copy: ResultCopy,
): string {
  return count === null
    ? copy.stateUnavailable
    : `${numberFormat.format(count)} · ${label}`;
}

function buildArtifactCards(
  model: ResultWorkspaceModel,
  copy: ResultCopy,
  numberFormat: Intl.NumberFormat,
): readonly OverviewArtifactCard[] {
  const summary = cardState(
    model.tabs.summary,
    readyCountDescription(
      model.overview.summarySectionCount,
      copy.overviewSummarySections,
      numberFormat,
      copy,
    ),
    copy,
  );
  const flashcardDescription =
    model.overview.flashcardCount === null
      ? copy.stateUnavailable
      : model.overview.reviewedFlashcardCount === null
        ? `${numberFormat.format(model.overview.flashcardCount)} · ${copy.overviewFlashcards}`
        : `${numberFormat.format(model.overview.reviewedFlashcardCount)} / ${numberFormat.format(model.overview.flashcardCount)} · ${copy.overviewReviewed}`;
  const flashcards = cardState(
    model.tabs.flashcards,
    flashcardDescription,
    copy,
  );
  const timestamps = cardState(
    model.tabs.timestamps,
    model.overview.keyMomentCount === null
      ? copy.stateUnavailable
      : formatKeyMomentsCount(copy, model.overview.keyMomentCount),
    copy,
  );
  const transcript = cardState(
    model.tabs.transcript,
    readyCountDescription(
      model.overview.transcriptWordCount,
      copy.overviewTranscriptWords,
      numberFormat,
      copy,
    ),
    copy,
  );
  const exportNames: Readonly<Record<string, string>> = {
    markdown: copy.exportMarkdown,
    obsidian: copy.exportObsidian,
    notebooklm: copy.exportNotebookLm,
    notion: copy.exportNotion,
  };
  const availableExports = model.overview.availableExports.flatMap(
    (destination) =>
      exportNames[destination] ? [exportNames[destination]] : [],
  );
  const exportDescription =
    availableExports.length > 0
      ? availableExports.join(' · ')
      : [copy.exportMarkdown, copy.exportObsidian, copy.exportNotebookLm].join(
          ' · ',
        );

  return [
    {
      artifact: 'summary',
      accent: 'summary',
      label: copy.tabSummary,
      state: summary.cardState,
      description: summary.description,
    },
    {
      artifact: 'flashcards',
      accent: 'flashcards',
      label: copy.tabFlashcards,
      state: flashcards.cardState,
      description: flashcards.description,
    },
    {
      artifact: 'timestamps',
      accent: 'timestamps',
      label: copy.tabTimestamps,
      state: timestamps.cardState,
      description: timestamps.description,
    },
    {
      artifact: 'transcript',
      accent: 'neutral',
      label: copy.tabTranscript,
      state: transcript.cardState,
      description: transcript.description,
    },
    {
      artifact: 'export',
      accent: 'export',
      label: copy.tabExport,
      state: isResultArtifactAddressable(model.tabs, 'export')
        ? 'ready'
        : 'disabled',
      description: exportDescription,
    },
  ];
}

function buildInsight(
  model: ResultWorkspaceModel,
  copy: ResultCopy,
): OverviewViewModel['insight'] {
  const summary = model.tabs.summary;
  if (summary.status === 'ready') {
    return {
      label: copy.overviewOutcome,
      state: 'ready',
      text: summary.data.outcome,
    };
  }
  const unavailable = unavailableState(summary, copy);
  return {
    label: copy.tabSummary,
    state: unavailable.cardState,
    text: unavailable.description,
  };
}

function recommendationLabel(
  recommendation: Extract<
    ResultArtifact,
    'summary' | 'flashcards' | 'transcript'
  >,
  model: ResultWorkspaceModel,
  copy: ResultCopy,
): string {
  if (recommendation === 'summary') return copy.overviewStartSummary;
  if (recommendation === 'transcript') return copy.overviewReturnTranscript;
  return model.userState?.lastStudyAction === 'flashcards_reviewed'
    ? copy.overviewResumeFlashcards
    : copy.overviewStartFlashcards;
}

export function buildOverviewViewModel(
  model: ResultWorkspaceModel,
  copy: ResultCopy,
): OverviewViewModel {
  const numberFormat = new Intl.NumberFormat(copy.interfaceLocale);
  const cards = buildArtifactCards(model, copy, numberFormat);
  const savedPositionMs = model.userState?.playbackPositionMs ?? null;
  const savedPositionSeconds =
    savedPositionMs === null ? null : savedPositionMs / 1_000;
  const chapter = model.overview.currentChapter;
  const chapterStart = chapter?.startSeconds ?? 0;
  const chapterEnd = chapter?.endSeconds ?? model.overview.durationSeconds;
  const chapterDuration = Math.max(0, chapterEnd - chapterStart);
  const chapterElapsed =
    savedPositionSeconds === null
      ? null
      : Math.max(
          0,
          Math.min(chapterDuration, savedPositionSeconds - chapterStart),
        );
  const progress =
    chapter && chapterElapsed !== null && chapterDuration > 0
      ? chapterElapsed / chapterDuration
      : savedPositionSeconds !== null && model.overview.durationSeconds > 0
        ? savedPositionSeconds / model.overview.durationSeconds
        : 0;
  const recommendation = recommendNextArtifact({
    summaryVisited:
      model.userState?.lastArtifact === 'summary' ||
      model.userState?.lastStudyAction === 'summary_opened',
    reviewed:
      model.userState?.reviews.length ??
      model.overview.reviewedFlashcardCount ??
      0,
    flashcardCount: model.overview.flashcardCount,
    lastStudyAction: model.userState?.lastStudyAction,
  });
  const recommendedCard = cards.find(
    (card) => card.artifact === recommendation,
  );

  return {
    cards,
    continuation: {
      chapterTitle: chapter?.title ?? null,
      progress: Math.min(1, Math.max(0, progress)),
      savedPositionMs,
      timeLabel:
        chapterElapsed === null
          ? null
          : `${formatOverviewTime(chapterElapsed)} / ${formatOverviewTime(chapterDuration)}`,
    },
    insight: buildInsight(model, copy),
    metrics: [
      {
        label: copy.overviewDuration,
        value: Number.isFinite(model.overview.durationSeconds)
          ? formatOverviewTime(model.overview.durationSeconds)
          : null,
      },
      {
        label: copy.overviewSummarySections,
        value:
          model.overview.summarySectionCount === null
            ? null
            : numberFormat.format(model.overview.summarySectionCount),
      },
      {
        label: copy.overviewFlashcards,
        value:
          model.overview.flashcardCount === null
            ? null
            : numberFormat.format(model.overview.flashcardCount),
      },
      {
        label: copy.overviewKeyMoments,
        value:
          model.overview.keyMomentCount === null
            ? null
            : numberFormat.format(model.overview.keyMomentCount),
      },
      {
        label: copy.overviewTranscriptWords,
        value:
          model.overview.transcriptWordCount === null
            ? null
            : numberFormat.format(model.overview.transcriptWordCount),
      },
    ],
    recommendation: {
      artifact: recommendation,
      available: recommendedCard?.state === 'ready',
      description: recommendedCard?.description ?? copy.stateUnavailable,
      label: recommendationLabel(recommendation, model, copy),
    },
  };
}
