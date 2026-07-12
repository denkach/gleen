import type { SupabaseClient } from '@supabase/supabase-js';

import type { OnboardingStorage } from './repository';

const profileColumns =
  'interface_locale, output_locale, summary_preset, flashcard_preset, onboarding_step, onboarding_completed_at';

export function createSupabaseOnboardingStorage(
  client: SupabaseClient,
): OnboardingStorage {
  return {
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
