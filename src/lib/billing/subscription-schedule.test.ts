import { describe, expect, it, vi } from 'vitest';
import type Stripe from 'stripe';

import type { BillingInterval, BillingPlanSlug } from './domain';
import {
  releaseOwnedDowngrade,
  scheduleOwnedDowngrade,
  SubscriptionScheduleConflictError,
  type OwnedSingleItemSubscription,
  type SubscriptionScheduleStripeClient,
} from './subscription-schedule';

const periodStart = 1782864000;
const periodEnd = 1785542400;

function subscription(
  schedule: OwnedSingleItemSubscription['schedule'] = null,
): OwnedSingleItemSubscription {
  return {
    id: 'sub_owned',
    schedule,
    items: {
      data: [
        {
          id: 'si_owned',
          price: { id: 'price_prism_month' } as Stripe.Price,
          quantity: 1,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        },
      ],
    },
  };
}

function phase(
  overrides: Partial<Stripe.SubscriptionSchedule.Phase> = {},
): Stripe.SubscriptionSchedule.Phase {
  return {
    add_invoice_items: [],
    application_fee_percent: 2.5,
    automatic_tax: {
      enabled: true,
      disabled_reason: null,
      liability: { type: 'account', account: 'acct_tax' },
    },
    billing_cycle_anchor: 'automatic',
    billing_thresholds: {
      amount_gte: 5000,
      reset_billing_cycle_anchor: false,
    },
    collection_method: 'charge_automatically',
    currency: 'usd',
    default_payment_method: 'pm_owned',
    default_tax_rates: [{ id: 'txr_default' } as Stripe.TaxRate],
    description: 'Keep current Prism access',
    discounts: [
      {
        discount: { id: 'di_phase' } as Stripe.Discount,
        coupon: null,
        promotion_code: null,
      },
    ],
    end_date: periodEnd,
    invoice_settings: {
      account_tax_ids: [{ id: 'txi_owned' } as Stripe.TaxId],
      days_until_due: null,
      issuer: {
        type: 'account',
        account: { id: 'acct_invoice' } as Stripe.Account,
      },
    },
    items: [
      {
        billing_thresholds: { usage_gte: 10 },
        discounts: [
          {
            coupon: null,
            discount: null,
            promotion_code: { id: 'promo_item' } as Stripe.PromotionCode,
          },
        ],
        metadata: { seat: 'primary' },
        plan: 'price_prism_month',
        price: { id: 'price_prism_month' } as Stripe.Price,
        quantity: 1,
        tax_rates: [{ id: 'txr_item' } as Stripe.TaxRate],
      },
    ],
    metadata: { phase_source: 'stripe' },
    on_behalf_of: { id: 'acct_owned' } as Stripe.Account,
    proration_behavior: 'none',
    start_date: periodStart,
    transfer_data: {
      amount_percent: 10,
      destination: { id: 'acct_destination' } as Stripe.Account,
    },
    trial_end: null,
    ...overrides,
  };
}

function managedTargetPhase(
  targetPriceId = 'price_starter_month',
  targetInterval: BillingInterval = 'month',
): Stripe.SubscriptionSchedule.Phase {
  return phase({
    add_invoice_items: [],
    application_fee_percent: null,
    automatic_tax: undefined,
    billing_cycle_anchor: null,
    billing_thresholds: null,
    collection_method: null,
    default_payment_method: null,
    default_tax_rates: null,
    description: null,
    discounts: [],
    end_date:
      targetInterval === 'month' ? periodEnd + 2678400 : periodEnd + 31536000,
    invoice_settings: null,
    items: [
      {
        billing_thresholds: null,
        discounts: [],
        metadata: null,
        plan: targetPriceId,
        price: { id: targetPriceId } as Stripe.Price,
        quantity: 1,
        tax_rates: null,
      },
    ],
    metadata: null,
    on_behalf_of: null,
    proration_behavior: 'none',
    start_date: periodEnd,
    transfer_data: null,
    trial_end: null,
  });
}

