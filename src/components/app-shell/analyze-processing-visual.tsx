import {
  artifactRayDefinitions,
  getAnalysisVisualPresentation,
  orderedAnalysisStages,
  type AnalysisVisualState,
  type Artifact,
} from '@/lib/analyze-processing/analysis-visual-state';
import type { CSSProperties } from 'react';

export type AnalyzeProcessingVisualProps = Readonly<{
  state: AnalysisVisualState;
  selectedArtifacts: readonly Artifact[];
  submittedUrl: string;
  errorMessage?: string;
  onRetry?: () => void;
}>;

export function AnalyzeProcessingVisual({
  state,
  selectedArtifacts,
  submittedUrl,
  errorMessage,
  onRetry,
}: AnalyzeProcessingVisualProps) {
  const presentation = getAnalysisVisualPresentation(state);
  const selectedRays = selectedArtifacts.map(
    (artifact) => artifactRayDefinitions[artifact],
  );
  const isError = presentation.mode === 'error';
  const isComplete = presentation.mode === 'complete';

  return (
    <div
      className="analysis-visual"
      data-analysis-state={state}
      data-submitted-url={submittedUrl}
      data-testid="analyze-processing-visual"
    >
      <div className={`analyze-shell ${presentation.mode}`}>
        <div className="analyze-photon" aria-hidden="true" />
        <div className="analyze-shell-flash" aria-hidden="true" />

        <div className="analyze-processing-panel">
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

          <div className="analyze-optic" aria-hidden="true">
            <div className="analyze-beam-in" aria-hidden="true" />
            <div className="analyze-prism" aria-hidden="true" />
            <div className="analyze-rays" aria-hidden="true">
              {selectedRays.map((ray, index) => (
                <i
                  className={`analyze-ray ${ray.tone}`}
                  key={`${ray.label}-${index}`}
                  style={{ '--ray-index': index } as CSSProperties}
                />
              ))}
            </div>
            <div className="analyze-artifact-labels">
              {selectedRays.map((ray, index) => (
                <span
                  className={ray.tone}
                  key={`${ray.label}-${index}`}
                  style={{ '--ray-index': index } as CSSProperties}
                >
                  {ray.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div
          className={`analyze-complete-banner${isComplete ? ' show' : ''}`}
          aria-hidden={!isComplete}
        >
          <div className="analyze-complete-card">
            <div className="analyze-complete-prism" aria-hidden="true" />
            <h2>Your knowledge artifacts are ready.</h2>
            <p>{selectedRays.map((ray) => ray.label).join(', ')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
