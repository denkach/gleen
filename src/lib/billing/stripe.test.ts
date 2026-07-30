import { beforeEach, describe, expect, it, vi } from 'vitest';

const stripeConstructor = vi.hoisted(() =>
  vi.fn(function StripeClient(this: { kind?: string }) {
    this.kind = 'stripe';
  }),
);

vi.mock('stripe', () => ({ default: stripeConstructor }));

describe('createStripeClient', () => {
  beforeEach(() => {
    vi.resetModules();
    stripeConstructor.mockClear();
  });

  it('validates server configuration lazily and initializes Stripe once without API-version skew', async () => {
    const { createStripeClient } = await import('./stripe');
    const environment = {
      STRIPE_SECRET_KEY: '  sk_test_server  ',
      STRIPE_WEBHOOK_SECRET: '  whsec_server  ',
    };

    const first = createStripeClient(environment);
    const second = createStripeClient(environment);

    expect(first).toBe(second);
    expect(stripeConstructor).toHaveBeenCalledOnce();
    expect(stripeConstructor).toHaveBeenCalledWith('sk_test_server');
  });

  it('does not initialize Stripe when required server configuration is absent', async () => {
    const { createStripeClient } = await import('./stripe');

    expect(() => createStripeClient({})).toThrow(
      'STRIPE_SECRET_KEY is required',
    );
    expect(stripeConstructor).not.toHaveBeenCalled();
  });
});
