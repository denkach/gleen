import { describe, expect, it, vi } from 'vitest';

import {
  processStripeWebhook,
  type StripeWebhookDependencies,
} from './webhook';

const eventCreated = 1_785_369_600;
const eventCreatedAt = '2026-07-30T00:00:00.000Z';
const userId = '5c5583a7-131b-4c05-b76a-7a4835dba8df';

function event(type: string, object: unknown, overrides = {}) {
  return {
    id: 'evt_1',
    object: 'event',
    created: eventCreated,
    type,
    data: { object },
    ...overrides,
  };
}

function subscription(overrides = {}) {
  return {
    id: 'sub_1',
    object: 'subscription',
    customer: 'cus_1',
    status: 'active',
    items: {
      data: [
        {
          price: { id: 'price_startermonth', object: 'price' },
          current_period_start: eventCreated,
          current_period_end: eventCreated + 2_678_400,
        },
      ],
    },
    trial_end: null,
    cancel_at_period_end: false,
    cancel_at: null,
    ...overrides,
  };
}

function invoice(overrides = {}) {
  return {
    id: 'in_1',
    object: 'invoice',
    customer: 'cus_1',
    parent: {
      type: 'subscription_details',
      subscription_details: { subscription: 'sub_1' },
    },
    lines: {
      data: [
        {
          pricing: {
            type: 'price_details',
            price_details: { price: 'price_startermonth' },
          },
        },
      ],
    },
    number: 'INV-1',
    amount_due: 1_900,
    amount_paid: 1_900,
    currency: 'usd',
    status: 'paid',
    created: eventCreated,
    due_date: null,
    status_transitions: { paid_at: eventCreated + 60 },
    hosted_invoice_url: 'https://invoice.stripe.test/in_1',
    invoice_pdf: 'https://invoice.stripe.test/in_1.pdf',
    ...overrides,
  };
}

function dependencies(verifiedEvent: unknown): StripeWebhookDependencies & {
  repository: StripeWebhookDependencies['repository'] & {
    claimWebhookEvent: ReturnType<typeof vi.fn>;
    applySubscription: ReturnType<typeof vi.fn>;
    applyInvoice: ReturnType<typeof vi.fn>;
    markWebhookProcessed: ReturnType<typeof vi.fn>;
    markWebhookFailed: ReturnType<typeof vi.fn>;
    resolveWebhookUserId: ReturnType<typeof vi.fn>;
    resolveWebhookPrice: ReturnType<typeof vi.fn>;
  };
} {
  return {
    webhookSecret: 'whsec_test',
    stripe: {
      webhooks: {
        constructEvent: vi.fn().mockReturnValue(verifiedEvent),
      },
      invoicePayments: {
        list: vi.fn().mockResolvedValue({ data: [] }),
      },
      invoices: {
        retrieve: vi.fn(),
      },
    },
    repository: {
      claimWebhookEvent: vi.fn().mockResolvedValue('claimed'),
      applySubscription: vi.fn().mockResolvedValue(undefined),
      applyInvoice: vi.fn().mockResolvedValue(undefined),
      markWebhookProcessed: vi.fn().mockResolvedValue(undefined),
      markWebhookFailed: vi.fn().mockResolvedValue(undefined),
      resolveWebhookUserId: vi.fn().mockResolvedValue(userId),
      resolveWebhookPrice: vi.fn().mockResolvedValue({
        stripePriceId: 'price_startermonth',
        planSlug: 'starter',
        interval: 'month',
      }),
    },
  };
}

