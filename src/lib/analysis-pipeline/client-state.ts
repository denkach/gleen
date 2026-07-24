import type { AnalysisVisualState } from '@/lib/analyze-processing/analysis-visual-state';

import type { AnalysisSnapshot } from './domain';

export function toAnalysisVisualState(
  snapshot: AnalysisSnapshot,
): AnalysisVisualState {
  if (snapshot.job.status === 'complete') return 'complete';
  if (snapshot.job.status === 'failed' || snapshot.job.status === 'partial')
    return 'error';
  return snapshot.job.stage;
}

export function chooseNewestSnapshot(
  current: AnalysisSnapshot,
  incoming: AnalysisSnapshot,
): AnalysisSnapshot {
  return incoming.job.revision > current.job.revision ? incoming : current;
}

export function isTerminalAnalysis(snapshot: AnalysisSnapshot): boolean {
  return ['partial', 'complete', 'failed'].includes(snapshot.job.status);
}
