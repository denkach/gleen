import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  InvoicesScreen,
  parseInvoiceRouteQuery,
} from '@/components/billing/invoices-screen';
import { exportInvoicesCsv } from '@/lib/billing/actions';
import {
  toInvoicePresentation,
  toSubscriptionPresentation,
  type InvoicePresentation,
  type SubscriptionPresentation,
} from '@/lib/billing/presentation';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Invoices — Gleen',
};

type InvoicesPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function InvoicesPage({
  searchParams,
}: InvoicesPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const query = parseInvoiceRouteQuery(await searchParams);
  const repository = createSupabaseBillingRepository(
    supabase as unknown as SupabaseBillingClient,
  );
  let subscription: Pick<
    SubscriptionPresentation,
    'resetAt' | 'resetAtLabel' | 'entitlement'
  > | null = null;
  let invoices: InvoicePresentation | null = null;
  try {
    const [snapshot, page] = await Promise.all([
      repository.getOwnedSnapshot(user.id),
      repository.listOwnedInvoices(user.id, {
        cursor: query.cursor,
        limit: 25,
        search: query.search,
        status: query.status === 'refunded' ? null : query.status,
        refundedOnly: query.status === 'refunded',
        year: query.year,
      }),
    ]);
    const presentedSubscription = toSubscriptionPresentation(snapshot);
    subscription = {
      resetAt: presentedSubscription.resetAt,
      resetAtLabel: presentedSubscription.resetAtLabel,
      entitlement: presentedSubscription.entitlement,
    };
    invoices = toInvoicePresentation(page);
  } catch {
    // The screen preserves filters and renders the explicit error state.
  }
  return (
    <InvoicesScreen
      subscription={subscription}
      invoices={invoices}
      query={query}
      exportAction={exportInvoicesCsv}
    />
  );
}
