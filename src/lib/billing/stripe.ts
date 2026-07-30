import 'server-only';

import Stripe from 'stripe';

import { validateStripeServerEnv } from '@/env';

let stripeClient: Stripe | null = null;

export function createStripeClient(
  environment: Readonly<Partial<NodeJS.ProcessEnv>> = process.env,
): Stripe {
  if (stripeClient !== null) return stripeClient;
  const { STRIPE_SECRET_KEY } = validateStripeServerEnv(environment);
  stripeClient = new Stripe(STRIPE_SECRET_KEY);
  return stripeClient;
}
