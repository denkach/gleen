import { start } from 'workflow/api';

import type { AnalysisRepository } from './repository';
import { runAnalysisWorkflow } from './workflow';
import type { UsageLedger } from './usage-ledger';

type StartDependencies = Readonly<{
  repository: AnalysisRepository;
  ledger: UsageLedger;
  startRun(jobId: string): Promise<{ runId: string }>;
}>;

export class AnalysisWorkflowStartError extends Error {
  constructor() {
    super('Unable to start analysis workflow');
    this.name = 'AnalysisWorkflowStartError';
  }
}

export async function startAnalysisWithDependencies(
  jobId: string,
  dependencies: StartDependencies,
) {
  let run: { runId: string };
  try {
    run = await dependencies.startRun(jobId);
  } catch {
    await dependencies.repository.setJobState(jobId, {
      status: 'failed',
      stage: 'validating',
      errorCode: 'workflow_start_failed',
      completedAt: new Date().toISOString(),
    });
    await dependencies.ledger.release(jobId);
    throw new AnalysisWorkflowStartError();
  }

  try {
    await dependencies.repository.attachWorkflowRun(jobId, run.runId);
  } catch {
    // The workflow already exists and owns this reservation. It can complete
    // from its durable jobId input even when this observability link is late.
  }
  return { runId: run.runId };
}

export async function startAnalysis(
  jobId: string,
  repository: AnalysisRepository,
  ledger: UsageLedger,
) {
  return startAnalysisWithDependencies(jobId, {
    repository,
    ledger,
    startRun: async (id) => {
      const run = await start(runAnalysisWorkflow, [{ jobId: id }]);
      return { runId: run.runId };
    },
  });
}
