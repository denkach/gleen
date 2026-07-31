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

function schedule(overrides = {}) {
  const boundary = eventCreated + 2_678_400;
  return {
    id: 'sub_sched_1',
    object: 'subscription_schedule',
    customer: 'cus_1',
    status: 'active',
    current_phase: {
      start_date: eventCreated,
      end_date: boundary,
    },
    subscription: 'sub_1',
    released_subscription: null,
    metadata: {
      gleen_owner: 'den-20',
      gleen_subscription_id: 'sub_1',
    },
    phases: [
      {
        start_date: eventCreated,
        end_date: boundary,
        items: [{ price: 'price_prismmonth', quantity: 1 }],
      },
      {
        start_date: boundary,
        end_date: boundary + 2_678_400,
        items: [{ price: 'price_startermonth', quantity: 1 }],
      },
    ],
    ...overrides,
  };
}

function dependencies(verifiedEvent: unknown): StripeWebhookDependencies & {
  repository: StripeWebhookDependencies['repository'] & {
    claimWebhookEvent: ReturnType<typeof vi.fn>;
    applySubscription: ReturnType<typeof vi.fn>;
    applyScheduledChange: ReturnType<typeof vi.fn>;
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
      applyScheduledChange: vi.fn().mockResolvedValue(undefined),
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
      event('subscription_schedule.updated', schedule()),
    );
    deps.repository.claimWebhookEvent.mockResolvedValue('duplicate');

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'duplicate',
    });
    expect(deps.repository.applySubscription).not.toHaveBeenCalled();
    expect(deps.repository.applyScheduledChange).not.toHaveBeenCalled();
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

  it('projects an owned schedule future phase from its server-resolved Price', async () => {
    const deps = dependencies(
      event('subscription_schedule.updated', schedule()),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'processed',
    });
    expect(deps.repository.resolveWebhookUserId).toHaveBeenCalledWith('cus_1');
    expect(deps.repository.resolveWebhookPrice).toHaveBeenCalledWith(
      'price_startermonth',
    );
    expect(deps.repository.applyScheduledChange).toHaveBeenCalledWith({
      eventId: 'evt_1',
      eventCreatedAt,
      userId,
      externalSubscriptionId: 'sub_1',
      externalScheduleId: 'sub_sched_1',
      scheduledPlanSlug: 'starter',
      scheduledChangeAt: new Date(
        (eventCreated + 2_678_400) * 1_000,
      ).toISOString(),
    });
    expect(deps.repository.applySubscription).not.toHaveBeenCalled();
  });

  it.each([
    ['subscription_schedule.released', 'released', null, 'sub_1'],
    ['subscription_schedule.canceled', 'canceled', 'sub_1', null],
    ['subscription_schedule.completed', 'completed', null, null],
  ] as const)(
    'clears the matching projection for %s',
    async (type, status, subscriptionId, releasedSubscriptionId) => {
      const deps = dependencies(
        event(
          type,
          schedule({
            status,
            current_phase: null,
            phases: [],
            subscription: subscriptionId,
            released_subscription: releasedSubscriptionId,
          }),
        ),
      );

      await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
        ok: true,
        status: 'processed',
      });
      expect(deps.repository.applyScheduledChange).toHaveBeenCalledWith({
        eventId: 'evt_1',
        eventCreatedAt,
        userId,
        externalSubscriptionId: 'sub_1',
        externalScheduleId: 'sub_sched_1',
        scheduledPlanSlug: null,
        scheduledChangeAt: null,
      });
      expect(deps.repository.resolveWebhookPrice).not.toHaveBeenCalled();
    },
  );

  it('clears a terminal owned schedule even when delivered as an updated event', async () => {
    const deps = dependencies(
      event(
        'subscription_schedule.updated',
        schedule({
          status: 'released',
          current_phase: null,
          phases: [],
          subscription: null,
          released_subscription: 'sub_1',
        }),
      ),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'processed',
    });
    expect(deps.repository.applyScheduledChange).toHaveBeenCalledWith(
      expect.objectContaining({
        externalScheduleId: 'sub_sched_1',
        scheduledPlanSlug: null,
        scheduledChangeAt: null,
      }),
    );
  });

  it('records an incomplete bootstrap created event as unsupported', async () => {
    const deps = dependencies(
      event(
        'subscription_schedule.created',
        schedule({
          metadata: {},
          phases: [
            {
              start_date: eventCreated,
              end_date: eventCreated + 2_678_400,
              items: [{ price: 'price_prismmonth', quantity: 1 }],
            },
          ],
        }),
      ),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'unsupported',
    });
    expect(deps.repository.applyScheduledChange).not.toHaveBeenCalled();
    expect(deps.repository.markWebhookProcessed).toHaveBeenCalledWith('evt_1');
  });

  it('does not adopt a schedule owned by another integration', async () => {
    const deps = dependencies(
      event(
        'subscription_schedule.updated',
        schedule({
          metadata: {
            gleen_owner: 'another-integration',
            gleen_subscription_id: 'sub_1',
          },
        }),
      ),
    );

    await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
      ok: true,
      status: 'unsupported',
    });
    expect(deps.repository.resolveWebhookUserId).not.toHaveBeenCalled();
    expect(deps.repository.applyScheduledChange).not.toHaveBeenCalled();
  });

  it.each([
    [
      'unknown_price',
      schedule({
        phases: [
          {
            start_date: eventCreated,
            end_date: eventCreated + 2_678_400,
            items: [{ price: 'price_prismmonth', quantity: 1 }],
          },
          {
            start_date: eventCreated + 2_678_400,
            end_date: eventCreated + 5_356_800,
            items: [{ price: 'price_unknown', quantity: 1 }],
          },
        ],
      }),
    ],
    [
      'malformed_event',
      schedule({
        phases: [
          {
            start_date: eventCreated,
            end_date: eventCreated + 2_678_400,
            items: [{ price: 'price_prismmonth', quantity: 1 }],
          },
          {
            start_date: eventCreated + 2_678_400,
            end_date: eventCreated + 5_356_800,
            items: [
              { price: 'price_startermonth', quantity: 1 },
              { price: 'price_prismmonth', quantity: 1 },
            ],
          },
        ],
      }),
    ],
  ] as const)(
    'fails an owned malformed schedule with controlled code %s',
    async (code, object) => {
      const deps = dependencies(event('subscription_schedule.updated', object));
      if (code === 'unknown_price') {
        deps.repository.resolveWebhookPrice.mockResolvedValue(null);
      }

      await expect(processStripeWebhook('{}', 'sig_1', deps)).resolves.toEqual({
        ok: false,
        code,
        retryable: false,
      });
      expect(deps.repository.applyScheduledChange).not.toHaveBeenCalled();
      expect(deps.repository.markWebhookFailed).toHaveBeenCalledWith(
        'evt_1',
        code,
      );
    },
  );

  it('passes older schedule events to the independently ordered repository', async () => {
    const deps = dependencies(
      event('subscription_schedule.updated', schedule()),
    );

    await processStripeWebhook('{}', 'sig_1', deps);
    vi.mocked(deps.stripe.webhooks.constructEvent).mockReturnValue(
      event('subscription_schedule.updated', schedule(), {
        id: 'evt_older',
        created: eventCreated - 60,
      }),
    );
    await processStripeWebhook('{}', 'sig_2', deps);

    expect(deps.repository.applyScheduledChange).toHaveBeenLastCalledWith(
      expect.objectContaining({
        eventId: 'evt_older',
        eventCreatedAt: '2026-07-29T23:59:00.000Z',
      }),
    );
    expect(deps.repository.applyScheduledChange).toHaveBeenCalledTimes(2);
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

  describe('subscription cancellation projection', () => {
    it('keeps an active subscription without cancellation unscheduled', async () => {
      const deps = dependencies(
        event('customer.subscription.updated', subscription()),
      );

      await processStripeWebhook('{}', 'sig_1', deps);

      expect(deps.repository.applySubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelAtPeriodEnd: false,
          cancellationEffectiveAt: null,
        }),
      );
    });

    it('projects Stripe explicit future cancel_at as a scheduled cancellation', async () => {
      const deps = dependencies(
        event(
          'customer.subscription.updated',
          subscription({
            cancel_at_period_end: false,
            cancel_at: eventCreated + 2_678_400,
          }),
        ),
      );

      await processStripeWebhook('{}', 'sig_1', deps);

      expect(deps.repository.applySubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelAtPeriodEnd: true,
          cancellationEffectiveAt: new Date(
            (eventCreated + 2_678_400) * 1_000,
          ).toISOString(),
        }),
      );
    });

    it('projects completed cancellation without marking it as scheduled', async () => {
      const deps = dependencies(
        event(
          'customer.subscription.deleted',
          subscription({
            status: 'canceled',
            ended_at: eventCreated + 60,
            canceled_at: eventCreated + 30,
          }),
        ),
      );

      await processStripeWebhook('{}', 'sig_1', deps);

      expect(deps.repository.applySubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          cancelAtPeriodEnd: false,
          cancellationEffectiveAt: new Date(
            (eventCreated + 60) * 1_000,
          ).toISOString(),
        }),
      );
    });
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
    expect(deps.repository.applyScheduledChange).not.toHaveBeenCalled();
    expect(deps.repository.applyInvoice).not.toHaveBeenCalled();
    expect(deps.repository.markWebhookProcessed).toHaveBeenCalledWith('evt_1');
  });
});
