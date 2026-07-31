import type Stripe from 'stripe';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { BillingRepository } from './repository';

const getUser = vi.hoisted(() => vi.fn());

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

import {
  createBillingActions,
  createPlanChangePortalSession,
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
        createPlanChangePortalSession({ plan: 'prism-pro', interval: 'year' }),
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
      createPlanChangePortalSession({
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

  it('creates a prorated plan-change Portal session from server-owned identifiers', async () => {
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
      actions.createPlanChangePortalForUser({
        userId: 'u1',
        plan: 'prism-pro',
        interval: 'month',
      }),
    ).resolves.toEqual({
      ok: true,
      url: 'https://billing.stripe.com/p/session/test',
    });
    expect(stripe.subscriptions.list).toHaveBeenCalledWith({
      customer: 'cus_owned',
      status: 'all',
      limit: 10,
    });
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

  it.each([
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
      name: 'the target catalog Price is unavailable',
      setup: (stripe: TestStripeClient) =>
        createActions({
          stripe,
          adminRepository: createAdminRepository({
            resolvePurchasablePrice: vi.fn(async () => null),
          }),
        }),
    },
    {
      name: 'there is no non-terminal subscription',
      setup: (stripe: TestStripeClient) => createActions({ stripe }),
    },
    {
      name: 'there is more than one non-terminal subscription',
      setup: (stripe: TestStripeClient) => {
        vi.mocked(stripe.subscriptions.list).mockResolvedValue({
          data: [
            {
              id: 'sub_one',
              status: 'active',
              items: { data: [{ id: 'si_one', price: { id: 'price_one' } }] },
            },
            {
              id: 'sub_two',
              status: 'trialing',
              items: { data: [{ id: 'si_two', price: { id: 'price_two' } }] },
            },
          ],
        } as never);
        return createActions({ stripe });
      },
    },
    {
      name: 'the subscription has zero items',
      setup: (stripe: TestStripeClient) => {
        vi.mocked(stripe.subscriptions.list).mockResolvedValue({
          data: [{ id: 'sub_active', status: 'active', items: { data: [] } }],
        } as never);
        return createActions({ stripe });
      },
    },
    {
      name: 'the subscription has multiple items',
      setup: (stripe: TestStripeClient) => {
        vi.mocked(stripe.subscriptions.list).mockResolvedValue({
          data: [
            {
              id: 'sub_active',
              status: 'active',
              items: {
                data: [
                  { id: 'si_one', price: { id: 'price_one' } },
                  { id: 'si_two', price: { id: 'price_two' } },
                ],
              },
            },
          ],
        } as never);
        return createActions({ stripe });
      },
    },
    {
      name: 'the Portal does not always invoice proration',
      setup: (stripe: TestStripeClient) => {
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
        vi.mocked(
          stripe.billingPortal.configurations.retrieve,
        ).mockResolvedValue({
          features: {
            subscription_update: {
              enabled: true,
              proration_behavior: 'create_prorations',
              products: [
                { product: 'prod_gleen', prices: ['price_server_owned'] },
              ],
            },
          },
        } as never);
        return createActions({ stripe });
      },
    },
    {
      name: 'the Portal configuration omits the target Price',
      setup: (stripe: TestStripeClient) => {
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
        vi.mocked(
          stripe.billingPortal.configurations.retrieve,
        ).mockResolvedValue({
          features: {
            subscription_update: {
              enabled: true,
              proration_behavior: 'always_invoice',
              products: [{ product: 'prod_gleen', prices: ['price_other'] }],
            },
          },
        } as never);
        return createActions({ stripe });
      },
    },
  ])('fails closed when $name', async ({ setup }) => {
    const stripe = createStripe();
    const { actions } = setup(stripe);

    await expect(
      actions.createPlanChangePortalForUser({
        userId: 'u1',
        plan: 'prism-pro',
        interval: 'month',
      }),
    ).resolves.toMatchObject({ ok: false });
    expect(stripe.billingPortal.sessions.create).not.toHaveBeenCalled();
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
