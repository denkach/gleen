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

export const metadata: Metadata = {
  title: 'Subscription — Gleen',
};

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

export default async function SubscriptionPage({
  searchParams,
}: SubscriptionPageProps) {
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
  try {
    const [snapshot, paymentResult] = await Promise.all([
      repository.getOwnedSnapshot(user.id),
      getPaymentMethodSummary(),
    ]);
    const paymentMethod: BillingPaymentMethod = paymentResult.ok
      ? paymentResult.paymentMethod
      : { status: 'unavailable' };

    presentation = toSubscriptionPresentation(snapshot, { paymentMethod });
  } catch {
    // The screen keeps navigation available and renders its explicit error state.
  }

  return (
    <SubscriptionScreen
      presentation={presentation}
      initialInterval={interval}
    />
  );
}
