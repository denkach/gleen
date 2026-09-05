'use server';

import { localeSchema, type Locale } from '@/lib/i18n/locales';
import { summaryModeSchema, type SummaryMode } from '@/lib/summary-mode';
import { createServerSupabaseClient } from '@/lib/supabase/server';

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

  const { error } = await supabase
    .from('profiles')
    .upsert(
      { user_id: user.id, summary_preset: parsed.data },
      { onConflict: 'user_id' },
    )
    .select('summary_preset')
    .single();

  return error
    ? { status: 'error', code: 'profile_update_failed' }
    : { status: 'success', mode: parsed.data };
}
