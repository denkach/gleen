import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillingSnapshot } from './domain';
import type { BillingRepository } from './repository';

const getUser = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

import {
  createBillingActions,
  cancelScheduledDowngrade,
  changePlan,
  createCheckoutSession,
  getCheckoutConfirmation,
  createPortalSession,
  exportInvoicesCsv,
  exportUsageCsv,
  resolveBillingAppUrl,
  type BillingActionAdminRepository,
  type BillingStripeClient,
} from './actions';

type TestStripeClient = BillingStripeClient &
  Readonly<{
    subscriptions: Readonly<{ list: ReturnType<typeof vi.fn> }>;
    billingPortal: BillingStripeClient['billingPortal'] &
      Readonly<{
        configurations: Readonly<{ retrieve: ReturnType<typeof vi.fn> }>;
      }>;
  }>;

const periodStart = 1782864000;
const periodEnd = 1785542400;

function plan(slug: 'starter' | 'prism-pro') {
  return {
    id: slug,
    slug,
    displayName: slug === 'starter' ? 'Starter' : 'Prism Pro',
    description: `${slug} plan`,
    analysisLimit: slug === 'starter' ? 10 : 100,
    features: [],
    purchasable: true,
  } as const;
}

function snapshot(
  currentSlug: 'starter' | 'prism-pro',
  currentInterval: 'month' | 'year' = 'month',
  overrides: Partial<BillingSnapshot> = {},
): BillingSnapshot {
  const starter = plan('starter');
  const prismPro = plan('prism-pro');
  return {
    currentPlan: currentSlug === 'starter' ? starter : prismPro,
    currentPrice: {
      planId: currentSlug,
      interval: currentInterval,
      amountMinor: currentSlug === 'starter' ? 900 : 1900,
      monthlyEquivalentMinor: currentSlug === 'starter' ? 900 : 1900,
      currency: 'usd',
      savingsPercent: null,
    },
    period: {
      startsAt: '2026-07-01T00:00:00.000Z',
      endsAt: '2026-08-01T00:00:00.000Z',
    },
    usage: { used: 0, reserved: 0, remaining: 10, limit: 10, extraCredits: 0 },
    scheduledChange: null,
    paymentSummary: {
      subscriptionStatus: 'active',
      paidThrough: '2026-08-01T00:00:00.000Z',
      outstandingAmountMinor: 0,
      currency: 'usd',
    },
    recentActivity: [],
    availablePlans: [
      {
        plan: starter,
        prices: [
          {
            planId: 'starter',
            interval: 'month',
            amountMinor: 900,
            monthlyEquivalentMinor: 900,
            currency: 'usd',
            savingsPercent: null,
          },
        ],
      },
      {
        plan: prismPro,
        prices: [
          {
            planId: 'prism-pro',
            interval: 'month',
            amountMinor: 1900,
            monthlyEquivalentMinor: 1900,
            currency: 'usd',
            savingsPercent: null,
          },
        ],
      },
    ],
    ...overrides,
  };
}

function activeSubscription(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sub_active',
    status: 'active',
    schedule: null,
    items: {
      data: [
        {
          id: 'si_current',
          price: { id: 'price_prism_month' },
          quantity: 1,
          current_period_start: periodStart,
          current_period_end: periodEnd,
        },
      ],
    },
    ...overrides,
  };
}

function subscriptionSchedule(
  overrides: Record<string, unknown> = {},
): Stripe.SubscriptionSchedule {
  return {
    id: 'sub_sched_owned',
    status: 'active',
    subscription: 'sub_active',
    end_behavior: 'release',
    metadata: {},
    phases: [
      {
        add_invoice_items: [],
        application_fee_percent: null,
        automatic_tax: undefined,
        billing_cycle_anchor: null,
        billing_thresholds: null,
        collection_method: null,
        currency: 'usd',
        default_payment_method: null,
        default_tax_rates: null,
        description: null,
        discounts: [],
        end_date: periodEnd,
        invoice_settings: null,
        items: [
          {
            billing_thresholds: null,
            discounts: [],
            metadata: null,
            plan: 'price_prism_month',
            price: { id: 'price_prism_month' },
            quantity: 1,
            tax_rates: null,
          },
        ],
        metadata: null,
        on_behalf_of: null,
        proration_behavior: 'none',
        start_date: periodStart,
        transfer_data: null,
        trial_end: null,
      },
    ],
    ...overrides,
  } as unknown as Stripe.SubscriptionSchedule;
}

