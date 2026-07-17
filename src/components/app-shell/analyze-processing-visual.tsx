import {
  artifactRailDefinitions,
  getAnalysisVisualPresentation,
  orderedAnalysisStages,
  type AnalysisVisualState,
} from '@/lib/analyze-processing/analysis-visual-state';
import type { ReactNode } from 'react';

export type AnalyzeProcessingVisualProps = Readonly<{
  state: AnalysisVisualState;
  isExiting?: boolean;
  submittedUrl: string;
  errorMessage?: string;
  onRetry?: () => void;
  idleContent?: ReactNode;
}>;

export function AnalyzeProcessingVisual({
  state,
  isExiting = false,
  submittedUrl,
  errorMessage,
  onRetry,
  idleContent,
}: AnalyzeProcessingVisualProps) {
  const presentation = getAnalysisVisualPresentation(state);
  const isError = presentation.mode === 'error';
  const isComplete = presentation.mode === 'complete';

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
            <h2 className="analyze-status-title">{presentation.title}</h2>
            <div className="analyze-status-subtitle">
              {errorMessage ?? presentation.subtitle}
            </div>
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
            {isError && onRetry ? (
              <div className="analyze-controls">
                <button
                  className="analyze-control"
                  type="button"
                  onClick={onRetry}
                >
                  Try again
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
                    <small>{isComplete ? 'ready' : 'queued'}</small>
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
