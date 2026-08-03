'use server';

import { cookies } from 'next/headers';

import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import { localeSchema, type Locale } from './locales';

const localeCookieName = 'gleen_locale';
const localeCookieOptions = {
  maxAge: 31_536_000,
  path: '/',
  sameSite: 'lax' as const,
};

export type LocalePersistenceResult =
  | Readonly<{ ok: true; locale: Locale }>
  | Readonly<{ ok: false; code: 'profile_update_failed' }>;

export type LocaleActionState =
  | Readonly<{ status: 'idle' }>
  | Readonly<{ status: 'success'; locale: Locale }>
  | Readonly<{
      status: 'error';
      code: 'invalid_locale' | 'profile_update_failed';
    }>;

export async function persistInterfaceLocale(
  locale: Locale,
): Promise<LocalePersistenceResult> {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const result = await createSupabaseOnboardingStorage(
      supabase,
    ).upsertInterfaceLocale(user.id, locale);
    if (result.error || !result.data)
      return { ok: false, code: 'profile_update_failed' };
  }

  const cookieStore = await cookies();
  cookieStore.set(localeCookieName, locale, localeCookieOptions);
  return { ok: true, locale };
}

export async function setInterfaceLocale(
  _previousState: LocaleActionState,
  formData: FormData,
): Promise<LocaleActionState> {
  const parsed = localeSchema.safeParse(formData.get('locale'));
  if (!parsed.success) return { status: 'error', code: 'invalid_locale' };

  const result = await persistInterfaceLocale(parsed.data);
  return result.ok
    ? { status: 'success', locale: result.locale }
    : { status: 'error', code: result.code };
}
