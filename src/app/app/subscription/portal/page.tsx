import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import {
  PortalScreen,
  type PortalSubscription,
} from '@/components/billing/portal-screen';
import {
  createPortalSession,
  getPaymentMethodSummary,
} from '@/lib/billing/actions';
import {
  formatMoney,
  toInvoicePresentation,
  toSubscriptionPresentation,
} from '@/lib/billing/presentation';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Billing portal — Gleen',
};

export default async function PortalPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const repository = createSupabaseBillingRepository(
    supabase as unknown as SupabaseBillingClient,
  );

  let portalSubscription: PortalSubscription | null = null;
  let activity: ReturnType<typeof toInvoicePresentation> | null = null;
  try {
    const [snapshot, paymentMethod, invoices] = await Promise.all([
      repository.getOwnedSnapshot(user.id),
      getPaymentMethodSummary(),
      repository.listOwnedInvoices(user.id, {
        cursor: null,
        limit: 3,
        search: '',
        status: null,
        refundedOnly: false,
        year: null,
      }),
    ]);
    const subscription = toSubscriptionPresentation(snapshot, {
      paymentMethod: paymentMethod.ok
        ? paymentMethod.paymentMethod
        : { status: 'unavailable' },
    });
    portalSubscription = {
      currentPlan: subscription.currentPlan,
      currentPrice: subscription.currentPrice,
      entitlement: subscription.entitlement,
      resetAt: subscription.resetAt,
      resetAtLabel: subscription.resetAtLabel,
      paymentMethod: subscription.paymentMethod,
      outstandingBalance: formatMoney({
        amountMinor: snapshot.paymentSummary.outstandingAmountMinor,
        currency: snapshot.paymentSummary.currency,
      }),
    };
    activity = toInvoicePresentation(invoices);
  } catch {
    // The screen preserves navigation and renders the explicit error state.
  }
  return (
    <PortalScreen
      subscription={portalSubscription}
      activity={activity}
      portalAction={createPortalSession}
    />
  );
}
