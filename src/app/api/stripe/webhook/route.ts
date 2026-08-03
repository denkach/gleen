import { validateStripeServerEnv } from '@/env';
import {
  createStripeWebhookPost,
  type StripeWebhookDependencies,
} from '@/lib/billing/webhook';
import {
  createSupabaseBillingProjectionRepository,
  type SupabaseBillingAdminClient,
} from '@/lib/billing/supabase-projection-repository';
import { createStripeClient } from '@/lib/billing/stripe';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

function productionDependencies(): StripeWebhookDependencies {
  const stripe = createStripeClient();
  const environment = validateStripeServerEnv(process.env);
  return {
    stripe,
    webhookSecret: environment.STRIPE_WEBHOOK_SECRET,
    repository: createSupabaseBillingProjectionRepository(
      createAdminSupabaseClient() as unknown as SupabaseBillingAdminClient,
    ),
  };
}

export const POST = createStripeWebhookPost(productionDependencies);
