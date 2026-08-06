'use server';

import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type SubscriptionRecoveryResult =
  | Readonly<{ status: 'success' }>
  | Readonly<{
      status: 'error';
      code: 'session_expired' | 'snapshot_unavailable';
    }>;

export async function retrySubscriptionSnapshot(): Promise<SubscriptionRecoveryResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { status: 'error', code: 'session_expired' };

    const repository = createSupabaseBillingRepository(
      supabase as unknown as SupabaseBillingClient,
    );
    await repository.getOwnedSnapshot(user.id);
    return { status: 'success' };
  } catch {
    console.error({
      event: 'billing_subscription_snapshot_retry_failed',
      route: '/app/subscription',
    });
    return { status: 'error', code: 'snapshot_unavailable' };
  }
}