describe('processStripeWebhook', () => {
  it('rejects a missing or invalid signature before claiming an event', async () => {
    const missing = dependencies(
      event('customer.subscription.updated', subscription()),
    );
    const invalid = dependencies(
      event('customer.subscription.updated', subscription()),
    );
    vi.mocked(invalid.stripe.webhooks.constructEvent).mockImplementation(() => {
      throw new Error('bad signature');
    });

    await expect(processStripeWebhook('{}', null, missing)).resolves.toEqual({
      ok: false,
      code: 'invalid_signature',
      retryable: false,
    });
    await expect(
      processStripeWebhook('{}', 'sig_bad', invalid),
    ).resolves.toEqual({
      ok: false,
      code: 'invalid_signature',
      retryable: false,
    });
    expect(missing.stripe.webhooks.constructEvent).not.toHaveBeenCalled();
    expect(missing.repository.claimWebhookEvent).not.toHaveBeenCalled();
    expect(invalid.repository.claimWebhookEvent).not.toHaveBeenCalled();
  });

  it('verifies the exact raw body and claims the verified event envelope', async () => {
    const deps = dependencies(
      event('customer.subscription.updated', subscription()),
    );

    await processStripeWebhook(' {"id":"evt_1"}\n', 'sig_1', deps);

    expect(deps.stripe.webhooks.constructEvent).toHaveBeenCalledWith(
      ' {"id":"evt_1"}\n',
      'sig_1',
      'whsec_test',
    );
    expect(deps.repository.claimWebhookEvent).toHaveBeenCalledWith({
      eventId: 'evt_1',
      type: 'customer.subscription.updated',
      createdAt: eventCreatedAt,
    });
  });

  it('acknowledges a duplicate without a second projection', async () => {
    const deps = dependencies(
      event('customer.subscription.updated', subscription()),
    );
    deps.repository.claimWebhookEvent.mockResolvedValue('duplicate');

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'duplicate',
    });
    expect(deps.repository.applySubscription).not.toHaveBeenCalled();
    expect(deps.repository.applyInvoice).not.toHaveBeenCalled();
    expect(deps.repository.markWebhookProcessed).not.toHaveBeenCalled();
  });

  it('passes event creation time so an older subscription update cannot overwrite a newer projection', async () => {
    let latest = '';
    const deps = dependencies(
      event('customer.subscription.updated', subscription()),
    );
    deps.repository.applySubscription.mockImplementation(
      async (projection: { eventCreatedAt: string }) => {
        if (projection.eventCreatedAt >= latest)
          latest = projection.eventCreatedAt;
      },
    );

    await processStripeWebhook('{}', 'sig_1', deps);
    vi.mocked(deps.stripe.webhooks.constructEvent).mockReturnValue(
      event('customer.subscription.updated', subscription(), {
        id: 'evt_older',
        created: eventCreated - 60,
      }),
    );
    await processStripeWebhook('{}', 'sig_2', deps);

    expect(latest).toBe(eventCreatedAt);
    expect(deps.repository.applySubscription).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventId: 'evt_older',
        eventCreatedAt: '2026-07-29T23:59:00.000Z',
      }),
    );
  });

  it('carries the exact verified Stripe Price ID into subscription projection', async () => {
    const deps = dependencies(
      event('customer.subscription.updated', subscription()),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'processed',
    });
    expect(deps.repository.applySubscription).toHaveBeenCalledWith(
      expect.objectContaining({
        externalPriceId: 'price_startermonth',
        planSlug: 'starter',
        interval: 'month',
      }),
    );
  });

  it('classifies a verified malformed envelope separately from signature failure', async () => {
    const deps = dependencies({
      id: 'evt_1',
      object: 'event',
      created: 'not-a-timestamp',
      type: 'invoice.updated',
      data: { object: invoice() },
    });

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: false,
      code: 'malformed_event',
      retryable: false,
    });
    expect(deps.repository.claimWebhookEvent).not.toHaveBeenCalled();
  });

  it('rejects a malformed subscription object ID before ownership resolution', async () => {
    const deps = dependencies(
      event(
        'customer.subscription.updated',
        subscription({ id: 'sub_bad_id' }),
      ),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: false,
      code: 'malformed_event',
      retryable: false,
    });
    expect(deps.repository.resolveWebhookUserId).not.toHaveBeenCalled();
    expect(deps.repository.resolveWebhookPrice).not.toHaveBeenCalled();
    expect(deps.repository.applySubscription).not.toHaveBeenCalled();
  });

  it('rejects a malformed invoice object ID before ownership resolution', async () => {
    const deps = dependencies(
      event('invoice.updated', invoice({ id: 'in_bad_id' })),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: false,
      code: 'malformed_event',
      retryable: false,
    });
    expect(deps.repository.resolveWebhookUserId).not.toHaveBeenCalled();
    expect(deps.repository.resolveWebhookPrice).not.toHaveBeenCalled();
    expect(deps.repository.applyInvoice).not.toHaveBeenCalled();
  });

  it.each([
    ['invoice.paid', 'paid', eventCreated + 60],
    ['invoice.payment_failed', 'failed', null],
    ['invoice.updated', 'open', null],
  ] as const)(
    'maps %s into a controlled invoice projection',
    async (type, expectedStatus, paidAt) => {
      const object =
        type === 'invoice.payment_failed'
          ? invoice({
              status: 'open',
              amount_paid: 0,
              status_transitions: { paid_at: null },
            })
          : type === 'invoice.updated'
            ? invoice({
                status: 'open',
                amount_paid: 0,
                status_transitions: { paid_at: null },
              })
            : invoice();
      const deps = dependencies(event(type, object));

      await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
        ok: true,
        status: 'processed',
      });
      expect(deps.repository.applyInvoice).toHaveBeenCalledWith({
        eventId: 'evt_1',
        eventCreatedAt,
        userId,
        externalInvoiceId: 'in_1',
        externalSubscriptionId: 'sub_1',
        number: 'INV-1',
        planSlug: 'starter',
        interval: 'month',
        amountDueMinor: 1_900,
        amountPaidMinor: type === 'invoice.paid' ? 1_900 : 0,
        currency: 'usd',
        status: expectedStatus,
        createdAt: eventCreatedAt,
        dueAt: null,
        paidAt: paidAt === null ? null : new Date(paidAt * 1_000).toISOString(),
        hostedUrl: 'https://invoice.stripe.test/in_1',
        pdfUrl: 'https://invoice.stripe.test/in_1.pdf',
        refundStatus: 'none',
        refundedAmountMinor: 0,
        advancePaidThrough: type === 'invoice.paid',
      });
      expect(deps.repository.markWebhookProcessed).toHaveBeenCalledWith(
        'evt_1',
      );
    },
  );

  it('ignores non-Price invoice lines while requiring one controlled Price mapping', async () => {
    const deps = dependencies(
      event(
        'invoice.updated',
        invoice({
          status: 'open',
          amount_paid: 0,
          status_transitions: { paid_at: null },
          lines: {
            data: [
              { pricing: null },
              {
                pricing: {
                  type: 'price_details',
                  price_details: { price: 'price_startermonth' },
                },
              },
            ],
          },
        }),
      ),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'processed',
    });
    expect(deps.repository.applyInvoice).toHaveBeenCalledOnce();
  });

  it('resolves a Clover charge refund through Invoice Payments and maps only controlled invoice fields', async () => {
    const deps = dependencies(
      event('charge.refunded', {
        id: 'ch_1',
        object: 'charge',
        payment_intent: 'pi_1',
        amount: 1_900,
        amount_refunded: 500,
        refunded: false,
      }),
    );
    vi.mocked(deps.stripe.invoicePayments.list).mockResolvedValue({
      data: [{ invoice: 'in_1' }],
    });
    vi.mocked(deps.stripe.invoices.retrieve).mockResolvedValue(
      invoice({
        amount_paid: 1_900,
      }),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'processed',
    });
    expect(deps.stripe.invoicePayments.list).toHaveBeenCalledWith({
      payment: { type: 'payment_intent', payment_intent: 'pi_1' },
      limit: 2,
    });
    expect(deps.stripe.invoices.retrieve).toHaveBeenCalledWith('in_1');
    expect(deps.repository.applyInvoice).toHaveBeenCalledWith(
      expect.objectContaining({
        externalInvoiceId: 'in_1',
        refundStatus: 'partial',
        refundedAmountMinor: 500,
        advancePaidThrough: false,
      }),
    );
  });

  it.each([
    [
      'unknown_price',
      event(
        'customer.subscription.updated',
        subscription({
          items: {
            data: [
              {
                price: { id: 'price_unknown', object: 'price' },
                current_period_start: eventCreated,
                current_period_end: eventCreated + 2_678_400,
              },
            ],
          },
        }),
      ),
    ],
    [
      'malformed_event',
      event(
        'customer.subscription.updated',
        subscription({ customer: { deleted: true, id: 'cus_deleted' } }),
      ),
    ],
    [
      'malformed_event',
      event(
        'customer.subscription.updated',
        subscription({ customer: 'cus_bad_id' }),
      ),
    ],
    [
      'malformed_event',
      event(
        'customer.subscription.updated',
        subscription({
          customer: { id: 'cus_1', object: 'price' },
        }),
      ),
    ],
    [
      'malformed_event',
      event(
        'customer.subscription.updated',
        subscription({
          items: {
            data: [
              {
                price: {
                  id: 'price_startermonth',
                  object: 'customer',
                },
                current_period_start: eventCreated,
                current_period_end: eventCreated + 2_678_400,
              },
            ],
          },
        }),
      ),
    ],
    [
      'malformed_event',
      event('invoice.updated', invoice({ lines: { data: [] } })),
    ],
    [
      'malformed_event',
      event('charge.refunded', {
        id: 'ch_1',
        object: 'charge',
        payment_intent: null,
        amount: 1_900,
        amount_refunded: 500,
      }),
    ],
  ] as const)(
    'fails closed with controlled code %s for missing or malformed Stripe IDs/expansions',
    async (code, verifiedEvent) => {
      const deps = dependencies(verifiedEvent);
      if (code === 'unknown_price') {
        deps.repository.resolveWebhookPrice.mockResolvedValue(null);
      }

      await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
        ok: false,
        code,
        retryable: false,
      });
      expect(deps.repository.applySubscription).not.toHaveBeenCalled();
      expect(deps.repository.applyInvoice).not.toHaveBeenCalled();
      expect(deps.repository.markWebhookFailed).toHaveBeenCalledWith(
        'evt_1',
        code,
      );
    },
  );

  it('returns a retryable controlled failure when the repository projection fails', async () => {
    const deps = dependencies(event('invoice.paid', invoice()));
    deps.repository.applyInvoice.mockRejectedValue(new Error('db unavailable'));

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: false,
      code: 'repository_failure',
      retryable: true,
    });
    expect(deps.repository.markWebhookFailed).toHaveBeenCalledWith(
      'evt_1',
      'repository_failure',
    );
  });

  it('durably processes unsupported event types without changing entitlement', async () => {
    const deps = dependencies(event('customer.created', { id: 'cus_1' }));

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'unsupported',
    });
    expect(deps.repository.applySubscription).not.toHaveBeenCalled();
    expect(deps.repository.applyInvoice).not.toHaveBeenCalled();
    expect(deps.repository.markWebhookProcessed).toHaveBeenCalledWith('evt_1');
  });
});
