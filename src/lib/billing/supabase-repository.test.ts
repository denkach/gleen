import { describe, expect, it, vi } from 'vitest';

import {
  BillingRepositoryError,
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from './supabase-repository';

const userId = '11111111-1111-4111-8111-111111111111';
const now = '2026-07-30T00:00:00.000Z';
const reset = '2026-08-01T00:00:00.000Z';
const otherUserId = '99999999-9999-4999-8999-999999999999';

const activityRow = {
  id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  user_id: userId,
  plan_slug: 'free',
  event_type: 'reservation',
  quantity: -1,
  status: 'reserved',
  remaining_balance: 2,
  occurred_at: now,
  job_id: null,
  analysis_id: null,
  source: 'system',
  analysis_title: null,
  channel_title: null,
  search_text: 'reservation system',
} as const;

const invoiceRow = {
  id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  user_id: userId,
  invoice_number: 'INV-1',
  plan_slug: 'starter',
  plan_name: 'Starter',
  billing_interval: 'month',
  amount_due_minor: 1900,
  amount_paid_minor: 0,
  currency: 'usd',
  status: 'open',
  invoice_created_at: now,
  due_at: null,
  paid_at: null,
  hosted_invoice_url: null,
  invoice_pdf_url: null,
  refund_status: 'none',
  refunded_amount_minor: 0,
} as const;

function queryReturning(result: {
  data: unknown;
  error: null | { message: string };
  count?: number | null;
}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    neq: vi.fn(),
    gte: vi.fn(),
    lt: vi.fn(),
    lte: vi.fn(),
    ilike: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
    range: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue(result),
    single: vi.fn().mockResolvedValue(result),
    then: (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result).then(resolve),
  };
  for (const method of [
    'select',
    'eq',
    'neq',
    'gte',
    'lt',
    'lte',
    'ilike',
    'order',
    'limit',
    'range',
  ] as const) {
    query[method].mockReturnValue(query);
  }
  return query;
}

