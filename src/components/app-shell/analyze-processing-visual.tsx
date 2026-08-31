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
import type { AppMessages } from '@/lib/i18n/messages/app';
import { useEffect, useRef, type ReactNode } from 'react';

type ArtifactRailState = 'queued' | 'ready' | 'failed' | 'not selected';
type ArtifactKind = IntakeConfiguration['artifacts'][number];
type ArtifactRailId = (typeof artifactRailDefinitions)[number]['id'];

const artifactKindByRail = {
  summary: 'summary',
  timestamps: 'timestamps',
  flashcards: 'flashcards',
  export: 'transcript',
} as const satisfies Record<ArtifactRailId, ArtifactKind>;

export type AnalyzeProcessingVisualProps = Readonly<{
  copy: AppMessages['processing'];
  state: AnalysisVisualState;
  isExiting?: boolean;
  submittedUrl: string;
  statusTitle?: string;
  errorMessage?: string;
  onRetry?: () => void;
  retryDisabled?: boolean;
  controls?: ReactNode;
  artifactStates?: Readonly<Record<string, ArtifactRailState>>;
  selectedArtifactKinds?: readonly IntakeConfiguration['artifacts'][number][];
  idleContent?: ReactNode;
}>;

export function AnalyzeProcessingVisual({
  copy,
  state,
  isExiting = false,
  submittedUrl,
  statusTitle,
  errorMessage,
  onRetry,
  retryDisabled = false,
  controls,
  artifactStates,
  selectedArtifactKinds = defaultArtifactSelection,
  idleContent,
}: AnalyzeProcessingVisualProps) {
  const presentation = getAnalysisVisualPresentation(state);
  const presentationCopy = copy.presentations[state];
  const isError = presentation.mode === 'error';
  const isComplete = presentation.mode === 'complete';
  const titleRef = useRef<HTMLHeadingElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const previousMode = useRef<'idle' | 'processing' | 'complete' | 'error'>(
    'idle',
  );
  const selectedArtifacts = new Set(selectedArtifactKinds);
  const railState = (railId: ArtifactRailId): ArtifactRailState => {
    const artifactKind = artifactKindByRail[railId];
    return selectedArtifacts.has(artifactKind)
      ? (artifactStates?.[artifactKind] ?? (isComplete ? 'ready' : 'queued'))
      : 'not selected';
  };
  const artifactStateCopy = (
    railId: ArtifactRailId,
    value: ArtifactRailState,
  ) =>
    copy.artifactStates[railId][
      value === 'not selected' ? 'notSelected' : value
    ];

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
              {isError ? copy.kickerInterrupted : copy.kickerProgress}
            </div>
            <h2 ref={titleRef} tabIndex={-1} className="analyze-status-title">
              {statusTitle ?? presentationCopy.title}
            </h2>
            <div
              ref={terminalRef}
              tabIndex={isError ? -1 : undefined}
              className="analyze-status-subtitle"
            >
              {errorMessage ?? presentationCopy.subtitle}
            </div>
            <ul className="sr-only" aria-label={copy.artifactStatus}>
              {artifactRailDefinitions.map((rail) => (
                <li key={rail.id}>
                  {artifactStateCopy(rail.id, railState(rail.id))}
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
                    <span data-stage-state={stageState}>
                      {copy.stages[stage.id]}
                    </span>
                    <span className="analyze-trace" aria-hidden="true" />
                  </div>
                );
              })}
            </div>
            <div className="analyze-leave-note">{copy.leaveNote}</div>
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
                  {retryDisabled ? copy.retrying : copy.tryAgain}
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
                    <span>
                      {artifactStateCopy(rail.id, railState(rail.id))}
                    </span>
                    <span className="analyze-track" />
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
