import { z } from 'zod';

export const supportedLocales = ['uk', 'ru', 'en', 'es', 'de'] as const;
export const interfaceLocaleSchema = z.enum(supportedLocales);
export const outputLocaleSchema = z.enum(supportedLocales);
export const summaryPresetSchema = z.enum(['balanced', 'detailed']);
export const flashcardPresetSchema = z.union([z.literal(18), z.literal(30)]);
export const onboardingStepSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);

export const outputPreferencesSchema = z.object({
  summaryPreset: summaryPresetSchema,
  flashcardPreset: flashcardPresetSchema,
});

export const onboardingStateSchema = z.object({
  interfaceLocale: interfaceLocaleSchema,
  outputLocale: outputLocaleSchema,
  summaryPreset: summaryPresetSchema,
  flashcardPreset: flashcardPresetSchema,
  onboardingStep: onboardingStepSchema,
  onboardingCompletedAt: z.string().datetime().nullable(),
});

export const onboardingPatchSchema = onboardingStateSchema
  .omit({ onboardingCompletedAt: true })
  .partial()
  .extend({
    onboardingCompletedAt: z.string().datetime().nullable().optional(),
  });

export type OnboardingState = z.infer<typeof onboardingStateSchema>;
export type OnboardingPatch = z.infer<typeof onboardingPatchSchema>;

export const defaultOnboardingState: OnboardingState = {
  interfaceLocale: 'en',
  outputLocale: 'en',
  summaryPreset: 'balanced',
  flashcardPreset: 18,
  onboardingStep: 1,
  onboardingCompletedAt: null,
};
