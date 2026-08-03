import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import {
  deriveAppIdentity,
  unavailableUsage,
  type AppUsage,
} from '@/lib/app-shell';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/session-expired');

  let usage: AppUsage = unavailableUsage;
  try {
    const snapshot = await createSupabaseBillingRepository(
      supabase as unknown as SupabaseBillingClient,
    ).getOwnedSnapshot(user.id);
    usage = {
      status: 'available',
      label: `${snapshot.usage.remaining} analyses left`,
      planName: snapshot.currentPlan.displayName,
      used: snapshot.usage.used + snapshot.usage.reserved,
      limit: snapshot.usage.limit,
      resetAt: snapshot.period.endsAt,
    };
  } catch {
    // Billing availability must not prevent authenticated app navigation.
  }

  return (
    <AppShell identity={deriveAppIdentity(user)} usage={usage}>
      {children}
    </AppShell>
  );
}
