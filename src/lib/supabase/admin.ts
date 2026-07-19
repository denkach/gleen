import 'server-only';

import { createClient } from '@supabase/supabase-js';

import { validateSupabaseAdminEnv } from '@/env';

export function createAdminSupabaseClient() {
  const env = validateSupabaseAdminEnv(process.env);
  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}
