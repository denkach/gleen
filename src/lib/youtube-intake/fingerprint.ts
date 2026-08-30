import { createHash } from 'node:crypto';
import type { NormalizedIntakeConfiguration } from './configuration';

export function createDuplicateKey(
  youtubeVideoId: string,
  configuration: NormalizedIntakeConfiguration,
): string {
  return hashConfiguration(
    youtubeVideoId,
    configuration,
    configuration.summaryPreset,
  );
}

function hashConfiguration(
  youtubeVideoId: string,
  configuration: NormalizedIntakeConfiguration,
  summaryPreset: string | null,
): string {
  const artifacts = [...configuration.artifacts].sort();
  const canonical = JSON.stringify({
    youtubeVideoId,
    outputLocale: configuration.outputLocale,
    artifacts,
    summaryPreset: artifacts.includes('summary') ? summaryPreset : null,
    flashcardPreset: artifacts.includes('flashcards')
      ? configuration.flashcardPreset
      : null,
    analysisContractVersion: configuration.analysisContractVersion,
  });

  return createHash('sha256').update(canonical, 'utf8').digest('hex');
}

export function createCompatibleDuplicateKeys(
  youtubeVideoId: string,
  configuration: NormalizedIntakeConfiguration,
): readonly string[] {
  const canonical = createDuplicateKey(youtubeVideoId, configuration);
  if (configuration.summaryPreset !== 'deep') return [canonical];
  return [
    canonical,
    hashConfiguration(youtubeVideoId, configuration, 'detailed'),
  ];
}
