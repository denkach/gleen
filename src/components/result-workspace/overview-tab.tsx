import { useId } from 'react';

import { trackResultEvent } from '@/lib/analytics/result-events';
import type { ResultCopy } from '@/lib/result-workspace/copy';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

import { ArtifactLinkCard } from './artifact-link-card';
import { useVideoPlayer, useVideoPlayerSnapshot } from './player-context';
import {
  buildOverviewViewModel,
  type ArtifactDestination,
  type OverviewMetric,
} from './overview-tab-view-model';

const selectPlayerStatus = (snapshot: { status: string }) => snapshot.status;

function Metric({
  label,
  value,
  copy,
}: OverviewMetric & Readonly<{ copy: ResultCopy }>) {
  const unavailableLabel =
    value === null ? `${label}: ${copy.stateUnavailable}` : undefined;
  return (
    <li className="result-overview-metric" aria-label={unavailableLabel}>
      <strong>{value ?? '—'}</strong>
      <span>{label}</span>
    </li>
  );
}

export function OverviewTab({
  model,
  openTab,
  copy,
}: Readonly<{
  model: ResultWorkspaceModel;
  openTab: (tab: ArtifactDestination) => void;
  copy: ResultCopy;
}>) {
  const controller = useVideoPlayer();
  const playerStatus = useVideoPlayerSnapshot(selectPlayerStatus);
  const overviewTitleId = useId();
  const outcomeLabelId = useId();
  const continueTitleId = useId();
  const { cards, continuation, insight, metrics, recommendation } =
    buildOverviewViewModel(model, copy);
  const continueAvailable =
    controller !== null &&
    playerStatus === 'ready' &&
    continuation.savedPositionMs !== null;
  const continueState =
    playerStatus === 'loading' ? copy.stateProcessing : copy.stateUnavailable;

  const openArtifact = (artifact: ArtifactDestination) => {
    const card = cards.find((candidate) => candidate.artifact === artifact);
    if (card?.state !== 'ready') return;
    trackResultEvent({
      name: 'result_overview_artifact_opened',
      artifact,
    });
    openTab(artifact);
  };

  const continueWatching = () => {
    if (!continueAvailable || continuation.savedPositionMs === null) return;
    controller.seekTo(continuation.savedPositionMs);
    controller.play();
    trackResultEvent({
      name: 'result_continue_watching_clicked',
      anonymousAnalysisId: model.source.intakeId,
    });
  };

  return (
    <section className="result-overview" aria-labelledby={overviewTitleId}>
      <h2 id={overviewTitleId} className="sr-only">
        {copy.overviewTitle}
      </h2>

      <section
        className="result-overview-insight"
        aria-labelledby={outcomeLabelId}
        data-state={insight.state}
      >
        <svg
          className="result-overview-prism"
          viewBox="0 0 60 54"
          aria-hidden="true"
        >
          <path d="M30 4 55 49H5Z" />
          <path d="M30 4v45M5 49h50" />
          <path className="result-overview-prism-ray" d="M30 29h29" />
        </svg>
        <div id={outcomeLabelId} className="result-overview-eyebrow">
          <span aria-hidden="true">✦</span>
          {insight.label}
        </div>
        <p className="result-overview-outcome">{insight.text}</p>
      </section>

      <ul className="result-overview-metrics" aria-label={copy.overviewTitle}>
        {metrics.map((metric) => (
          <Metric key={metric.label} {...metric} copy={copy} />
        ))}
      </ul>

      <section
        className="result-overview-continue"
        aria-labelledby={continueTitleId}
      >
        <div className="result-overview-section-copy">
          <span id={continueTitleId}>{copy.overviewContinueWatching}</span>
          <strong>{continuation.chapterTitle ?? copy.stateUnavailable}</strong>
          <small>{continuation.timeLabel ?? continueState}</small>
        </div>
        <div
          className="result-overview-watch-progress"
          role="progressbar"
          aria-label={copy.playerProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(continuation.progress * 100)}
        >
          <span style={{ width: `${continuation.progress * 100}%` }} />
        </div>
        <button
          type="button"
          className="result-overview-continue-action"
          aria-disabled={!continueAvailable}
          onClick={continueAvailable ? continueWatching : undefined}
        >
          {copy.overviewContinueWatching}
          <span aria-hidden="true">→</span>
        </button>
      </section>

      <ul className="result-overview-artifacts" aria-label={copy.tabsLabel}>
        {cards.map((card) => (
          <li key={card.artifact}>
            <ArtifactLinkCard
              {...card}
              openLabel={copy.overviewOpenArtifact}
              onOpen={() => openArtifact(card.artifact)}
            />
          </li>
        ))}
      </ul>

      <section
        className="result-overview-recommendation"
        aria-label={copy.overviewRecommended}
      >
        <div>
          <span>{copy.overviewRecommended}</span>
          <strong>{recommendation.label}</strong>
        </div>
        <button
          type="button"
          data-state={recommendation.available ? 'ready' : 'disabled'}
          aria-disabled={!recommendation.available}
          onClick={
            recommendation.available
              ? () => openArtifact(recommendation.artifact)
              : undefined
          }
        >
          {recommendation.label}
          <span aria-hidden="true">→</span>
        </button>
        {!recommendation.available ? (
          <small>{recommendation.description}</small>
        ) : null}
      </section>
    </section>
  );
}
