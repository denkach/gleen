import {
  resultArtifacts,
  type ResultArtifact,
} from '@/lib/result-workspace/navigation';
import type { ResultWorkspaceModel } from '@/lib/result-workspace/presentation';

export function isResultArtifactAddressable(
  tabs: ResultWorkspaceModel['tabs'],
  artifact: ResultArtifact,
): boolean {
  if (artifact === 'overview' || artifact === 'export') return true;
  return tabs[artifact].status === 'ready';
}

export function getAddressableResultArtifacts(
  tabs: ResultWorkspaceModel['tabs'],
): readonly ResultArtifact[] {
  return resultArtifacts.filter((artifact) =>
    isResultArtifactAddressable(tabs, artifact),
  );
}
