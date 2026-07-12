'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AnalysisVisualState,
  Artifact,
} from '@/lib/analyze-processing/analysis-visual-state';

import { AnalyzeProcessingVisual } from './analyze-processing-visual';

const fixtureUrl = 'https://www.youtube.com/watch?v=gleen-fixture';
const allArtifacts: readonly Artifact[] = [
  'summary',
  'flashcards',
  'timestamps',
  'transcript',
];

const prototypeSchedule: readonly [
  delay: number,
  state: AnalysisVisualState,
][] = [
  [850, 'validating'],
  [2_100, 'transcript'],
  [3_500, 'structuring'],
  [5_000, 'artifacts'],
  [6_500, 'complete'],
  [7_100, 'complete'],
];

export function AnalyzeProcessingFixture() {
  const [state, setState] = useState<AnalysisVisualState>('idle');
  const [selectedArtifacts, setSelectedArtifacts] =
    useState<readonly Artifact[]>(allArtifacts);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isRunning = !['idle', 'complete', 'error'].includes(state);

  const clearTimers = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  const run = useCallback(() => {
    clearTimers();
    setState('submitting');
    timers.current = prototypeSchedule.map(([delay, nextState]) =>
      setTimeout(() => setState(nextState), delay),
    );
  }, [clearTimers]);

  const replay = useCallback(() => {
    clearTimers();
    setState('idle');
    timers.current = [setTimeout(run, 80)];
  }, [clearTimers, run]);

  const previewError = useCallback(() => {
    clearTimers();
    setState('error');
  }, [clearTimers]);

  const toggleArtifact = (artifact: Artifact) => {
    setSelectedArtifacts((current) =>
      current.includes(artifact)
        ? current.filter((item) => item !== artifact)
        : [...current, artifact],
    );
  };

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <section aria-labelledby="analyze-processing-fixture-title">
      <header>
        <p>Development-only deterministic demo</p>
        <h1 id="analyze-processing-fixture-title">
          Analyze processing motion fixture
        </h1>
      </header>

      <fieldset>
        <legend>Fixture artifact rays</legend>
        {allArtifacts.map((artifact) => (
          <label key={artifact}>
            <input
              type="checkbox"
              checked={selectedArtifacts.includes(artifact)}
              onChange={() => toggleArtifact(artifact)}
            />
            {artifact[0].toUpperCase() + artifact.slice(1)}
          </label>
        ))}
      </fieldset>

      <div>
        <button type="button" onClick={run} disabled={isRunning}>
          Analyze video
        </button>
        <button type="button" onClick={replay}>
          Replay sequence
        </button>
        <button type="button" onClick={previewError}>
          Preview error
        </button>
      </div>

      <AnalyzeProcessingVisual
        state={state}
        selectedArtifacts={selectedArtifacts}
        submittedUrl={fixtureUrl}
        errorMessage={
          state === 'error'
            ? 'Fixture error: the demo video could not be accessed.'
            : undefined
        }
        onRetry={run}
      />
    </section>
  );
}