function schedule(
  overrides: Partial<Stripe.SubscriptionSchedule> = {},
): Stripe.SubscriptionSchedule {
  return {
    id: 'sub_sched_owned',
    object: 'subscription_schedule',
    application: null,
    billing_mode: { flexible: null, type: 'classic' },
    canceled_at: null,
    completed_at: null,
    created: periodStart,
    current_phase: { start_date: periodStart, end_date: periodEnd },
    customer: 'cus_owned',
    customer_account: null,
    default_settings: {
      application_fee_percent: null,
      billing_cycle_anchor: 'automatic',
      billing_thresholds: null,
      collection_method: null,
      default_payment_method: null,
      description: null,
      invoice_settings: {
        account_tax_ids: null,
        days_until_due: null,
        issuer: { type: 'self' },
      },
      on_behalf_of: null,
      transfer_data: null,
    },
    end_behavior: 'release',
    livemode: false,
    metadata: {},
    phases: [phase()],
    released_at: null,
    released_subscription: null,
    status: 'active',
    subscription: 'sub_owned',
    test_clock: null,
    ...overrides,
  };
}

function stripeClient(
  currentSchedule: Stripe.SubscriptionSchedule,
  replaySchedule = currentSchedule,
): {
  stripe: SubscriptionScheduleStripeClient;
  create: ReturnType<typeof vi.fn>;
  retrieve: ReturnType<typeof vi.fn>;
  update: ReturnType<typeof vi.fn>;
  release: ReturnType<typeof vi.fn>;
} {
  const create = vi.fn(async () => replaySchedule);
  const retrieve = vi.fn(async () => currentSchedule);
  const update = vi.fn(async () => currentSchedule);
  const release = vi.fn(async () => currentSchedule);

  return {
    stripe: { subscriptionSchedules: { create, retrieve, update, release } },
    create,
    retrieve,
    update,
    release,
  };
}

function scheduleInput(
  stripe: SubscriptionScheduleStripeClient,
  ownedSubscription = subscription(),
  targetPlan: BillingPlanSlug = 'starter',
  targetInterval: BillingInterval = 'month',
) {
  return {
    stripe,
    subscription: ownedSubscription,
    targetPriceId: 'price_starter_month',
    targetPlan,
    targetInterval,
  } as const;
}

