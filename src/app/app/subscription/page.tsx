import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { SubscriptionScreen } from '@/components/billing/subscription-screen';
import { getPaymentMethodSummary } from '@/lib/billing/actions';
import {
  billingIntervalSchema,
  type BillingPaymentMethod,
} from '@/lib/billing/domain';
import { toSubscriptionPresentation } from '@/lib/billing/presentation';
import type { SubscriptionPresentation } from '@/lib/billing/presentation';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { billingMessages } from '@/lib/i18n/messages/billing';
import { getRequestLocale } from '@/lib/i18n/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return { title: billingMessages[locale].metadata.subscription };
}

const subscriptionQuerySchema = z
  .object({
    period: billingIntervalSchema.default('month'),
  })
  .strict();

type SubscriptionPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function parsePeriod(raw: Record<string, string | string[] | undefined>) {
  const result = subscriptionQuerySchema.safeParse({
    period: typeof raw.period === 'string' ? raw.period : undefined,
  });
  return result.success ? result.data.period : 'month';
}

async function resolvePaymentMethod(
  paymentResultPromise: ReturnType<typeof getPaymentMethodSummary>,
): Promise<BillingPaymentMethod> {
  try {
    const paymentResult = await paymentResultPromise;
    if (paymentResult.ok) return paymentResult.paymentMethod;
  } catch {
    // The subscription snapshot remains usable when Stripe is unavailable.
  }

  console.error({
    event: 'billing_subscription_payment_method_unavailable',
    route: '/app/subscription',
  });
  return { status: 'unavailable' };
}

export default async function SubscriptionPage({
  searchParams,
}: SubscriptionPageProps) {
  const locale = await getRequestLocale();
  const copy = billingMessages[locale];
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const interval = parsePeriod(await searchParams);
  const repository = createSupabaseBillingRepository(
    supabase as unknown as SupabaseBillingClient,
  );

  let presentation: SubscriptionPresentation | null = null;
  const snapshotPromise = repository.getOwnedSnapshot(user.id);
  const paymentMethodPromise = resolvePaymentMethod(getPaymentMethodSummary());
  try {
    const [snapshot, paymentMethod] = await Promise.all([
      snapshotPromise,
      paymentMethodPromise,
    ]);

    presentation = toSubscriptionPresentation(snapshot, {
      locale,
      copy,
      paymentMethod,
    });
  } catch {
    console.error({
      event: 'billing_subscription_snapshot_unavailable',
      route: '/app/subscription',
    });
  }

  return (
    <SubscriptionScreen
      presentation={presentation}
      initialInterval={interval}
      copySource={{ kind: 'catalog', locale }}
    />
  );
}
