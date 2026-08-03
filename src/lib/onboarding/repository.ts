import {
  defaultOnboardingState,
  onboardingPatchSchema,
  onboardingStateSchema,
  type OnboardingPatch,
  type OnboardingState,
} from './preferences';
import { localeSchema, type Locale } from '@/lib/i18n/locales';

type StorageError = Readonly<{ message: string }>;
type StorageResult = Readonly<{
  data: unknown;
  error: StorageError | null;
}>;

export type OnboardingStorage = Readonly<{
  read(userId: string): Promise<StorageResult>;
  upsert(
    userId: string,
    values: Record<string, unknown>,
  ): Promise<StorageResult>;
}>;

export type InterfaceLocaleStorage = Readonly<{
  readInterfaceLocale(userId: string): Promise<StorageResult>;
  updateInterfaceLocale(userId: string, locale: Locale): Promise<StorageResult>;
}>;

export type PreferenceResult<T> =
  | Readonly<{ ok: true; data: T }>
  | Readonly<{
      ok: false;
      code: 'unauthorized' | 'validation' | 'storage';
    }>;

const profileRowSchema = onboardingStateSchema.transform((value) => value);

export async function readInterfaceLocale(
  storage: InterfaceLocaleStorage,
  userId: string,
): Promise<Locale | null> {
  const result = await storage.readInterfaceLocale(userId);
  if (result.error || !result.data) return null;

  const row = result.data as Record<string, unknown>;
  const parsed = localeSchema.safeParse(row.interface_locale);
  return parsed.success ? parsed.data : null;
}

function parseProfileRow(input: unknown): OnboardingState | null {
  if (!input) return defaultOnboardingState;

  const row = input as Record<string, unknown>;
  const parsed = profileRowSchema.safeParse({
    interfaceLocale: row.interface_locale,
    outputLocale: row.output_locale,
    summaryPreset: row.summary_preset,
    flashcardPreset: row.flashcard_preset,
    onboardingStep: row.onboarding_step,
    onboardingCompletedAt: row.onboarding_completed_at,
  });

  return parsed.success ? parsed.data : null;
}

function toProfilePatch(patch: OnboardingPatch): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  if (patch.interfaceLocale !== undefined)
    values.interface_locale = patch.interfaceLocale;
  if (patch.outputLocale !== undefined)
    values.output_locale = patch.outputLocale;
  if (patch.summaryPreset !== undefined)
    values.summary_preset = patch.summaryPreset;
  if (patch.flashcardPreset !== undefined)
    values.flashcard_preset = patch.flashcardPreset;
  if (patch.onboardingStep !== undefined)
    values.onboarding_step = patch.onboardingStep;
  if (patch.onboardingCompletedAt !== undefined)
    values.onboarding_completed_at = patch.onboardingCompletedAt;

  return values;
}

export async function getOnboardingState(
  storage: OnboardingStorage,
  userId: string | null,
): Promise<PreferenceResult<OnboardingState>> {
  if (!userId) return { ok: false, code: 'unauthorized' };

  const result = await storage.read(userId);
  if (result.error) return { ok: false, code: 'storage' };

  const state = parseProfileRow(result.data);
  return state ? { ok: true, data: state } : { ok: false, code: 'storage' };
}

export async function saveOnboardingStep(
  storage: OnboardingStorage,
  userId: string | null,
  input: unknown,
): Promise<PreferenceResult<OnboardingState>> {
  if (!userId) return { ok: false, code: 'unauthorized' };

  const parsedPatch = onboardingPatchSchema.safeParse(input);
  if (!parsedPatch.success) return { ok: false, code: 'validation' };

  const result = await storage.upsert(userId, toProfilePatch(parsedPatch.data));
  if (result.error) return { ok: false, code: 'storage' };

  const state = parseProfileRow(result.data);
  return state ? { ok: true, data: state } : { ok: false, code: 'storage' };
}
