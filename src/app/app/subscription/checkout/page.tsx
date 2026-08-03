import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { CheckoutExperience } from '@/components/billing/checkout-experience';
import {
  createCheckoutSession,
  getCheckoutConfirmation,
} from '@/lib/billing/actions';
import {
  billingIntervalSchema,
  billingPlanSlugSchema,
} from '@/lib/billing/domain';
import { toCheckoutPresentation } from '@/lib/billing/presentation';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { validateStripePublicEnv } from '@/env';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Checkout — Gleen',
};

const checkoutQuerySchema = z
  .object({
    plan: billingPlanSlugSchema.optional(),
    interval: billingIntervalSchema.optional(),
    sessionId: z
      .string()
      .regex(/^cs_[A-Za-z0-9_]+$/)
      .nullable(),
  })
  .strict();

type CheckoutPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function parseCheckoutQuery(
  raw: Record<string, string | string[] | undefined>,
) {
  const parsed = checkoutQuerySchema.safeParse({
    plan: typeof raw.plan === 'string' ? raw.plan : undefined,
    interval: typeof raw.interval === 'string' ? raw.interval : undefined,
    sessionId: typeof raw.session_id === 'string' ? raw.session_id : null,
  });
  return parsed.success
    ? parsed.data
    : { plan: undefined, interval: undefined, sessionId: null };
}

export default async function CheckoutPage({
  searchParams,
}: CheckoutPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const query = parseCheckoutQuery(await searchParams);
  const repository = createSupabaseBillingRepository(
    supabase as unknown as SupabaseBillingClient,
  );
  const snapshot = await repository.getOwnedSnapshot(user.id);
  const selected =
    snapshot.availablePlans.find(
      ({ plan }) => plan.slug === query.plan && plan.purchasable,
    ) ??
    snapshot.availablePlans.find(({ plan }) => plan.purchasable) ??
    null;
  if (selected === null) redirect('/app/subscription');
  const selectedPrice =
    selected.prices.find((price) => price.interval === query.interval) ??
    selected.prices[0] ??
    null;
  if (selectedPrice === null) redirect('/app/subscription');

  const presentation = toCheckoutPresentation(selected.plan, selectedPrice);
  const prices = selected.prices.map(
    (price) => toCheckoutPresentation(selected.plan, price).price,
  );
  const { NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY } = validateStripePublicEnv(
    process.env,
  );

  return (
    <CheckoutExperience
      presentation={presentation}
      prices={prices}
      publishableKey={NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY}
      sessionId={query.sessionId}
      createCheckout={createCheckoutSession}
      getConfirmation={getCheckoutConfirmation}
    />
  );
}
