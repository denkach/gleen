'use client';

import { createBrowserClient } from '@supabase/ssr';

import { validatePublicEnv } from '@/env';

export function createBrowserSupabaseClient() {
  const env = validatePublicEnv(process.env);

  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