describe('scheduleOwnedDowngrade', () => {
  it('creates a bootstrap schedule then preserves the current phase before scheduling the target', async () => {
    const current = schedule();
    const { stripe, create, update } = stripeClient(current);

    await expect(
      scheduleOwnedDowngrade(scheduleInput(stripe)),
    ).resolves.toEqual({
      scheduleId: 'sub_sched_owned',
      targetPlan: 'starter',
      targetInterval: 'month',
      effectiveAt: '2026-08-01T00:00:00.000Z',
    });

    expect(create).toHaveBeenCalledWith(
      { from_subscription: 'sub_owned' },
      { idempotencyKey: 'gleen-den20-schedule:sub_owned:1785542400' },
    );
    expect(update).toHaveBeenCalledOnce();
    const [scheduleId, params, options] = update.mock.calls[0] as [
      string,
      Stripe.SubscriptionScheduleUpdateParams,
      Stripe.RequestOptions,
    ];
    expect(scheduleId).toBe('sub_sched_owned');
    expect(params).toMatchObject({
      end_behavior: 'release',
      proration_behavior: 'none',
      phases: [
        {
          start_date: 1782864000,
          end_date: 1785542400,
          items: [{ price: 'price_prism_month', quantity: 1 }],
          proration_behavior: 'none',
        },
        {
          start_date: 1785542400,
          duration: { interval: 'month', interval_count: 1 },
          items: [{ price: 'price_starter_month', quantity: 1 }],
          proration_behavior: 'none',
        },
      ],
    });
    expect(options.idempotencyKey).toContain(
      'sub_sched_owned:price_starter_month',
    );
  });

  it('serializes supported current-phase settings using Stripe IDs', async () => {
    const { stripe, update } = stripeClient(schedule());

    await scheduleOwnedDowngrade(scheduleInput(stripe));

    const [, params] = update.mock.calls[0] as [
      string,
      Stripe.SubscriptionScheduleUpdateParams,
    ];
    expect(params.phases?.[0]).toMatchObject({
      metadata: { phase_source: 'stripe' },
      automatic_tax: {
        enabled: true,
        liability: { type: 'account', account: 'acct_tax' },
      },
      default_tax_rates: ['txr_default'],
      discounts: [{ discount: 'di_phase' }],
      default_payment_method: 'pm_owned',
      invoice_settings: {
        account_tax_ids: ['txi_owned'],
        issuer: { type: 'account', account: 'acct_invoice' },
      },
      billing_thresholds: {
        amount_gte: 5000,
        reset_billing_cycle_anchor: false,
      },
      application_fee_percent: 2.5,
      on_behalf_of: 'acct_owned',
      transfer_data: { amount_percent: 10, destination: 'acct_destination' },
      items: [
        expect.objectContaining({
          metadata: { seat: 'primary' },
          tax_rates: ['txr_item'],
          discounts: [{ promotion_code: 'promo_item' }],
          billing_thresholds: { usage_gte: 10 },
        }),
      ],
    });
  });

  it('preserves a merchant-defined Coupon ID in the current phase', async () => {
    const current = schedule({
      phases: [
        phase({
          discounts: [
            {
              coupon: 'merchant_coupon_42',
              discount: null,
              promotion_code: null,
            },
          ],
        }),
      ],
    });
    const { stripe, update } = stripeClient(current);

    await scheduleOwnedDowngrade(scheduleInput(stripe));

    const [, params] = update.mock.calls[0] as [
      string,
      Stripe.SubscriptionScheduleUpdateParams,
    ];
    expect(params.phases?.[0]?.discounts).toEqual([
      { coupon: 'merchant_coupon_42' },
    ]);
  });

  it('returns a same-target owned schedule without updating it', async () => {
    const owned = schedule({
      metadata: {
        gleen_owner: 'den-20',
        gleen_subscription_id: 'sub_owned',
        gleen_target_plan: 'starter',
        gleen_target_interval: 'month',
        gleen_effective_at: '2026-08-01T00:00:00.000Z',
        gleen_change_key:
          'gleen-den20-update:sub_sched_owned:price_starter_month:1785542400',
      },
      phases: [phase(), managedTargetPhase()],
    });
    const { stripe, update } = stripeClient(owned);

    await expect(
      scheduleOwnedDowngrade(
        scheduleInput(stripe, subscription('sub_sched_owned')),
      ),
    ).resolves.toMatchObject({ scheduleId: 'sub_sched_owned' });

    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    [
      'has no future target phase',
      schedule({
        metadata: {
          gleen_owner: 'den-20',
          gleen_subscription_id: 'sub_owned',
          gleen_target_plan: 'starter',
          gleen_target_interval: 'month',
          gleen_effective_at: '2026-08-01T00:00:00.000Z',
          gleen_change_key:
            'gleen-den20-update:sub_sched_owned:price_starter_month:1785542400',
        },
      }),
    ],
    [
      'has a future target phase with the wrong Price',
      schedule({
        metadata: {
          gleen_owner: 'den-20',
          gleen_subscription_id: 'sub_owned',
          gleen_target_plan: 'starter',
          gleen_target_interval: 'month',
          gleen_effective_at: '2026-08-01T00:00:00.000Z',
          gleen_change_key:
            'gleen-den20-update:sub_sched_owned:price_starter_month:1785542400',
        },
        phases: [phase(), managedTargetPhase('price_other_month')],
      }),
    ],
    [
      'has an incompatible end behavior',
      schedule({
        end_behavior: 'cancel',
        metadata: {
          gleen_owner: 'den-20',
          gleen_subscription_id: 'sub_owned',
          gleen_target_plan: 'starter',
          gleen_target_interval: 'month',
          gleen_effective_at: '2026-08-01T00:00:00.000Z',
          gleen_change_key:
            'gleen-den20-update:sub_sched_owned:price_starter_month:1785542400',
        },
        phases: [phase(), managedTargetPhase()],
      }),
    ],
  ])('rejects a same-target retry that %s', async (_reason, unsafeSchedule) => {
    const { stripe, update } = stripeClient(unsafeSchedule);

    await expect(
      scheduleOwnedDowngrade(
        scheduleInput(stripe, subscription('sub_sched_owned')),
      ),
    ).rejects.toThrow(SubscriptionScheduleConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it('replaces only the future phase of an owned schedule with a different target', async () => {
    const currentPhase = phase();
    const owned = schedule({
      metadata: {
        gleen_owner: 'den-20',
        gleen_subscription_id: 'sub_owned',
        gleen_target_plan: 'starter',
        gleen_target_interval: 'year',
        gleen_effective_at: '2026-08-01T00:00:00.000Z',
        gleen_change_key:
          'gleen-den20-update:sub_sched_owned:price_starter_year:1785542400',
      },
      phases: [currentPhase, managedTargetPhase('price_starter_year', 'year')],
    });
    const { stripe, update } = stripeClient(owned);

    await scheduleOwnedDowngrade(
      scheduleInput(stripe, subscription('sub_sched_owned')),
    );

    const [, params] = update.mock.calls[0] as [
      string,
      Stripe.SubscriptionScheduleUpdateParams,
    ];
    expect(params.phases?.[0]).toMatchObject({
      start_date: currentPhase.start_date,
      end_date: currentPhase.end_date,
      items: [{ price: 'price_prism_month', quantity: 1 }],
      discounts: [{ discount: 'di_phase' }],
      default_tax_rates: ['txr_default'],
      default_payment_method: 'pm_owned',
    });
    expect(params.phases?.[1]).toMatchObject({
      start_date: periodEnd,
      duration: { interval: 'month', interval_count: 1 },
      items: [{ price: 'price_starter_month', quantity: 1 }],
    });
  });

  it.each([
    [
      'a deleted Price',
      managedTargetPhase('price_starter_year', 'year'),
      (future: Stripe.SubscriptionSchedule.Phase) => ({
        ...future,
        items: [
          {
            ...future.items[0]!,
            price: {
              id: 'price_deleted',
              object: 'price',
              deleted: true,
            } as Stripe.DeletedPrice,
          },
        ],
      }),
    ],
    [
      'phase discounts',
      managedTargetPhase('price_starter_year', 'year'),
      (future: Stripe.SubscriptionSchedule.Phase) => ({
        ...future,
        discounts: [
          {
            coupon: 'merchant_coupon_42',
            discount: null,
            promotion_code: null,
          },
        ],
      }),
    ],
    [
      'add invoice items',
      managedTargetPhase('price_starter_year', 'year'),
      (future: Stripe.SubscriptionSchedule.Phase) => ({
        ...future,
        add_invoice_items: [
          {
            discounts: [],
            metadata: null,
            period: {
              start: { type: 'phase_start' as const },
              end: { type: 'phase_end' as const },
            },
            price: { id: 'price_addon' } as Stripe.Price,
            quantity: 1,
            tax_rates: null,
          },
        ],
      }),
    ],
    [
      'an unexpected currency',
      managedTargetPhase('price_starter_year', 'year'),
      (future: Stripe.SubscriptionSchedule.Phase) => ({
        ...future,
        currency: 'eur',
      }),
    ],
    [
      'an unexpected legacy plan',
      managedTargetPhase('price_starter_year', 'year'),
      (future: Stripe.SubscriptionSchedule.Phase) => ({
        ...future,
        items: [{ ...future.items[0]!, plan: 'price_other_year' }],
      }),
    ],
  ] as const)(
    'rejects replacing a target phase with %s',
    async (_reason, future, unsafeFuture) => {
      const owned = schedule({
        metadata: {
          gleen_owner: 'den-20',
          gleen_subscription_id: 'sub_owned',
          gleen_target_plan: 'starter',
          gleen_target_interval: 'year',
          gleen_effective_at: '2026-08-01T00:00:00.000Z',
          gleen_change_key:
            'gleen-den20-update:sub_sched_owned:price_starter_year:1785542400',
        },
        phases: [phase(), unsafeFuture(future)],
      });
      const { stripe, update } = stripeClient(owned);

      await expect(
        scheduleOwnedDowngrade(
          scheduleInput(stripe, subscription('sub_sched_owned')),
        ),
      ).rejects.toThrow(SubscriptionScheduleConflictError);
      expect(update).not.toHaveBeenCalled();
    },
  );

  it('only adopts a metadata-free attached schedule when bootstrap replay returns it', async () => {
    const current = schedule({ metadata: {} });
    const { stripe, create, update } = stripeClient(current, current);

    await scheduleOwnedDowngrade(
      scheduleInput(stripe, subscription('sub_sched_owned')),
    );

    expect(create).toHaveBeenCalledWith(
      { from_subscription: 'sub_owned' },
      { idempotencyKey: 'gleen-den20-schedule:sub_owned:1785542400' },
    );
    expect(update).toHaveBeenCalledOnce();
  });

  it('rejects a metadata-free attached schedule when bootstrap replay returns another schedule', async () => {
    const current = schedule({ metadata: {} });
    const { stripe, update } = stripeClient(
      current,
      schedule({ id: 'sub_sched_other', metadata: {} }),
    );

    await expect(
      scheduleOwnedDowngrade(
        scheduleInput(stripe, subscription('sub_sched_owned')),
      ),
    ).rejects.toThrow(SubscriptionScheduleConflictError);
    expect(update).not.toHaveBeenCalled();
  });

  it.each([
    [
      'another integration',
      schedule({ metadata: { gleen_owner: 'elsewhere' } }),
    ],
    ['a terminal schedule', schedule({ status: 'completed' })],
    [
      'more than two current or future phases',
      schedule({
        phases: [
          phase(),
          phase({ start_date: periodEnd, end_date: periodEnd + 10 }),
          phase({ start_date: periodEnd + 10, end_date: periodEnd + 20 }),
        ],
      }),
    ],
    [
      'multiple current-phase items',
      schedule({
        phases: [phase({ items: [phase().items[0]!, phase().items[0]!] })],
      }),
    ],
    [
      'a future phase before period end',
      schedule({
        phases: [
          phase(),
          phase({ start_date: periodEnd - 1, end_date: periodEnd + 100 }),
        ],
      }),
    ],
    [
      'an expanded deleted Price',
      schedule({
        phases: [
          phase({
            items: [
              {
                ...phase().items[0]!,
                price: { id: 'price_deleted', object: 'price', deleted: true },
              },
            ],
          }),
        ],
      }),
    ],
  ])('fails closed for %s', async (_reason, unsafeSchedule) => {
    const { stripe, update } = stripeClient(unsafeSchedule);

    await expect(
      scheduleOwnedDowngrade(
        scheduleInput(stripe, subscription('sub_sched_owned')),
      ),
    ).rejects.toThrow(SubscriptionScheduleConflictError);
    expect(update).not.toHaveBeenCalled();
  });
});

describe('releaseOwnedDowngrade', () => {
  it('releases an owned attached schedule while preserving its cancellation date', async () => {
    const owned = schedule({
      metadata: { gleen_owner: 'den-20', gleen_subscription_id: 'sub_owned' },
    });
    const { stripe, release } = stripeClient(owned);

    await expect(
      releaseOwnedDowngrade({
        stripe,
        subscription: subscription('sub_sched_owned'),
      }),
    ).resolves.toBeUndefined();

    expect(release).toHaveBeenCalledWith(
      'sub_sched_owned',
      { preserve_cancel_date: true },
      { idempotencyKey: 'gleen-den20-release:sub_sched_owned' },
    );
  });

  it('treats no attached schedule as an idempotent release success', async () => {
    const { stripe, retrieve, release } = stripeClient(schedule());

    await expect(
      releaseOwnedDowngrade({ stripe, subscription: subscription() }),
    ).resolves.toBeUndefined();

    expect(retrieve).not.toHaveBeenCalled();
    expect(release).not.toHaveBeenCalled();
  });

  it('rejects release of an external schedule', async () => {
    const external = schedule({ metadata: { gleen_owner: 'external' } });
    const { stripe, release } = stripeClient(external);

    await expect(
      releaseOwnedDowngrade({
        stripe,
        subscription: subscription('sub_sched_owned'),
      }),
    ).rejects.toThrow(SubscriptionScheduleConflictError);
    expect(release).not.toHaveBeenCalled();
  });
});
