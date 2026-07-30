import { describe, expect, it, vi } from 'vitest';

import {
  BillingRepositoryError,
  createSupabaseBillingProjectionRepository,
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from './supabase-repository';

const userId = '11111111-1111-4111-8111-111111111111';
const now = '2026-07-30T00:00:00.000Z';
const reset = '2026-08-01T00:00:00.000Z';

function queryReturning(result: {
  data: unknown;
  error: null | { message: string };
  count?: number | null;
}) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    gte: vi.fn(),
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
    'gte',
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

describe('Supabase billing repository', () => {
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
      rpc: vi.fn(),
    };

    const snapshot = await createSupabaseBillingRepository(
      client as unknown as SupabaseBillingClient,
    ).getOwnedSnapshot(userId);

    expect(snapshot.usage).toEqual({
      used: 1,
      reserved: 1,
      remaining: 1,
      limit: 3,
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
    const client = { from: vi.fn().mockReturnValue(malformed), rpc: vi.fn() };

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
      periodStart: null,
      periodEnd: null,
    });
    await repository.listOwnedInvoices(userId, {
      cursor: null,
      limit: 25,
      search: '',
      status: null,
      year: null,
    });
    await expect(repository.getOwnedCustomerId(userId)).resolves.toBeNull();

    expect(usage.eq).toHaveBeenCalledWith('user_id', userId);
    expect(invoices.eq).toHaveBeenCalledWith('user_id', userId);
    expect(customer.eq).toHaveBeenCalledWith('user_id', userId);
  });
});

describe('Supabase billing projection repository', () => {
  it('uses only privileged atomic RPCs for webhook state changes', async () => {
    const admin = {
      from: vi.fn(),
      rpc: vi
        .fn()
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValue({ data: null, error: null }),
    };
    const repository = createSupabaseBillingProjectionRepository(
      admin as unknown as SupabaseBillingClient,
    );

    await expect(
      repository.claimWebhookEvent({
        eventId: 'evt_1',
        type: 'invoice.paid',
        createdAt: now,
      }),
    ).resolves.toBe('claimed');
    await repository.markWebhookProcessed('evt_1');

    expect(admin.from).not.toHaveBeenCalled();
    expect(admin.rpc).toHaveBeenNthCalledWith(
      1,
      'claim_billing_webhook_event',
      {
        target_event_id: 'evt_1',
        target_event_type: 'invoice.paid',
        target_created_at: now,
      },
    );
    expect(admin.rpc).toHaveBeenNthCalledWith(
      2,
      'mark_billing_webhook_processed',
      { target_event_id: 'evt_1' },
    );
  });
});
