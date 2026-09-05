'use server';

import { localeSchema, type Locale } from '@/lib/i18n/locales';
import { flashcardPresetSchema } from '@/lib/onboarding/preferences';
import { saveOnboardingStep } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { summaryModeSchema, type SummaryMode } from '@/lib/summary-mode';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { z } from 'zod';

const displayNameSchema = z.string().trim().min(1).max(100);

export type DisplayNameActionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'success'; value: string }>
  | Readonly<{
      status: 'error';
      code:
        'invalid_display_name' | 'profile_update_failed' | 'session_expired';
      value: string;
    }>;

export type FlashcardPresetActionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'success'; count: 18 | 30 }>
  | Readonly<{
      status: 'error';
      code:
        | 'invalid_flashcard_preset'
        | 'profile_update_failed'
        | 'session_expired';
    }>;

export type OutputLocaleActionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'success'; locale: Locale }>
  | Readonly<{
      status: 'error';
      code: 'invalid_locale' | 'profile_update_failed' | 'session_expired';
    }>;

export type SummaryModeActionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'success'; mode: SummaryMode }>
  | Readonly<{
      status: 'error';
      code:
        'invalid_summary_mode' | 'profile_update_failed' | 'session_expired';
    }>;

export async function setDisplayName(
  _previousState: DisplayNameActionState,
  formData: FormData,
): Promise<DisplayNameActionState> {
  const submitted = String(formData.get('displayName') ?? '');
  const parsed = displayNameSchema.safeParse(submitted);
  if (!parsed.success) {
    return { status: 'error', code: 'invalid_display_name', value: submitted };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: 'error', code: 'session_expired', value: submitted };
  }
  const { error } = await supabase.auth.updateUser({
    data: { full_name: parsed.data },
  });
  return error
    ? { status: 'error', code: 'profile_update_failed', value: submitted }
    : { status: 'success', value: parsed.data };
}

export async function setFlashcardPreset(
  _previousState: FlashcardPresetActionState,
  formData: FormData,
): Promise<FlashcardPresetActionState> {
  const parsed = flashcardPresetSchema.safeParse(
    Number(formData.get('flashcardPreset')),
  );
  if (!parsed.success) {
    return { status: 'error', code: 'invalid_flashcard_preset' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', code: 'session_expired' };

  const result = await saveOnboardingStep(
    createSupabaseOnboardingStorage(supabase),
    user.id,
    { flashcardPreset: parsed.data },
  );
  return result.ok
    ? { status: 'success', count: parsed.data }
    : { status: 'error', code: 'profile_update_failed' };
}

export async function setOutputLocale(
  _previousState: OutputLocaleActionState,
  formData: FormData,
): Promise<OutputLocaleActionState> {
  const parsed = localeSchema.safeParse(formData.get('locale'));
  if (!parsed.success) return { status: 'error', code: 'invalid_locale' };

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', code: 'session_expired' };

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: user.id, output_locale: parsed.data },
      { onConflict: 'user_id' },
    )
    .select('output_locale')
    .single();

  return error
    ? { status: 'error', code: 'profile_update_failed' }
    : { status: 'success', locale: parsed.data };
}

export async function setSummaryMode(
  _previousState: SummaryModeActionState,
  formData: FormData,
): Promise<SummaryModeActionState> {
  const parsed = summaryModeSchema.safeParse(formData.get('summaryMode'));
  if (!parsed.success) {
    return { status: 'error', code: 'invalid_summary_mode' };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'error', code: 'session_expired' };

  const result = await saveOnboardingStep(
    createSupabaseOnboardingStorage(supabase),
    user.id,
    { summaryPreset: parsed.data },
  );
  return result.ok
    ? { status: 'success', mode: parsed.data }
    : { status: 'error', code: 'profile_update_failed' };
}