const nativeCustomCheckoutPayload = {
  mode: 'subscription',
  ui_mode: 'custom',
  customer: 'cus_owned',
  line_items: [{ price: 'price_server_owned', quantity: 1 }],
  client_reference_id: 'u1',
  metadata: {
    gleen_user_id: 'u1',
    plan_slug: 'prism-pro',
    interval: 'year',
  },
  subscription_data: { metadata: { gleen_user_id: 'u1' } },
  return_url:
    'https://gleen.example/app/subscription/checkout?session_id={CHECKOUT_SESSION_ID}',
} satisfies Stripe.Checkout.SessionCreateParams;

describe('billing request origin', () => {
  it('keeps Stripe return URLs on the current Preview deployment', () => {
    const requestHeaders = new Headers({
      'x-forwarded-host': 'gleen-staging-preview-denisito-projects.vercel.app',
      'x-forwarded-proto': 'https',
    });

    expect(
      resolveBillingAppUrl(requestHeaders, 'https://gleen-staging.vercel.app'),
    ).toBe('https://gleen-staging-preview-denisito-projects.vercel.app');
  });

  it('uses the Server Action origin when proxy host headers are absent', () => {
    const requestHeaders = new Headers({
      origin: 'https://gleen-staging-denkach-denisito-projects.vercel.app',
    });

    expect(
      resolveBillingAppUrl(requestHeaders, 'https://gleen-staging.vercel.app'),
    ).toBe('https://gleen-staging-denkach-denisito-projects.vercel.app');
  });
});

function createRepository(
  overrides: Partial<BillingRepository> = {},
): BillingRepository {
  return {
    getOwnedSnapshot: vi.fn(),
    listOwnedUsage: vi.fn(),
    listOwnedInvoices: vi.fn(),
    getOwnedInvoiceSummary: vi.fn(),
    getOwnedCustomerId: vi.fn(async () => 'cus_owned'),
    ...overrides,
  };
}

function createAdminRepository(
  overrides: Partial<BillingActionAdminRepository> = {},
): BillingActionAdminRepository {
  return {
    resolvePurchasablePrice: vi.fn(async () => 'price_server_owned'),
    persistOwnedCustomerId: vi.fn(async (_userId, customerId) => customerId),
    ...overrides,
  };
}

function createStripe(): TestStripeClient {
  return {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({
          client_secret: 'cs_test_client_secret',
        })),
        retrieve: vi.fn(async () => ({
          id: 'cs_test_owned',
          client_reference_id: 'u1',
          status: 'complete',
          metadata: { plan_slug: 'prism-pro', interval: 'year' },
        })) as unknown as BillingStripeClient['checkout']['sessions']['retrieve'],
      },
    },
    billingPortal: {
      configurations: {
        retrieve: vi.fn(async () => ({
          features: {
            subscription_update: {
              enabled: true,
              proration_behavior: 'always_invoice',
              products: [
                {
                  product: 'prod_gleen',
                  prices: ['price_server_owned'],
                },
              ],
            },
          },
        })),
      },
      sessions: {
        create: vi.fn(async () => ({
          url: 'https://billing.stripe.com/p/session/test',
        })),
      },
    },
    subscriptionSchedules: {
      create: vi.fn(async () => subscriptionSchedule()),
      retrieve: vi.fn(async () => subscriptionSchedule()),
      update: vi.fn(async () => subscriptionSchedule()),
      release: vi.fn(async () => subscriptionSchedule()),
    },
    customers: {
      create: vi.fn(async () => ({ id: 'cus_created' })),
      update: vi.fn(async () => ({ id: 'cus_owned' })),
      retrieve: vi.fn(async () => ({
        deleted: false,
        invoice_settings: { default_payment_method: null },
      })) as unknown as BillingStripeClient['customers']['retrieve'],
    },
    paymentMethods: {
      retrieve: vi.fn(),
    },
    subscriptions: {
      list: vi.fn(async () => ({ data: [] })),
    },
  } as unknown as TestStripeClient;
}

function createActions(
  overrides: {
    repository?: BillingRepository;
    adminRepository?: BillingActionAdminRepository;
    stripe?: BillingStripeClient;
  } = {},
) {
  const stripe = overrides.stripe ?? createStripe();
  const repository = overrides.repository ?? createRepository();
  const adminRepository = overrides.adminRepository ?? createAdminRepository();
  return {
    stripe,
    repository,
    adminRepository,
    actions: createBillingActions({
      stripe,
      repository,
      adminRepository,
      appUrl: 'https://gleen.example/',
      portalConfigurationId: 'bpc_test_prorated',
    }),
  };
}

