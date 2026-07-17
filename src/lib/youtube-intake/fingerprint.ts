import { createHash } from 'node:crypto';
import type { NormalizedIntakeConfiguration } from './configuration';

export function createDuplicateKey(
  youtubeVideoId: string,
  configuration: NormalizedIntakeConfiguration,
): string {
  const artifacts = [...configuration.artifacts].sort();
  const canonical = JSON.stringify({
    youtubeVideoId,
    outputLocale: configuration.outputLocale,
    artifacts,
    summaryPreset: artifacts.includes('summary')
      ? configuration.summaryPreset
      : null,
    flashcardPreset: artifacts.includes('flashcards')
      ? configuration.flashcardPreset
      : null,
    analysisContractVersion: configuration.analysisContractVersion,
  });

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}
