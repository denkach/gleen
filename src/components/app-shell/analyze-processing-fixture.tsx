'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { AnalysisVisualState } from '@/lib/analyze-processing/analysis-visual-state';
import type { AppMessages } from '@/lib/i18n/messages/app';

import { AnalyzeProcessingVisual } from './analyze-processing-visual';

const fixtureUrl = 'https://www.youtube.com/watch?v=gleen-fixture';
const prototypeSchedule: readonly [
  delay: number,
  state: AnalysisVisualState,
][] = [
  [850, 'validating'],
  [2_100, 'transcript'],
  [3_500, 'structuring'],
  [5_000, 'artifacts'],
  [6_500, 'complete'],
];

export function AnalyzeProcessingFixture({
  copy,
}: Readonly<{ copy: AppMessages['processing'] }>) {
  const [state, setState] = useState<AnalysisVisualState>('idle');
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

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <section
      className="analyze-processing-fixture"
      aria-labelledby="analyze-processing-fixture-title"
    >
      <header>
        <p>{copy.fixture.developmentOnly}</p>
        <h1 id="analyze-processing-fixture-title">{copy.fixture.title}</h1>
      </header>

      <div className="analyze-processing-fixture-actions">
        <button
          type="button"
          onClick={(event) => {
            event.currentTarget.disabled = true;
            run();
          }}
          disabled={isRunning}
        >
          {copy.fixture.analyze}
        </button>
        <button type="button" onClick={replay}>
          {copy.fixture.replay}
        </button>
        <button type="button" onClick={previewError}>
          {copy.fixture.previewError}
        </button>
      </div>

      <AnalyzeProcessingVisual
        copy={copy}
        state={state}
        submittedUrl={fixtureUrl}
        errorMessage={state === 'error' ? copy.fixture.error : undefined}
        onRetry={run}
      />
    </section>
  );
}
