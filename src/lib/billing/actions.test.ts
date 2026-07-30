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
  createCheckoutSession,
  createPortalSession,
  exportInvoicesCsv,
  exportUsageCsv,
  type BillingActionAdminRepository,
  type BillingStripeClient,
} from './actions';

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

function createRepository(
  overrides: Partial<BillingRepository> = {},
): BillingRepository {
  return {
    getOwnedSnapshot: vi.fn(),
    listOwnedUsage: vi.fn(),
    listOwnedInvoices: vi.fn(),
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

function createStripe(): BillingStripeClient {
  return {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({
          client_secret: 'cs_test_client_secret',
        })),
      },
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({
          url: 'https://billing.stripe.com/p/session/test',
        })),
      },
    },
    customers: {
      create: vi.fn(async () => ({ id: 'cus_created' })),
      retrieve: vi.fn(async () => ({
        deleted: false,
        invoice_settings: { default_payment_method: null },
      })) as unknown as BillingStripeClient['customers']['retrieve'],
    },
    paymentMethods: {
      retrieve: vi.fn(),
    },
  };
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
      plan: 'starter',
      interval: 'month',
    });

    expect(stripe.customers.create).toHaveBeenCalledWith(
      { metadata: { gleen_user_id: 'u1' } },
      { idempotencyKey: 'gleen-customer-u1' },
    );
    expect(adminRepository.persistOwnedCustomerId).toHaveBeenCalledWith(
      'u1',
      'cus_created',
    );
    expect(stripe.checkout.sessions.create).toHaveBeenCalledWith(
      expect.objectContaining({ customer: 'cus_created' }),
    );
  });

  it('authenticates every exported action internally and does not initialize billing for an expired session', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(
      Promise.all([
        createCheckoutSession({ plan: 'prism-pro', interval: 'year' }),
        createPortalSession(),
        exportUsageCsv(),
        exportInvoicesCsv(),
      ]),
    ).resolves.toEqual([
      { ok: false, code: 'session_expired' },
      { ok: false, code: 'session_expired' },
      { ok: false, code: 'session_expired' },
      { ok: false, code: 'session_expired' },
    ]);
  });

  it('rejects an authenticated client attempt to substitute the resolved user ID', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'u1' } } });

    await expect(
      createCheckoutSession({
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
        plan: 'prism-pro',
        interval: 'year',
        priceId: 'price_attacker',
      } as never),
    ).resolves.toEqual({ ok: false, code: 'invalid_request' });
    expect(stripe.checkout.sessions.create).not.toHaveBeenCalled();
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
