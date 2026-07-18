'use client';

import {
  artifactRailDefinitions,
  getAnalysisVisualPresentation,
  orderedAnalysisStages,
  type AnalysisVisualState,
} from '@/lib/analyze-processing/analysis-visual-state';
import {
  defaultArtifactSelection,
  type IntakeConfiguration,
} from '@/lib/youtube-intake/configuration';
import { useEffect, useRef, type ReactNode } from 'react';

type ArtifactRailState = 'queued' | 'ready' | 'failed' | 'not selected';

export type AnalyzeProcessingVisualProps = Readonly<{
  state: AnalysisVisualState;
  isExiting?: boolean;
  submittedUrl: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  controls?: ReactNode;
  artifactStates?: Readonly<Record<string, ArtifactRailState>>;
  selectedArtifactKinds?: readonly IntakeConfiguration['artifacts'][number][];
  idleContent?: ReactNode;
}>;

export function AnalyzeProcessingVisual({
  state,
  isExiting = false,
  submittedUrl,
  errorMessage,
  onRetry,
  retryDisabled = false,
  controls,
  artifactStates,
  selectedArtifactKinds = defaultArtifactSelection,
  idleContent,
}: AnalyzeProcessingVisualProps) {
  const presentation = getAnalysisVisualPresentation(state);
  const isError = presentation.mode === 'error';
  const isComplete = presentation.mode === 'complete';
  const titleRef = useRef<HTMLHeadingElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const previousMode = useRef<'idle' | 'processing' | 'complete' | 'error'>(
    'idle',
  );
  const selectedRails = new Set(
    selectedArtifactKinds.map((kind) =>
      kind === 'transcript' ? 'export' : kind,
    ),
  );
  const railState = (
    railId: (typeof artifactRailDefinitions)[number]['id'],
  ): ArtifactRailState =>
    selectedRails.has(railId)
      ? (artifactStates?.[railId] ?? (isComplete ? 'ready' : 'queued'))
      : 'not selected';

  useEffect(() => {
    const previous = previousMode.current;
    previousMode.current = presentation.mode;
    if (presentation.mode === 'error' && previous !== 'error') {
      terminalRef.current?.focus();
    } else if (presentation.mode === 'processing' && previous === 'idle') {
      titleRef.current?.focus();
    }
  }, [presentation.mode]);

  return (
    <div
      className="analysis-visual"
      data-analysis-state={state}
      data-analysis-exiting={isExiting ? 'true' : undefined}
      data-submitted-url={submittedUrl}
      data-testid="analyze-processing-visual"
    >
      <div
        className={`analyze-shell ${presentation.mode}${idleContent ? ' production-intake' : ''}${isExiting ? ' exiting' : ''}`}
      >
        <div className="analyze-photon" aria-hidden="true" />
        <div className="analyze-shell-flash" aria-hidden="true" />
        {idleContent ? (
          <div className="analyze-input-row">{idleContent}</div>
        ) : null}

        <div
          className="analyze-processing-panel"
          aria-hidden={presentation.mode === 'idle'}
          inert={presentation.mode === 'idle' ? true : undefined}
        >
          <div
            className="analyze-status-copy"
            role="status"
            aria-live={isError ? 'assertive' : 'polite'}
          >
            <div className="analyze-status-kicker">
              {isError ? 'ANALYSIS INTERRUPTED' : 'ANALYSIS IN PROGRESS'}
            </div>
            <h2 ref={titleRef} tabIndex={-1} className="analyze-status-title">
              {presentation.title}
            </h2>
            <div
              ref={terminalRef}
              tabIndex={isError ? -1 : undefined}
              className="analyze-status-subtitle"
            >
              {errorMessage ?? presentation.subtitle}
            </div>
            <ul className="sr-only" aria-label="Artifact status">
              {artifactRailDefinitions.map((rail) => (
                <li key={rail.id}>
                  {rail.label.charAt(0) + rail.label.slice(1).toLowerCase()}{' '}
                  {railState(rail.id)}
                </li>
              ))}
            </ul>
            <div className="analyze-steps">
              {orderedAnalysisStages.map((stage) => {
                const stageState = presentation.completedStages.includes(
                  stage.id,
                )
                  ? 'done'
                  : presentation.activeStage === stage.id
                    ? 'active'
                    : 'pending';

                return (
                  <div className={`analyze-step ${stageState}`} key={stage.id}>
                    <span className="analyze-step-dot" aria-hidden="true" />
                    <span data-stage-state={stageState}>{stage.label}</span>
                    <span className="analyze-trace" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
            <div className="analyze-leave-note">
              You can safely leave this page. We’ll save the result to your
              history.
            </div>
            {controls ? (
              <div className="analyze-controls">{controls}</div>
            ) : isError && onRetry ? (
              <div className="analyze-controls">
                <button
                  className="analyze-control"
                  type="button"
                  onClick={onRetry}
                  disabled={retryDisabled}
                >
                  {retryDisabled ? 'Retrying…' : 'Try again'}
                </button>
              </div>
            ) : null}
          </div>

          <div className="analyze-rail-visual" aria-hidden="true">
            <div className="analyze-rail-box">
              <div className="analyze-master-rail" aria-hidden="true" />
              <div className="analyze-rails" aria-hidden="true">
                {artifactRailDefinitions.map((rail) => (
                  <div className={`analyze-rail ${rail.tone}`} key={rail.id}>
                    <span>{rail.label}</span>
                    <span className="analyze-track" />
                    <small>{railState(rail.id)}</small>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="analyze-completion-wipe" aria-hidden="true" />
      </div>
    </div>
  );
}
