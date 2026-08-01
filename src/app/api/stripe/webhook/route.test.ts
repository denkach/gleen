import { describe, expect, it, vi } from 'vitest';

import { createStripeWebhookPost } from '@/lib/billing/webhook';

function routeDependencies() {
  const constructEvent = vi.fn().mockReturnValue({
    id: 'evt_1',
    object: 'event',
    created: 1_785_369_600,
    type: 'customer.created',
    data: { object: { id: 'cus_1', object: 'customer' } },
  });
  return {
    constructEvent,
    dependencies: {
      webhookSecret: 'whsec_test',
      stripe: {
        webhooks: { constructEvent },
        invoicePayments: { list: vi.fn() },
        invoices: { retrieve: vi.fn() },
        subscriptions: { retrieve: vi.fn() },
      },
      repository: {
        claimWebhookEvent: vi.fn().mockResolvedValue('claimed'),
        applySubscription: vi.fn(),
        applyScheduledChange: vi.fn(),
        applyInvoice: vi.fn(),
        markWebhookProcessed: vi.fn().mockResolvedValue(undefined),
        markWebhookFailed: vi.fn(),
        resolveWebhookUserId: vi.fn(),
        resolveWebhookPrice: vi.fn(),
      },
    },
  };
}

describe('Stripe webhook route', () => {
  it('reads request.text exactly once and verifies the unchanged raw body', async () => {
    const { constructEvent, dependencies } = routeDependencies();
    const POST = createStripeWebhookPost(() => dependencies);
    const request = new Request('http://localhost/api/stripe/webhook', {
      method: 'POST',
      headers: { 'stripe-signature': 'sig' },
      body: '{"id":"evt_1"}',
    });
    const text = vi.spyOn(request, 'text');

    const response = await POST(request);

    expect(response.status).toBe(200);
    expect(text).toHaveBeenCalledOnce();
    expect(constructEvent).toHaveBeenCalledWith(
      '{"id":"evt_1"}',
      'sig',
      'whsec_test',
    );
  });

  it.each([
    [null, false, 400],
    ['sig', true, 400],
  ] as const)(
    'returns 400 for a missing or invalid signature',
    async (signature, throws, expectedStatus) => {
      const { dependencies } = routeDependencies();
      if (throws) {
        dependencies.stripe.webhooks.constructEvent.mockImplementation(() => {
          throw new Error('invalid');
        });
      }
      const dependencyFactory = vi.fn(() => dependencies);
      const POST = createStripeWebhookPost(dependencyFactory);
      const headers = new Headers();
      if (signature !== null) headers.set('stripe-signature', signature);

      const response = await POST(
        new Request('http://localhost/api/stripe/webhook', {
          method: 'POST',
          headers,
          body: '{}',
        }),
      );

      expect(response.status).toBe(expectedStatus);
      await expect(response.json()).resolves.toEqual({
        ok: false,
        code: 'invalid_signature',
      });
      if (signature === null) expect(dependencyFactory).not.toHaveBeenCalled();
    },
  );

  it('returns 200 for a permanent controlled failure so Stripe does not retry it', async () => {
    const { dependencies } = routeDependencies();
    dependencies.stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_1',
      object: 'event',
      created: 1_785_369_600,
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_1',
          object: 'subscription',
          customer: 'cus_1',
          status: 'active',
          items: {
            data: [
              {
                price: { id: 'price_unknown', object: 'price' },
                current_period_start: 1_785_369_600,
                current_period_end: 1_788_048_000,
              },
            ],
          },
          trial_end: null,
          cancel_at_period_end: false,
          cancel_at: null,
        },
      },
    });
    dependencies.repository.resolveWebhookUserId.mockResolvedValue(userId);
    dependencies.repository.resolveWebhookPrice.mockResolvedValue(null);
    dependencies.repository.markWebhookFailed.mockResolvedValue(undefined);
    const POST = createStripeWebhookPost(() => dependencies);

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: 'unknown_price',
    });
  });

  it('returns 503 for a transient repository failure so Stripe retries', async () => {
    const { dependencies } = routeDependencies();
    dependencies.repository.claimWebhookEvent.mockRejectedValue(
      new Error('db unavailable'),
    );
    const POST = createStripeWebhookPost(() => dependencies);

    const response = await POST(
      new Request('http://localhost/api/stripe/webhook', {
        method: 'POST',
        headers: { 'stripe-signature': 'sig' },
        body: '{}',
      }),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({
      ok: false,
      code: 'repository_failure',
    });
  });
});

const userId = '5c5583a7-131b-4c05-b76a-7a4835dba8df';
