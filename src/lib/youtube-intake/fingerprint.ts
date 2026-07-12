import { createHash } from 'node:crypto';
import type { NormalizedIntakeConfiguration } from './configuration';

export function createDuplicateKey(
  youtubeVideoId: string,
  configuration: NormalizedIntakeConfiguration,
): string {
  const canonical = JSON.stringify({
    youtubeVideoId,
    outputLocale: configuration.outputLocale,
    artifacts: [...configuration.artifacts].sort(),
    summaryPreset: configuration.summaryPreset,
    flashcardPreset: configuration.flashcardPreset,
    analysisContractVersion: configuration.analysisContractVersion,
  });

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