describe('billing checkout actions', () => {
  beforeEach(() => {
    getUser.mockReset();
  });

  it.each(['free', 'team'] as const)(
    'fails closed when the %s plan is unavailable',
    async (plan) => {
      const adminRepository = createAdminRepository({
        resolvePurchasablePrice: vi.fn(async () => null),
      });
      const { actions, stripe } = createActions({ adminRepository });

      await expect(
        actions.createCheckoutForUser({
          userId: 'u1',
          email: 'owner@example.test',
          plan,
          interval: 'month',
        }),
      ).resolves.toEqual({ ok: false, code: 'plan_unavailable' });
      expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
    },
  );

  it('substitutes only the server-owned customer and price into a custom subscription session', async () => {
    const { actions, stripe } = createActions();

    await expect(
      actions.createCheckoutForUser({
        userId: 'u1',
        email: 'owner@example.test',
        plan: 'prism-pro',
        interval: 'year',
      }),
    ).resolves.toEqual({
      ok: true,
      clientSecret: 'cs_test_client_secret',
    });
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      nativeCustomCheckoutPayload,
    );
    expect(stripe.customers.update).toHaveBeenCalledWith('cus_owned', {
      email: 'owner@example.test',
    });
  });

  it('blocks Checkout when an active subscription already exists', async () => {
    const stripe = createStripe();
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({
      data: [
        {
          id: 'sub_active',
          status: 'active',
          items: {
            data: [{ id: 'si_current', price: { id: 'price_current' } }],
          },
        },
      ],
    } as never);
    const { actions } = createActions({ stripe });

    await expect(
      actions.createCheckoutForUser({
        userId: 'u1',
        email: 'owner@example.test',
        plan: 'prism-pro',
        interval: 'month',
      }),
    ).resolves.toEqual({
      ok: false,
      code: 'subscription_already_exists',
    });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it.each([
    'incomplete',
    'trialing',
    'active',
    'past_due',
    'unpaid',
    'paused',
  ] as const)('blocks Checkout for a %s subscription', async (status) => {
    const stripe = createStripe();
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({
      data: [
        {
          id: 'sub_existing',
          status,
          items: {
            data: [{ id: 'si_existing', price: { id: 'price_current' } }],
          },
        },
      ],
    } as never);
    const { actions } = createActions({ stripe });

    await expect(
      actions.createCheckoutForUser({
        userId: 'u1',
        email: 'owner@example.test',
        plan: 'prism-pro',
        interval: 'month',
      }),
    ).resolves.toEqual({
      ok: false,
      code: 'subscription_already_exists',
    });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('creates and persists a server-owned customer before checkout when no mapping exists', async () => {
    const repository = createRepository({
      getOwnedCustomerId: vi.fn(async () => null),
    });
    const adminRepository = createAdminRepository({
      persistOwnedCustomerId: vi.fn(async () => 'cus_created'),
    });
    const { actions, stripe } = createActions({
      repository,
      adminRepository,
    });

    await actions.createCheckoutForUser({
      userId: 'u1',
      email: 'owner@example.test',
      plan: 'starter',
      interval: 'month',
    });

    expect(stripe.customers.create).toHaveBeenCalledWith(
      {
        email: 'owner@example.test',
        metadata: { gleen_user_id: 'u1' },
      },
      { idempotencyKey: 'gleen-customer-u1' },
    );
    expect(adminRepository.persistOwnedCustomerId).toHaveBeenCalledWith(
      'u1',
      'cus_created',
    );
    expect(stripe.customers.update).not.toHaveBeenCalled();
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_created' }),
    );
  });

  it('authenticates every exported action internally and does not initialize billing for an expired session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      Promise.all([
        createCheckoutSession({ plan: 'prism-pro', interval: 'year' }),
        changePlan({ plan: 'prism-pro', interval: 'year' }),
        cancelScheduledDowngrade(),
        createPortalSession(),
        exportUsageCsv(),
        exportInvoicesCsv(),
      ]),
    ).resolves.toEqual([
      { ok: false, code: 'session_expired' },
      { ok: false, code: 'session_expired' },
      { ok: false, code: 'session_expired' },
      { ok: false, code: 'session_expired' },
      { ok: false, code: 'session_expired' },
      { ok: false, code: 'session_expired' },
    ]);
  });

  it('rejects an authenticated client attempt to substitute the resolved user ID', async () => {
    getUser.mockResolvedValue({
      data: { user: { id: 'u1', email: 'owner@example.test' } },
    });

    await expect(
      createCheckoutSession({
        plan: 'prism-pro',
        interval: 'year',
        userId: 'attacker',
      } as never),
    ).resolves.toEqual({ ok: false, code: 'invalid_request' });
    await expect(
      changePlan({
        plan: 'prism-pro',
        interval: 'year',
        userId: 'attacker',
      } as never),
    ).resolves.toEqual({ ok: false, code: 'invalid_request' });
  });

  it('rejects client substitution fields before calling Stripe', async () => {
    const { actions, stripe } = createActions();

    await expect(
      actions.createCheckoutForUser({
        userId: 'u1',
        email: 'owner@example.test',
        plan: 'prism-pro',
        interval: 'year',
        priceId: 'price_attacker',
      } as never),
    ).resolves.toEqual({ ok: false, code: 'invalid_request' });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
  });

  it('confirms only a completed owned session after the webhook-backed snapshot matches', async () => {
    const repository = createRepository({
      getOwnedSnapshot: vi.fn(
        async () =>
          ({
            currentPlan: { slug: 'prism-pro' },
            currentPrice: { interval: 'year' },
            paymentSummary: { subscriptionStatus: 'active' },
          }) as never,
      ),
    });
    const { actions, stripe } = createActions({ repository });

    await expect(
      actions.getCheckoutConfirmationForUser({
        userId: 'u1',
        sessionId: 'cs_test_owned',
      }),
    ).resolves.toEqual({ state: 'confirmed' });
    expect(stripe.checkout.sessions.retrieve).toHaveBeenCalledWith(
      'cs_test_owned',
    );
    expect(repository.getOwnedSnapshot).toHaveBeenCalledWith('u1');
  });

  it('never accepts checkout confirmation identity substitution', async () => {
    const stripe = createStripe();
    vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
      id: 'cs_test_attacker',
      client_reference_id: 'attacker',
      status: 'complete',
      metadata: { plan_slug: 'prism-pro', interval: 'year' },
    } as never);
    const repository = createRepository();
    const { actions } = createActions({ stripe, repository });

    await expect(
      actions.getCheckoutConfirmationForUser({
        userId: 'u1',
        sessionId: 'cs_test_attacker',
      }),
    ).resolves.toEqual({ state: 'invalid-request' });
    expect(repository.getOwnedSnapshot).not.toHaveBeenCalled();
  });

  it('authenticates checkout confirmation internally and rejects user substitution', async () => {
    getUser.mockResolvedValue({ data: { user: null } });
    await expect(getCheckoutConfirmation('cs_test_owned')).resolves.toEqual({
      state: 'authentication-required',
    });

    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });
    await expect(
      getCheckoutConfirmation({
        sessionId: 'cs_test_owned',
        userId: 'attacker',
      } as never),
    ).resolves.toEqual({ state: 'invalid-request' });
  });

  it.each([
    ['open', 'pending'],
    ['expired', 'canceled'],
  ] as const)(
    'maps an owned %s session to %s without reading entitlement',
    async (status, state) => {
      const stripe = createStripe();
      vi.mocked(stripe.checkout.sessions.retrieve).mockResolvedValue({
        id: 'cs_test_owned',
        client_reference_id: 'u1',
        status,
        metadata: { plan_slug: 'prism-pro', interval: 'year' },
      } as never);
      const repository = createRepository();
      const { actions } = createActions({ stripe, repository });

      await expect(
        actions.getCheckoutConfirmationForUser({
          userId: 'u1',
          sessionId: 'cs_test_owned',
        }),
      ).resolves.toEqual({ state });
      expect(repository.getOwnedSnapshot).not.toHaveBeenCalled();
    },
  );

  it('maps a transient Stripe retrieval failure to retryable-error', async () => {
    const stripe = createStripe();
    vi.mocked(stripe.checkout.sessions.retrieve).mockRejectedValue(
      new Error('network'),
    );
    const { actions } = createActions({ stripe });
    await expect(
      actions.getCheckoutConfirmationForUser({
        userId: 'u1',
        sessionId: 'cs_test_owned',
      }),
    ).resolves.toEqual({ state: 'retryable-error' });
  });
});

