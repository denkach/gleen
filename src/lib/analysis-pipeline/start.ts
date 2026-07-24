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
  try {
    const run = await dependencies.startRun(jobId);
    await dependencies.repository.attachWorkflowRun(jobId, run.runId);
    return { runId: run.runId };
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
