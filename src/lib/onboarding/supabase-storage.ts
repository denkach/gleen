import type { SupabaseClient } from '@supabase/supabase-js';

import type { InterfaceLocaleStorage, OnboardingStorage } from './repository';
import type { Locale } from '@/lib/i18n/locales';

const profileColumns =
  'interface_locale, output_locale, summary_preset, flashcard_preset, onboarding_step, onboarding_completed_at';
const interfaceLocaleColumns = 'interface_locale';

export function createSupabaseOnboardingStorage(
  client: SupabaseClient,
): OnboardingStorage & InterfaceLocaleStorage {
  return {
    async readInterfaceLocale(userId) {
      const { data, error } = await client
        .from('profiles')
        .select(interfaceLocaleColumns)
        .eq('user_id', userId)
        .maybeSingle();
      return { data, error };
    },
    async upsertInterfaceLocale(userId, locale: Locale) {
      const { data, error } = await client
        .from('profiles')
        .upsert(
          { user_id: userId, interface_locale: locale },
          { onConflict: 'user_id' },
        )
        .select(interfaceLocaleColumns)
        .single();
      return { data, error };
    },
    async read(userId) {
      const { data, error } = await client
        .from('profiles')
        .select(profileColumns)
        .eq('user_id', userId)
        .maybeSingle();
      return { data, error };
    },
    async upsert(userId, values) {
      const { data, error } = await client
        .from('profiles')
        .upsert({ user_id: userId, ...values }, { onConflict: 'user_id' })
        .select(profileColumns)
        .single();
      return { data, error };
    },
  };
}