describe('billing portal and CSV actions', () => {
  it('maps only the owned Stripe customer default card into a closed payment summary', async () => {
    const stripe = createStripe();
    vi.mocked(stripe.customers.retrieve).mockResolvedValue({
      deleted: false,
      invoice_settings: { default_payment_method: 'pm_owned' },
    } as never);
    vi.mocked(stripe.paymentMethods.retrieve).mockResolvedValue({
      type: 'card',
      card: {
        brand: 'visa',
        last4: '4242',
        exp_month: 8,
        exp_year: 2028,
      },
    } as never);
    const { actions, repository } = createActions({ stripe });

    await expect(
      actions.getPaymentMethodForUser({ userId: 'u1' }),
    ).resolves.toEqual({
      ok: true,
      paymentMethod: {
        status: 'available',
        brand: 'visa',
        last4: '4242',
        expMonth: 8,
        expYear: 2028,
      },
    });
    expect(repository.getOwnedCustomerId).toHaveBeenCalledWith('u1');
    expect(stripe.customers.retrieve).toHaveBeenCalledWith('cus_owned', {
      expand: ['invoice_settings.default_payment_method'],
    });
    expect(stripe.paymentMethods.retrieve).toHaveBeenCalledWith('pm_owned');
  });

  it('returns an explicit unavailable payment state without a customer or default card', async () => {
    const noCustomer = createActions({
      repository: createRepository({
        getOwnedCustomerId: vi.fn(async () => null),
      }),
    });
    await expect(
      noCustomer.actions.getPaymentMethodForUser({ userId: 'u1' }),
    ).resolves.toEqual({
      ok: true,
      paymentMethod: { status: 'unavailable' },
    });
    expect(noCustomer.stripe.customers.retrieve).not.toHaveBeenCalled();

    const noCard = createActions();
    await expect(
      noCard.actions.getPaymentMethodForUser({ userId: 'u1' }),
    ).resolves.toEqual({
      ok: true,
      paymentMethod: { status: 'unavailable' },
    });
  });

  it('rejects payment-summary identity substitution before reading Stripe', async () => {
    const { actions, stripe } = createActions();

    await expect(
      actions.getPaymentMethodForUser({
        userId: 'u1',
        customerId: 'cus_attacker',
      } as never),
    ).resolves.toEqual({ ok: false, code: 'invalid_request' });
    expect(stripe.customers.retrieve).not.toHaveBeenCalled();
  });

  it('returns an upgrade Portal session from server-owned identifiers', async () => {
    const stripe = createStripe();
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({
      data: [activeSubscription()],
    } as never);
    const { actions } = createActions({
      stripe,
      repository: createRepository({
        getOwnedSnapshot: vi.fn(async () => snapshot('starter')),
      }),
    });

    await expect(
      actions.changePlanForUser({
        userId: 'u1',
        plan: 'prism-pro',
        interval: 'month',
      }),
    ).resolves.toEqual({
      ok: true,
      kind: 'upgrade',
      url: 'https://billing.stripe.com/p/session/test',
    });
    expect(stripe.subscriptions.list).toHaveBeenCalledWith({
      customer: 'cus_owned',
      status: 'all',
      limit: 10,
    });
    expect(stripe.billingPortal.configurations.retrieve).toHaveBeenCalledWith(
      'bpc_test_prorated',
    );
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      configuration: 'bpc_test_prorated',
      customer: 'cus_owned',
      return_url: 'https://gleen.example/app/subscription',
      flow_data: {
        type: 'subscription_update_confirm',
        subscription_update_confirm: {
          subscription: 'sub_active',
          items: [{ id: 'si_current', price: 'price_server_owned' }],
        },
        after_completion: {
          type: 'redirect',
          redirect: {
            return_url: 'https://gleen.example/app/subscription',
          },
        },
      },
    });
  });

  it('schedules a downgrade with only server-owned subscription and Price data', async () => {
    const stripe = createStripe();
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({
      data: [activeSubscription()],
    } as never);
    const adminRepository = createAdminRepository({
      resolvePurchasablePrice: vi.fn(async () => 'price_starter_month'),
    });
    const { actions } = createActions({
      stripe,
      adminRepository,
      repository: createRepository({
        getOwnedSnapshot: vi.fn(async () => snapshot('prism-pro')),
      }),
    });

    const input = { userId: 'u1', plan: 'starter', interval: 'month' } as const;
    await expect(actions.changePlanForUser(input)).resolves.toEqual({
      ok: true,
      kind: 'downgrade',
      plan: 'starter',
      interval: 'month',
      effectiveAt: '2026-08-01T00:00:00.000Z',
    });
    await expect(actions.changePlanForUser(input)).resolves.toEqual({
      ok: true,
      kind: 'downgrade',
      plan: 'starter',
      interval: 'month',
      effectiveAt: '2026-08-01T00:00:00.000Z',
    });
    expect(adminRepository.resolvePurchasablePrice).toHaveBeenCalledWith(
      'starter',
      'month',
    );
    expect(stripe.billingPortal.configurations.retrieve).not.toHaveBeenCalled();
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    expect(stripe.subscriptionSchedules.create).toHaveBeenCalledWith(
      { from_subscription: 'sub_active' },
      { idempotencyKey: 'gleen-den20-schedule:sub_active:1785542400' },
    );
    expect(stripe.subscriptionSchedules.update).toHaveBeenCalledWith(
      'sub_sched_owned',
      expect.objectContaining({
        phases: expect.arrayContaining([
          expect.objectContaining({
            items: [{ price: 'price_starter_month', quantity: 1 }],
          }),
        ]),
      }),
      expect.objectContaining({
        idempotencyKey:
          'gleen-den20-update:sub_sched_owned:price_starter_month:1785542400',
      }),
    );
  });

  it.each([
    {
      name: 'does not always invoice proration',
      configuration: {
        features: {
          subscription_update: {
            enabled: true,
            proration_behavior: 'create_prorations',
            products: [
              { product: 'prod_gleen', prices: ['price_server_owned'] },
            ],
          },
        },
      },
    },
    {
      name: 'omits the configured target Price',
      configuration: {
        features: {
          subscription_update: {
            enabled: true,
            proration_behavior: 'always_invoice',
            products: [{ product: 'prod_gleen', prices: ['price_other'] }],
          },
        },
      },
    },
  ])(
    'fails closed when the upgrade Portal $name',
    async ({ configuration }) => {
      const stripe = createStripe();
      vi.mocked(stripe.subscriptions.list).mockResolvedValue({
        data: [activeSubscription()],
      } as never);
      vi.mocked(stripe.billingPortal.configurations.retrieve).mockResolvedValue(
        configuration as never,
      );
      const { actions } = createActions({
        stripe,
        repository: createRepository({
          getOwnedSnapshot: vi.fn(async () => snapshot('starter')),
        }),
      });

      await expect(
        actions.changePlanForUser({
          userId: 'u1',
          plan: 'prism-pro',
          interval: 'month',
        }),
      ).resolves.toEqual({ ok: false, code: 'billing_unavailable' });
      expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
      expect(stripe.subscriptionSchedules.update).not.toHaveBeenCalled();
    },
  );

  it('releases only a Gleen-owned attached downgrade schedule', async () => {
    const stripe = createStripe();
    vi.mocked(stripe.subscriptions.list).mockResolvedValue({
      data: [activeSubscription({ schedule: 'sub_sched_owned' })],
    } as never);
    vi.mocked(stripe.subscriptionSchedules.retrieve).mockResolvedValue(
      subscriptionSchedule({
        metadata: {
          gleen_owner: 'den-20',
          gleen_subscription_id: 'sub_active',
        },
      }),
    );
    const { actions } = createActions({ stripe });

    await expect(
      actions.cancelScheduledDowngradeForUser({ userId: 'u1' }),
    ).resolves.toEqual({ ok: true });
    expect(stripe.subscriptionSchedules.release).toHaveBeenCalledWith(
      'sub_sched_owned',
      { preserve_cancel_date: true },
      { idempotencyKey: 'gleen-den20-release:sub_sched_owned' },
    );
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'the requested plan and interval are unchanged',
      setup: (stripe: TestStripeClient) =>
        createActions({
          stripe,
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () => snapshot('prism-pro')),
          }),
        }),
    },
    {
      name: 'the customer mapping is absent',
      setup: (stripe: TestStripeClient) =>
        createActions({
          stripe,
          repository: createRepository({
            getOwnedCustomerId: vi.fn(async () => null),
          }),
        }),
    },
    {
      name: 'the current snapshot Price is absent',
      setup: (stripe: TestStripeClient) =>
        createActions({
          stripe,
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () =>
              snapshot('prism-pro', 'month', { currentPrice: null }),
            ),
          }),
        }),
    },
    {
      name: 'the target catalog entry is absent',
      setup: (stripe: TestStripeClient) =>
        createActions({
          stripe,
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () =>
              snapshot('prism-pro', 'month', {
                availablePlans: [snapshot('prism-pro').availablePlans[1]!],
              }),
            ),
          }),
        }),
    },
    {
      name: 'the target catalog Price is unavailable',
      setup: (stripe: TestStripeClient) =>
        createActions({
          stripe,
          adminRepository: createAdminRepository({
            resolvePurchasablePrice: vi.fn(async () => null),
          }),
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () => snapshot('prism-pro')),
          }),
        }),
    },
    {
      name: 'there is no non-terminal subscription',
      setup: (stripe: TestStripeClient) =>
        createActions({
          stripe,
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () => snapshot('prism-pro')),
          }),
        }),
    },
    {
      name: 'there is more than one non-terminal subscription',
      setup: (stripe: TestStripeClient) => {
        vi.mocked(stripe.subscriptions.list).mockResolvedValue({
          data: [
            activeSubscription({ id: 'sub_one' }),
            activeSubscription({ id: 'sub_two', status: 'trialing' }),
          ],
        } as never);
        return createActions({
          stripe,
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () => snapshot('prism-pro')),
          }),
        });
      },
    },
    {
      name: 'the subscription has zero items',
      setup: (stripe: TestStripeClient) => {
        vi.mocked(stripe.subscriptions.list).mockResolvedValue({
          data: [activeSubscription({ items: { data: [] } })],
        } as never);
        return createActions({
          stripe,
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () => snapshot('prism-pro')),
          }),
        });
      },
    },
    {
      name: 'the subscription has multiple items',
      setup: (stripe: TestStripeClient) => {
        vi.mocked(stripe.subscriptions.list).mockResolvedValue({
          data: [
            activeSubscription({
              items: {
                data: [
                  activeSubscription().items.data[0],
                  { ...activeSubscription().items.data[0], id: 'si_second' },
                ],
              },
            }),
          ],
        } as never);
        return createActions({
          stripe,
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () => snapshot('prism-pro')),
          }),
        });
      },
    },
    {
      name: 'an external Schedule is attached',
      setup: (stripe: TestStripeClient) => {
        vi.mocked(stripe.subscriptions.list).mockResolvedValue({
          data: [activeSubscription({ schedule: 'sub_sched_external' })],
        } as never);
        vi.mocked(stripe.subscriptionSchedules.retrieve).mockResolvedValue(
          subscriptionSchedule({ id: 'sub_sched_external' }),
        );
        return createActions({
          stripe,
          repository: createRepository({
            getOwnedSnapshot: vi.fn(async () => snapshot('prism-pro')),
          }),
        });
      },
    },
  ])('fails closed when $name', async ({ setup }) => {
    const stripe = createStripe();
    const { actions } = setup(stripe);

    await expect(
      actions.changePlanForUser({
        userId: 'u1',
        plan: 'starter',
        interval: 'month',
      }),
    ).resolves.toMatchObject({ ok: false });
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
    expect(stripe.subscriptionSchedules.update).not.toHaveBeenCalled();
    expect(stripe.subscriptionSchedules.release).not.toHaveBeenCalled();
  });

  it('creates a fresh portal session only for the owned customer', async () => {
    const { actions, stripe } = createActions();

    await expect(
      actions.createPortalForUser({ userId: 'u1' }),
    ).resolves.toEqual({
      ok: true,
      url: 'https://billing.stripe.com/p/session/test',
    });
    expect(stripe.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: 'cus_owned',
      return_url: 'https://gleen.example/app/subscription/portal',
    });
  });

  it('returns plan_unavailable when no owned portal customer exists', async () => {
    const { actions, stripe } = createActions({
      repository: createRepository({
        getOwnedCustomerId: vi.fn(async () => null),
      }),
    });

    await expect(
      actions.createPortalForUser({ userId: 'u1' }),
    ).resolves.toEqual({ ok: false, code: 'plan_unavailable' });
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
  });

  it('exports owner-scoped usage as UTF-8 RFC4180 CSV and neutralizes spreadsheet formulas', async () => {
    const listOwnedUsage = vi.fn().mockResolvedValueOnce({
      items: [
        {
          id: 'ledger-sensitive',
          planSlug: '=cmd',
          eventType: 'manual_adjustment',
          quantity: 1,
          status: 'applied',
          remainingBalance: 12,
          occurredAt: '2026-07-30T10:00:00.000Z',
          jobId: 'job-sensitive',
          analysisId: 'analysis-sensitive',
          source: 'manual',
          analysisTitle: null,
          channelTitle: null,
        },
      ],
      nextCursor: null,
      totalCount: 1,
    });
    const { actions } = createActions({
      repository: createRepository({ listOwnedUsage }),
    });

    const result = await actions.exportUsageForUser({
      userId: 'u1',
      filters: { search: '', eventType: null },
    });

    expect(listOwnedUsage).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        cursor: null,
        limit: 100,
        search: '',
        eventType: null,
      }),
    );
    expect(result).toEqual({
      ok: true,
      filename: 'gleen-usage.csv',
      contentType: 'text/csv;charset=utf-8',
      content:
        '\uFEFF"Date","Event","Plan","Quantity","Status","Remaining"\r\n' +
        '"2026-07-30T10:00:00.000Z","manual_adjustment","\'=cmd","1","applied","12"\r\n',
    });
    if (result.ok) {
      expect(result.content).not.toContain('ledger-sensitive');
      expect(result.content).not.toContain('job-sensitive');
      expect(result.content).not.toContain('analysis-sensitive');
    }
  });

  it('keeps an event exactly at the exclusive period reset out of CSV', async () => {
    const resetAt = '2026-08-01T00:00:00.000Z';
    const resetEvent = {
      id: 'ledger-at-reset',
      planSlug: 'starter',
      eventType: 'period_renewal',
      quantity: 10,
      status: 'applied',
      remainingBalance: 10,
      occurredAt: resetAt,
      jobId: null,
      analysisId: null,
      source: 'system',
      analysisTitle: null,
      channelTitle: null,
    } as const;
    const listOwnedUsage = vi.fn(
      async (
        _userId: string,
        query: Parameters<BillingRepository['listOwnedUsage']>[1],
      ) => ({
        items:
          query.periodEnd !== null && resetEvent.occurredAt >= query.periodEnd
            ? []
            : [resetEvent],
        nextCursor: null,
        totalCount: 0,
      }),
    );
    const { actions } = createActions({
      repository: createRepository({ listOwnedUsage }),
    });

    const result = await actions.exportUsageForUser({
      userId: 'u1',
      filters: {
        search: '',
        eventType: null,
        periodStart: '2026-07-01T00:00:00.000Z',
        periodEnd: resetAt,
      },
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.content).not.toContain(resetAt);
    expect(listOwnedUsage).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        periodStart: '2026-07-01T00:00:00.000Z',
        periodEnd: resetAt,
      }),
    );
  });

  it('exports all owner-scoped invoice pages without raw IDs or URLs', async () => {
    const listOwnedInvoices = vi
      .fn()
      .mockResolvedValueOnce({
        items: [
          {
            id: 'invoice-sensitive',
            number: '+44123',
            planSlug: 'starter',
            planName: 'Starter, "Plus"',
            interval: 'month',
            amountDueMinor: 900,
            amountPaidMinor: 900,
            currency: 'usd',
            status: 'paid',
            createdAt: '2026-07-30T10:00:00.000Z',
            dueAt: null,
            paidAt: '2026-07-30T10:01:00.000Z',
            hostedUrl: 'https://invoice.example/sensitive',
            pdfUrl: 'https://invoice.example/sensitive.pdf',
            refundStatus: 'none',
            refundedAmountMinor: 0,
          },
        ],
        nextCursor: '100',
        totalCount: 2,
      })
      .mockResolvedValueOnce({
        items: [],
        nextCursor: null,
        totalCount: 2,
      });
    const { actions } = createActions({
      repository: createRepository({ listOwnedInvoices }),
    });

    const result = await actions.exportInvoicesForUser({
      userId: 'u1',
      filters: { search: '', status: null, year: 2026 },
    });

    expect(listOwnedInvoices).toHaveBeenNthCalledWith(
      1,
      'u1',
      expect.objectContaining({ cursor: null, limit: 100, year: 2026 }),
    );
    expect(listOwnedInvoices).toHaveBeenNthCalledWith(
      2,
      'u1',
      expect.objectContaining({ cursor: '100', limit: 100, year: 2026 }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.content).toContain(
        '"2026-07-30T10:00:00.000Z","\'+44123","Starter, ""Plus""","month","900","900","usd","paid","none","0"',
      );
      expect(result.content).not.toContain('invoice-sensitive');
      expect(result.content).not.toContain('invoice.example');
    }
  });
});
