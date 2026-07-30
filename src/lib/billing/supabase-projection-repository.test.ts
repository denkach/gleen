import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createSupabaseBillingProjectionRepository,
  type SupabaseBillingAdminClient,
} from './supabase-projection-repository';

describe('Supabase billing projection repository', () => {
  it('is isolated behind an explicit server-only module boundary', () => {
    const source = readFileSync(
      join(process.cwd(), 'src/lib/billing/supabase-projection-repository.ts'),
      'utf8',
    );
    expect(source.startsWith("import 'server-only';")).toBe(true);
    expect(source).toContain('supabaseBillingAdminClientBrand');
  });

  it('uses only privileged atomic RPCs for webhook state changes', async () => {
    const admin = {
      rpc: vi
        .fn()
        .mockResolvedValueOnce({ data: true, error: null })
        .mockResolvedValue({ data: null, error: null }),
    };
    const repository = createSupabaseBillingProjectionRepository(
      admin as unknown as SupabaseBillingAdminClient,
    );

    await expect(
      repository.claimWebhookEvent({
        eventId: 'evt_1',
        type: 'invoice.paid',
        createdAt: '2026-07-30T00:00:00.000Z',
      }),
    ).resolves.toBe('claimed');
    await repository.markWebhookProcessed('evt_1');

    expect(admin.rpc).toHaveBeenNthCalledWith(
      1,
      'claim_billing_webhook_event',
      {
        target_event_id: 'evt_1',
        target_event_type: 'invoice.paid',
        target_created_at: '2026-07-30T00:00:00.000Z',
      },
    );
    expect(admin.rpc).toHaveBeenNthCalledWith(
      2,
      'mark_billing_webhook_processed',
      { target_event_id: 'evt_1' },
    );
  });

  it('resolves exact customer and Price ownership through narrow server-only lookups', async () => {
    const customerQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { user_id: '5c5583a7-131b-4c05-b76a-7a4835dba8df' },
        error: null,
      }),
    };
    customerQuery.select.mockReturnValue(customerQuery);
    customerQuery.eq.mockReturnValue(customerQuery);
    const priceQuery = {
      select: vi.fn(),
      eq: vi.fn(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          stripe_price_id: 'price_1',
          billing_interval: 'month',
          billing_plans: { slug: 'starter' },
        },
        error: null,
      }),
    };
    priceQuery.select.mockReturnValue(priceQuery);
    priceQuery.eq.mockReturnValue(priceQuery);
    const admin = {
      rpc: vi.fn(),
      from: vi
        .fn()
        .mockReturnValueOnce(customerQuery)
        .mockReturnValueOnce(priceQuery),
    };
    const repository = createSupabaseBillingProjectionRepository(
      admin as unknown as SupabaseBillingAdminClient,
    );

    await expect(repository.resolveWebhookUserId('cus_1')).resolves.toBe(
      '5c5583a7-131b-4c05-b76a-7a4835dba8df',
    );
    await expect(repository.resolveWebhookPrice('price_1')).resolves.toEqual({
      stripePriceId: 'price_1',
      planSlug: 'starter',
      interval: 'month',
    });

    expect(admin.from).toHaveBeenNthCalledWith(1, 'billing_customers');
    expect(customerQuery.select).toHaveBeenCalledWith('user_id');
    expect(customerQuery.eq).toHaveBeenCalledWith(
      'stripe_customer_id',
      'cus_1',
    );
    expect(admin.from).toHaveBeenNthCalledWith(2, 'billing_prices');
    expect(priceQuery.select).toHaveBeenCalledWith(
      'stripe_price_id,billing_interval,billing_plans!inner(slug)',
    );
    expect(priceQuery.eq).toHaveBeenNthCalledWith(
      1,
      'stripe_price_id',
      'price_1',
    );
    expect(priceQuery.eq).toHaveBeenCalledTimes(1);
  });

  it('passes the verified external Price ID to the atomic subscription RPC', async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn(),
    };
    const repository = createSupabaseBillingProjectionRepository(
      admin as unknown as SupabaseBillingAdminClient,
    );

    await repository.applySubscription({
      eventId: 'evt_subscription',
      eventCreatedAt: '2026-07-30T00:00:00.000Z',
      userId: '5c5583a7-131b-4c05-b76a-7a4835dba8df',
      externalSubscriptionId: 'sub_1',
      externalPriceId: 'price_retired',
      planSlug: 'starter',
      interval: 'month',
      status: 'canceled',
      currentPeriodStart: '2026-07-01T00:00:00.000Z',
      currentPeriodEnd: '2026-08-01T00:00:00.000Z',
      trialEndsAt: null,
      cancelAtPeriodEnd: false,
      cancellationEffectiveAt: '2026-07-30T00:00:00.000Z',
      scheduledPlanSlug: null,
      scheduledChangeAt: null,
      paidThrough: null,
    });

    expect(admin.rpc).toHaveBeenCalledWith(
      'apply_billing_subscription_projection',
      expect.objectContaining({ target_external_price_id: 'price_retired' }),
    );
  });

  it('passes an explicit paid-through advance flag to the atomic invoice RPC', async () => {
    const admin = {
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
      from: vi.fn(),
    };
    const repository = createSupabaseBillingProjectionRepository(
      admin as unknown as SupabaseBillingAdminClient,
    );

    await repository.applyInvoice({
      eventId: 'evt_paid',
      eventCreatedAt: '2026-07-30T00:00:00.000Z',
      userId: '5c5583a7-131b-4c05-b76a-7a4835dba8df',
      externalInvoiceId: 'in_1',
      externalSubscriptionId: 'sub_1',
      number: 'INV-1',
      planSlug: 'starter',
      interval: 'month',
      amountDueMinor: 1_900,
      amountPaidMinor: 1_900,
      currency: 'usd',
      status: 'paid',
      createdAt: '2026-07-30T00:00:00.000Z',
      dueAt: null,
      paidAt: '2026-07-30T00:01:00.000Z',
      hostedUrl: null,
      pdfUrl: null,
      refundStatus: 'none',
      refundedAmountMinor: 0,
      advancePaidThrough: true,
    });

    expect(admin.rpc).toHaveBeenCalledWith(
      'apply_billing_invoice_projection',
      expect.objectContaining({ target_advance_paid_through: true }),
    );
  });
});
