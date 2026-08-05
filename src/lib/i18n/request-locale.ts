import { cache } from 'react';

import { cookies, headers } from 'next/headers';

import { readInterfaceLocale } from '@/lib/onboarding/repository';
import { createSupabaseOnboardingStorage } from '@/lib/onboarding/supabase-storage';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import {
  defaultLocale,
  localeSchema,
  parseAcceptLanguage,
  type Locale,
} from './locales';

export type InterfaceLocaleResolutionInput = Readonly<{
  profile: unknown;
  cookie: unknown;
  header: string | null | undefined;
}>;

function parseLocale(value: unknown): Locale | null {
  const parsed = localeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function resolveInterfaceLocale({
  profile,
  cookie,
  header,
}: InterfaceLocaleResolutionInput): Locale {
  return (
    parseLocale(cookie) ??
    parseLocale(profile) ??
    parseAcceptLanguage(header) ??
    defaultLocale
  );
}

export const getRequestLocale = cache(async (): Promise<Locale> => {
  const [cookieStore, requestHeaders] = await Promise.all([
    cookies(),
    headers(),
  ]);
  const cookie = cookieStore.get('gleen_locale')?.value;
  const cookieLocale = parseLocale(cookie);
  if (cookieLocale) return cookieLocale;

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const profile = user
    ? await readInterfaceLocale(
        createSupabaseOnboardingStorage(supabase),
        user.id,
      )
    : null;

  return resolveInterfaceLocale({
    profile,
    cookie,
    header: requestHeaders.get('accept-language'),
  });
});
