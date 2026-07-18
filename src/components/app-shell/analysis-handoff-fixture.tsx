'use client';

import Link from 'next/link';
import { FormEvent, useEffect, useMemo, useState } from 'react';

import type { AnalysisSnapshot } from '@/lib/analysis-pipeline/domain';

import { InlineAnalysisProcessing } from './inline-analysis-processing';

const analysisId = 'result-complete';
const storageKey = 'gleen:handoff-fixture';

type Journey = 'complete' | 'partial' | 'recover' | 'reduced';

function snapshot(
  status: 'queued' | 'running' | 'partial' | 'complete',
  revision: number,
): AnalysisSnapshot {
  const partial = status === 'partial';
  return {
    job: {
      id: 'job-handoff-fixture',
      analysisId,
      userId: 'fixture-user',
      workflowRunId: 'fixture-run',
      status,
      stage:
        status === 'running'
          ? 'transcript'
          : status === 'complete'
            ? 'complete'
            : status === 'queued'
              ? 'validating'
              : 'artifacts',
      attempt: 1,
      revision,
      errorCode: null,
      startedAt: '2026-07-18T00:00:00.000Z',
      completedAt:
        partial || status === 'complete' ? '2026-07-18T00:01:00.000Z' : null,
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: `2026-07-18T00:00:0${revision}.000Z`,
    },
    events: [],
    artifacts: partial
      ? [
          {
            id: 'fixture-summary',
            analysisId,
            userId: 'fixture-user',
            kind: 'summary',
            status: 'ready',
            schemaVersion: 1,
            content: { schemaVersion: 1, sections: [] },
            errorCode: null,
            generatedAt: '2026-07-18T00:00:01.000Z',
            updatedAt: '2026-07-18T00:00:01.000Z',
          },
          {
            id: 'fixture-flashcards',
            analysisId,
            userId: 'fixture-user',
            kind: 'flashcards',
            status: 'failed',
            schemaVersion: 1,
            content: null,
            errorCode: 'generation_failed',
            generatedAt: null,
            updatedAt: '2026-07-18T00:00:02.000Z',
          },
        ]
      : [],
    usageReservation: {
      id: 'fixture-reservation',
      jobId: 'job-handoff-fixture',
      userId: 'fixture-user',
      status:
        status === 'complete' ? 'settled' : partial ? 'released' : 'reserved',
      updatedAt: '2026-07-18T00:00:03.000Z',
    },
  };
}

export function AnalysisHandoffFixture({
  journey,
}: Readonly<{ journey: Journey }>) {
  const [recovered, setRecovered] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [settled, setSettled] = useState(false);
  const initial = useMemo(
    () =>
      journey === 'partial'
        ? snapshot('partial', 3)
        : snapshot(recovered ? 'running' : 'queued', recovered ? 2 : 1),
    [journey, recovered],
  );

  useEffect(() => {
    if (
      journey === 'recover' &&
      window.sessionStorage.getItem(storageKey) === 'running'
    ) {
      const restore = window.setTimeout(() => {
        setRecovered(true);
        setStartedAt(Date.now() - 600);
      }, 0);
      return () => window.clearTimeout(restore);
    }
  }, [journey]);

  function start(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    window.sessionStorage.setItem(storageKey, 'running');
    setStartedAt(Date.now());
  }

  if (startedAt === null)
    return (
      <form aria-label="Fixture analysis" onSubmit={start}>
        <button className="btn btn-primary" type="submit">
          Start fixture analysis
        </button>
      </form>
    );

  return (
    <>
      <InlineAnalysisProcessing
        analysisId={analysisId}
        initialSnapshot={initial}
        resultPathPrefix="/app-shell-fixture/app/video"
        enableRealtime={false}
        retryAction={async () => ({ ok: true, attempt: 2 })}
        refreshAction={async () => {
          const elapsed = Date.now() - startedAt;
          const next =
            journey === 'partial'
              ? snapshot('partial', 3)
              : journey === 'recover'
                ? snapshot('running', 2)
                : elapsed < 350
                  ? snapshot('queued', 1)
                  : journey === 'reduced' && elapsed >= 750
                    ? snapshot('complete', 3)
                    : elapsed < 3_500
                      ? snapshot('running', 2)
                      : snapshot('complete', 3);
          if (next.job.status === 'running')
            window.sessionStorage.setItem(storageKey, 'running');
          if (['partial', 'complete'].includes(next.job.status))
            setSettled(true);
          return next;
        }}
      />
      <span
        data-testid="fixture-settled"
        data-settled={settled ? 'true' : 'false'}
      />
      {journey === 'recover' ? (
        <Link href="/app-shell-fixture/history">History</Link>
      ) : null}
    </>
  );
}
