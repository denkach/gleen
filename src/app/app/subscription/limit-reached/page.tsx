import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LimitReachedScreen } from '@/components/billing/limit-reached-screen';
import { toSubscriptionPresentation } from '@/lib/billing/presentation';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Analysis limit reached — Gleen',
};

export default async function LimitReachedPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const snapshot = await createSupabaseBillingRepository(
    supabase as unknown as SupabaseBillingClient,
  ).getOwnedSnapshot(user.id);
  const now = new Date().toISOString();

  return (
    <LimitReachedScreen
      presentation={toSubscriptionPresentation(snapshot, { now })}
      now={now}
    />
  );
}