function snapshotClient(
  activityData: unknown[] = [],
  paymentData: unknown[] = [],
) {
  const results = {
    billing_plan_catalog: queryReturning({
      data: [
        {
          slug: 'free',
          display_name: 'Free',
          description: 'For exploring Gleen.',
          analysis_limit: 3,
          features: ['3 analyses per month'],
          display_order: 0,
          is_default: true,
          is_purchasable: false,
          billing_interval: null,
          currency: null,
          unit_amount_minor: null,
          monthly_equivalent_minor: null,
          comparison_copy: null,
          savings_copy: null,
        },
        {
          slug: 'starter',
          display_name: 'Starter',
          description: 'For individuals.',
          analysis_limit: 10,
          features: ['10 analyses per month'],
          display_order: 1,
          is_default: false,
          is_purchasable: true,
          billing_interval: 'month',
          currency: 'usd',
          unit_amount_minor: 1900,
          monthly_equivalent_minor: 1900,
          comparison_copy: null,
          savings_copy: null,
        },
      ],
      error: null,
    }),
    billing_subscription_overview: queryReturning({
      data: {
        user_id: userId,
        plan_slug: 'free',
        plan_name: 'Free',
        plan_description: 'For exploring Gleen.',
        analysis_limit: 3,
        used_analyses: 2,
        remaining_analyses: 1,
        period_start: now,
        resets_at: reset,
        subscription_status: null,
        billing_interval: null,
        cancel_at_period_end: null,
        cancellation_effective_at: null,
        scheduled_plan_slug: null,
        scheduled_change_at: null,
        paid_through: null,
      },
      error: null,
    }),
    billing_usage_summary: queryReturning({
      data: {
        user_id: userId,
        settled_analyses: 1,
        reserved_analyses: 1,
        extra_credits: 0,
      },
      error: null,
    }),
    billing_usage_activity: queryReturning({
      data: activityData,
      error: null,
    }),
    billing_payment_summary: queryReturning({
      data: paymentData,
      error: null,
    }),
  };
  return {
    from: vi.fn((view: string) => results[view as keyof typeof results]),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
}

describe('Supabase billing repository', () => {
  it('ensures the current free entitlement before reading an owner snapshot', async () => {
    const client = snapshotClient();

    await createSupabaseBillingRepository(
      client as unknown as SupabaseBillingClient,
    ).getOwnedSnapshot(userId);

    expect(client.rpc).toHaveBeenCalledWith('get_or_create_free_entitlement', {
      target_user_id: userId,
    });
  });

  it('builds a snapshot from complete owner-scoped settled and reserved usage', async () => {
    const catalog = queryReturning({
      data: [
        {
          slug: 'free',
          display_name: 'Free',
          description: 'For exploring Gleen.',
          analysis_limit: 3,
          features: ['3 analyses per month', 'Saved history'],
          display_order: 0,
          is_default: true,
          is_purchasable: false,
          billing_interval: null,
          currency: null,
          unit_amount_minor: null,
          monthly_equivalent_minor: null,
          comparison_copy: null,
          savings_copy: null,
        },
        {
          slug: 'starter',
          display_name: 'Starter',
          description: 'For individuals.',
          analysis_limit: 10,
          features: ['10 analyses per month'],
          display_order: 1,
          is_default: false,
          is_purchasable: true,
          billing_interval: 'month',
          currency: 'usd',
          unit_amount_minor: 1900,
          monthly_equivalent_minor: 1900,
          comparison_copy: null,
          savings_copy: null,
        },
      ],
      error: null,
    });
    const overview = queryReturning({
      data: {
        user_id: userId,
        plan_slug: 'free',
        plan_name: 'Free',
        plan_description: 'For exploring Gleen.',
        analysis_limit: 3,
        used_analyses: 2,
        remaining_analyses: 1,
        period_start: now,
        resets_at: reset,
        subscription_status: null,
        billing_interval: null,
        cancel_at_period_end: null,
        cancellation_effective_at: null,
        scheduled_plan_slug: null,
        scheduled_change_at: null,
        paid_through: null,
      },
      error: null,
    });
    const aggregation = queryReturning({
      data: {
        user_id: userId,
        settled_analyses: 1,
        reserved_analyses: 1,
        extra_credits: 4,
      },
      error: null,
    });
    const activity = queryReturning({ data: [], error: null });
    const payment = queryReturning({ data: [], error: null });
    const client = {
      from: vi.fn((view: string) => {
        if (view === 'billing_plan_catalog') return catalog;
        if (view === 'billing_subscription_overview') return overview;
        if (view === 'billing_usage_summary') return aggregation;
        if (view === 'billing_payment_summary') return payment;
        return activity;
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    const snapshot = await createSupabaseBillingRepository(
      client as unknown as SupabaseBillingClient,
    ).getOwnedSnapshot(userId);

    expect(snapshot.usage).toEqual({
      used: 1,
      reserved: 1,
      remaining: 1,
      limit: 3,
      extraCredits: 4,
    });
    expect(overview.eq).toHaveBeenCalledWith('user_id', userId);
    expect(aggregation.eq).toHaveBeenCalledWith('user_id', userId);
    expect(activity.eq).toHaveBeenCalledWith('user_id', userId);
    expect(payment.eq).toHaveBeenCalledWith('user_id', userId);
  });

  it('rejects malformed rows with a controlled repository error', async () => {
    const malformed = queryReturning({
      data: [{ slug: 'free', stripe_price_id: 'price_secret' }],
      error: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(malformed),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    };

    await expect(
      createSupabaseBillingRepository(
        client as unknown as SupabaseBillingClient,
      ).getOwnedSnapshot(userId),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
  });

  it('owner-scopes usage, invoice, and customer readers', async () => {
    const usage = queryReturning({ data: [], error: null, count: 0 });
    const invoices = queryReturning({ data: [], error: null, count: 0 });
    const customer = queryReturning({ data: null, error: null });
    const client = {
      from: vi.fn((view: string) => {
        if (view === 'billing_usage_activity') return usage;
        if (view === 'billing_invoice_history') return invoices;
        return customer;
      }),
      rpc: vi.fn(),
    };
    const repository = createSupabaseBillingRepository(
      client as unknown as SupabaseBillingClient,
    );

    await repository.listOwnedUsage(userId, {
      cursor: null,
      limit: 25,
      search: '',
      eventType: null,
      periodStart: '2026-05-01T00:00:00.000Z',
      periodEnd: '2026-07-30T00:00:00.000Z',
    });
    await repository.listOwnedInvoices(userId, {
      cursor: null,
      limit: 25,
      search: '',
      status: null,
      refundedOnly: false,
      year: null,
    });
    await expect(repository.getOwnedCustomerId(userId)).resolves.toBeNull();

    expect(usage.eq).toHaveBeenCalledWith('user_id', userId);
    expect(usage.gte).toHaveBeenCalledWith(
      'occurred_at',
      '2026-05-01T00:00:00.000Z',
    );
    expect(usage.lt).toHaveBeenCalledWith(
      'occurred_at',
      '2026-07-30T00:00:00.000Z',
    );
    expect(usage.lte).not.toHaveBeenCalled();
    expect(invoices.eq).toHaveBeenCalledWith('user_id', userId);
    expect(customer.eq).toHaveBeenCalledWith('user_id', userId);
  });

  it('rejects an above-maximum usage cursor before navigation math reaches the query', async () => {
    const usage = queryReturning({ data: [], error: null, count: 0 });
    const client = { from: vi.fn(() => usage), rpc: vi.fn() };

    await expect(
      createSupabaseBillingRepository(
        client as unknown as SupabaseBillingClient,
      ).listOwnedUsage(userId, {
        cursor: '1000001',
        limit: 25,
        search: 'retry',
        eventType: 'technical_retry',
        periodStart: null,
        periodEnd: null,
      }),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
    expect(usage.range).not.toHaveBeenCalled();
  });

  it('rejects an above-maximum invoice cursor before querying a page', async () => {
    const invoices = queryReturning({ data: [], error: null, count: 0 });
    const client = { from: vi.fn(() => invoices), rpc: vi.fn() };

    await expect(
      createSupabaseBillingRepository(
        client as unknown as SupabaseBillingClient,
      ).listOwnedInvoices(userId, {
        cursor: '1000001',
        limit: 25,
        search: '',
        status: null,
        refundedOnly: false,
        year: null,
      }),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
    expect(invoices.range).not.toHaveBeenCalled();
  });

  it('reads a bounded owner-level invoice summary independently of filters and pages', async () => {
    const summary = queryReturning({
      data: {
        user_id: userId,
        total_count: 87,
        last_invoice_at: '2026-07-18T00:00:00.000Z',
        year_summaries: [
          {
            year: 2026,
            currency: 'usd',
            net_paid_minor: 29400,
            invoice_count: 6,
          },
          {
            year: 2024,
            currency: 'usd',
            net_paid_minor: 1900,
            invoice_count: 1,
          },
        ],
      },
      error: null,
    });
    const client = { from: vi.fn(() => summary), rpc: vi.fn() };

    await expect(
      createSupabaseBillingRepository(
        client as unknown as SupabaseBillingClient,
      ).getOwnedInvoiceSummary(userId, 2026),
    ).resolves.toEqual({
      totalCount: 87,
      lastInvoiceAt: '2026-07-18T00:00:00.000Z',
      selectedYear: 2026,
      yearToDateAmounts: [{ currency: 'usd', amountMinor: 29400 }],
      availableYears: [2026, 2024],
    });
    expect(client.from).toHaveBeenCalledWith('billing_invoice_summary');
    expect(summary.eq).toHaveBeenCalledWith('user_id', userId);
    expect(summary.maybeSingle).toHaveBeenCalledOnce();
  });

  it('maps owner-scoped stored event source and analysis labels without exposing search text', async () => {
    const usage = queryReturning({
      data: [
        {
          ...activityRow,
          source: 'analysis_pipeline',
          analysis_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          analysis_title: 'Systems thinking',
          channel_title: 'Knowledge Channel',
          search_text:
            'settlement analysis_pipeline Systems thinking Knowledge Channel',
          event_type: 'settlement',
          status: 'settled',
        },
      ],
      error: null,
      count: 1,
    });
    const client = {
      from: vi.fn().mockReturnValue(usage),
      rpc: vi.fn(),
    };

    await expect(
      createSupabaseBillingRepository(
        client as unknown as SupabaseBillingClient,
      ).listOwnedUsage(userId, {
        cursor: null,
        limit: 25,
        search: 'systems',
        eventType: null,
        periodStart: null,
        periodEnd: null,
      }),
    ).resolves.toMatchObject({
      items: [
        {
          source: 'analysis_pipeline',
          analysisTitle: 'Systems thinking',
          channelTitle: 'Knowledge Channel',
        },
      ],
    });
    expect(usage.ilike).toHaveBeenCalledWith('search_text', '%systems%');
  });

  it('rejects cross-owner activity in an otherwise valid snapshot', async () => {
    const baseClient = snapshotClient([
      { ...activityRow, user_id: otherUserId },
    ]);

    await expect(
      createSupabaseBillingRepository(
        baseClient as unknown as SupabaseBillingClient,
      ).getOwnedSnapshot(userId),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
  });

  it('rejects cross-owner payments in an otherwise valid snapshot', async () => {
    const baseClient = snapshotClient(
      [],
      [
        {
          user_id: otherUserId,
          currency: 'usd',
          outstanding_amount_minor: 1900,
        },
      ],
    );

    await expect(
      createSupabaseBillingRepository(
        baseClient as unknown as SupabaseBillingClient,
      ).getOwnedSnapshot(userId),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
  });

  it('rejects cross-owner usage, invoice, and customer rows', async () => {
    const usage = queryReturning({
      data: [{ ...activityRow, user_id: otherUserId }],
      error: null,
      count: 1,
    });
    const invoices = queryReturning({
      data: [{ ...invoiceRow, user_id: otherUserId }],
      error: null,
      count: 1,
    });
    const customer = queryReturning({
      data: {
        user_id: otherUserId,
        stripe_customer_id: 'cus_other',
      },
      error: null,
    });
    const client = {
      from: vi.fn((view: string) => {
        if (view === 'billing_usage_activity') return usage;
        if (view === 'billing_invoice_history') return invoices;
        return customer;
      }),
      rpc: vi.fn(),
    };
    const repository = createSupabaseBillingRepository(
      client as unknown as SupabaseBillingClient,
    );

    await expect(
      repository.listOwnedUsage(userId, {
        cursor: null,
        limit: 25,
        search: '',
        eventType: null,
        periodStart: null,
        periodEnd: null,
      }),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
    await expect(
      repository.listOwnedInvoices(userId, {
        cursor: null,
        limit: 25,
        search: '',
        status: null,
        refundedOnly: false,
        year: null,
      }),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
    await expect(repository.getOwnedCustomerId(userId)).rejects.toBeInstanceOf(
      BillingRepositoryError,
    );
  });

  it('fails closed when an exact later-page count is absent', async () => {
    const usage = queryReturning({
      data: [activityRow],
      error: null,
      count: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(usage),
      rpc: vi.fn(),
    };

    await expect(
      createSupabaseBillingRepository(
        client as unknown as SupabaseBillingClient,
      ).listOwnedUsage(userId, {
        cursor: '25',
        limit: 1,
        search: '',
        eventType: null,
        periodStart: null,
        periodEnd: null,
      }),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
  });

  it('fails closed when an exact invoice count is absent', async () => {
    const invoices = queryReturning({
      data: [invoiceRow],
      error: null,
      count: null,
    });
    const client = {
      from: vi.fn().mockReturnValue(invoices),
      rpc: vi.fn(),
    };

    await expect(
      createSupabaseBillingRepository(
        client as unknown as SupabaseBillingClient,
      ).listOwnedInvoices(userId, {
        cursor: null,
        limit: 1,
        search: '',
        status: null,
        refundedOnly: false,
        year: null,
      }),
    ).rejects.toBeInstanceOf(BillingRepositoryError);
  });

  it('does not export privileged projection construction', async () => {
    const ownerModule = await import('./supabase-repository');
    expect(ownerModule).not.toHaveProperty(
      'createSupabaseBillingProjectionRepository',
    );
  });
});
