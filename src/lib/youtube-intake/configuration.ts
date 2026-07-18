import { z } from 'zod';

export const artifactSchema = z.enum([
  'summary',
  'timestamps',
  'transcript',
  'flashcards',
]);
export const defaultArtifactSelection = [
  'summary',
  'timestamps',
  'transcript',
] as const;
export const intakeConfigurationSchema = z.object({
  outputLocale: z.enum(['uk', 'ru', 'en', 'es', 'de']),
  summaryPreset: z.enum(['balanced', 'detailed']),
  flashcardPreset: z.union([z.literal(18), z.literal(30)]),
  artifacts: z.array(artifactSchema).min(1),
  analysisContractVersion: z.literal(1),
});

export type IntakeConfiguration = z.infer<typeof intakeConfigurationSchema>;
export type NormalizedIntakeConfiguration = Readonly<{
  outputLocale: IntakeConfiguration['outputLocale'];
  summaryPreset: IntakeConfiguration['summaryPreset'] | null;
  flashcardPreset: IntakeConfiguration['flashcardPreset'] | null;
  artifacts: readonly z.infer<typeof artifactSchema>[];
  analysisContractVersion: 1;
}>;

export function normalizeIntakeConfiguration(
  input: unknown,
): NormalizedIntakeConfiguration {
  const parsed = intakeConfigurationSchema.parse(input);
  const artifacts = [...new Set(parsed.artifacts)].sort();

  return {
    ...parsed,
    artifacts,
    summaryPreset: artifacts.includes('summary') ? parsed.summaryPreset : null,
    flashcardPreset: artifacts.includes('flashcards')
      ? parsed.flashcardPreset
      : null,
  };
}
