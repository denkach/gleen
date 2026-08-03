import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient } from '@supabase/supabase-js';

import { validatePublicEnv } from '@/env';
import {
  createAuthenticatedBillingE2eClient,
  isAuthenticatedBillingE2eBoundaryEnabled,
} from '@/lib/billing/authenticated-e2e-boundary';

export async function createServerSupabaseClient(): Promise<SupabaseClient> {
  const env = validatePublicEnv(process.env);
  const cookieStore = await cookies();
  if (
    isAuthenticatedBillingE2eBoundaryEnabled(
      process.env,
      cookieStore.get('gleen-billing-e2e-session')?.value,
    )
  ) {
    return createAuthenticatedBillingE2eClient() as unknown as SupabaseClient;
  }

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write cookies. The proxy refreshes them.
          }
        },
      },
    },
  );
}
