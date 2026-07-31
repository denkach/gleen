import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  PortalScreen,
  type PortalSubscription,
} from '@/components/billing/portal-screen';
import {
  createPortalSession,
  createPlanChangePortalSession,
  getPaymentMethodSummary,
  type CheckoutActionInput,
} from '@/lib/billing/actions';
import {
  billingIntervalSchema,
  billingPlanSlugSchema,
} from '@/lib/billing/domain';
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

const planChangeQuerySchema = z
  .object({
    plan: billingPlanSlugSchema.optional(),
    interval: billingIntervalSchema.optional(),
  })
  .strict();

type PortalPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function parsePlanChange(
  raw: Record<string, string | string[] | undefined>,
): CheckoutActionInput | null {
  const parsed = planChangeQuerySchema.safeParse({
    plan: typeof raw.plan === 'string' ? raw.plan : undefined,
    interval: typeof raw.interval === 'string' ? raw.interval : undefined,
  });
  if (
    !parsed.success ||
    parsed.data.plan === undefined ||
    parsed.data.interval === undefined ||
    parsed.data.plan === 'free' ||
    parsed.data.plan === 'team'
  ) {
    return null;
  }
  return { plan: parsed.data.plan, interval: parsed.data.interval };
}

export default async function PortalPage({ searchParams }: PortalPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const planChange = parsePlanChange(await searchParams);

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
      outstandingBalance: {
        amountMinor: snapshot.paymentSummary.outstandingAmountMinor,
        currency: snapshot.paymentSummary.currency,
        formattedAmount: formatMoney({
          amountMinor: snapshot.paymentSummary.outstandingAmountMinor,
          currency: snapshot.paymentSummary.currency,
        }),
      },
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
      planChangeAction={createPlanChangePortalSession}
      planChange={planChange}
    />
  );
}
