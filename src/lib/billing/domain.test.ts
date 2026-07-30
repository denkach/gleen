import { describe, expect, it } from 'vitest';

import {
  billingIntervalSchema,
  billingPlanSchema,
  billingSnapshotSchema,
  billingSubscriptionStatusSchema,
  billingUsageActivityRowSchema,
  invoicePageSchema,
  parseBillingCatalogRows,
  usageLedgerEntrySchema,
  usageLedgerPageSchema,
} from './domain';

describe('billing domain', () => {
  it('accepts only supported billing intervals', () => {
    expect(billingIntervalSchema.parse('year')).toBe('year');
    expect(() => billingIntervalSchema.parse('weekly')).toThrow();
  });

  it('accepts only normalized subscription states', () => {
    expect(billingSubscriptionStatusSchema.parse('past_due')).toBe('past_due');
    expect(() =>
      billingSubscriptionStatusSchema.parse('payment_failed'),
    ).toThrow();
  });

  it('rejects unsupported plans and secret-bearing catalog objects', () => {
    const plan = {
      id: 'prism-pro',
      slug: 'prism-pro',
      displayName: 'Prism Pro',
      description: 'For professionals.',
      analysisLimit: 25,
      features: ['25 analyses per month'],
      purchasable: true,
    } as const;

    expect(billingPlanSchema.parse(plan)).toEqual(plan);
    expect(() =>
      billingPlanSchema.parse({ ...plan, id: 'plan-prism-pro' }),
    ).toThrow();
    expect(() =>
      billingPlanSchema.parse({
        ...plan,
        id: '550e8400-e29b-41d4-a716-446655440000',
      }),
    ).toThrow();
    expect(() =>
      billingPlanSchema.parse({ ...plan, id: 'price_internal' }),
    ).toThrow();
    expect(() =>
      billingPlanSchema.parse({ ...plan, slug: 'enterprise' }),
    ).toThrow();
    expect(() =>
      billingPlanSchema.parse({
        ...plan,
        stripePriceId: 'price_secret_internal',
      }),
    ).toThrow();
  });

  it('parses a serializable snapshot without privileged identifiers', () => {
    const snapshot = billingSnapshotSchema.parse({
      currentPlan: {
        id: 'free',
        slug: 'free',
        displayName: 'Free',
        description: 'For exploring Gleen.',
        analysisLimit: 3,
        features: ['3 analyses per month'],
        purchasable: false,
      },
      currentPrice: null,
      period: {
        startsAt: '2026-07-01T00:00:00.000Z',
        endsAt: '2026-08-01T00:00:00.000Z',
      },
      usage: { used: 1, reserved: 1, remaining: 1, limit: 3 },
      scheduledChange: null,
      paymentSummary: {
        subscriptionStatus: null,
        paidThrough: null,
        outstandingAmountMinor: 0,
        currency: 'usd',
      },
      recentActivity: [],
      availablePlans: [],
    });

    expect(JSON.parse(JSON.stringify(snapshot))).toEqual(snapshot);
  });

  it('recursively rejects privileged fields nested anywhere in a snapshot', () => {
    const base = {
      currentPlan: {
        id: 'free',
        slug: 'free',
        displayName: 'Free',
        description: 'For exploring Gleen.',
        analysisLimit: 3,
        features: ['3 analyses per month'],
        purchasable: false,
      },
      currentPrice: null,
      period: {
        startsAt: '2026-07-01T00:00:00.000Z',
        endsAt: '2026-08-01T00:00:00.000Z',
      },
      usage: { used: 1, reserved: 1, remaining: 1, limit: 3 },
      scheduledChange: null,
      paymentSummary: {
        subscriptionStatus: null,
        paidThrough: null,
        outstandingAmountMinor: 0,
        currency: 'usd',
      },
      recentActivity: [],
      availablePlans: [],
    } as const;

    expect(() =>
      billingSnapshotSchema.parse({
        ...base,
        currentPlan: {
          ...base.currentPlan,
          stripePriceId: 'price_internal',
        },
      }),
    ).toThrow();
    expect(() =>
      billingSnapshotSchema.parse({
        ...base,
        paymentSummary: {
          ...base.paymentSummary,
          stripeCustomerId: 'cus_internal',
        },
      }),
    ).toThrow();
    expect(() =>
      billingSnapshotSchema.parse({
        ...base,
        availablePlans: [
          {
            plan: { ...base.currentPlan, databasePlanId: 'private-uuid' },
            prices: [],
          },
        ],
      }),
    ).toThrow();
    expect(() =>
      billingSnapshotSchema.parse({
        ...base,
        availablePlans: [
          {
            plan: base.currentPlan,
            prices: [
              {
                planId: 'free',
                interval: 'month',
                amountMinor: 0,
                currency: 'usd',
                savingsPercent: null,
                stripePriceId: 'price_internal',
              },
            ],
          },
        ],
      }),
    ).toThrow();
  });

  it('accepts only ledger event and normalized status pairs from Task 2', () => {
    const base = {
      id: 'usage-1',
      planSlug: 'prism-pro',
      quantity: 0,
      remainingBalance: 5,
      occurredAt: '2026-07-30T12:30:00.000Z',
      jobId: null,
      analysisId: null,
    } as const;
    const validPairs = [
      ['reservation', 'reserved'],
      ['settlement', 'settled'],
      ['release', 'released'],
      ['period_renewal', 'applied'],
      ['manual_adjustment', 'applied'],
      ['refund', 'applied'],
      ['technical_retry', 'informational'],
    ] as const;

    for (const [eventType, status] of validPairs) {
      expect(
        usageLedgerEntrySchema.parse({ ...base, eventType, status }),
      ).toMatchObject({ eventType, status });
    }
    expect(() =>
      usageLedgerEntrySchema.parse({
        ...base,
        eventType: 'reservation',
        status: 'settled',
      }),
    ).toThrow();
    expect(() =>
      usageLedgerEntrySchema.parse({
        ...base,
        eventType: 'technical_retry',
        status: 'applied',
      }),
    ).toThrow();
    expect(() =>
      billingUsageActivityRowSchema.parse({
        id: 'usage-1',
        user_id: 'user-1',
        plan_slug: 'prism-pro',
        event_type: 'release',
        quantity: 1,
        status: 'reserved',
        remaining_balance: 6,
        occurred_at: '2026-07-30T12:30:00.000Z',
        job_id: null,
        analysis_id: null,
      }),
    ).toThrow();
  });

  it('validates paginated usage and invoice boundaries', () => {
    expect(
      usageLedgerPageSchema.parse({
        items: [],
        nextCursor: null,
        totalCount: 0,
      }),
    ).toEqual({ items: [], nextCursor: null, totalCount: 0 });
    expect(
      invoicePageSchema.parse({
        items: [],
        nextCursor: null,
        totalCount: 0,
      }),
    ).toEqual({ items: [], nextCursor: null, totalCount: 0 });
    expect(() =>
      usageLedgerPageSchema.parse({
        items: [],
        nextCursor: null,
        totalCount: -1,
      }),
    ).toThrow();
  });

  it('maps catalog view rows to stable public slug IDs', () => {
    const catalog = parseBillingCatalogRows([
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
        slug: 'prism-pro',
        display_name: 'Prism Pro',
        description: 'For professionals.',
        analysis_limit: 25,
        features: ['25 analyses per month'],
        display_order: 2,
        is_default: false,
        is_purchasable: true,
        billing_interval: 'month',
        currency: 'usd',
        unit_amount_minor: 4900,
        monthly_equivalent_minor: 4900,
        comparison_copy: null,
        savings_copy: null,
      },
      {
        slug: 'prism-pro',
        display_name: 'Prism Pro',
        description: 'For professionals.',
        analysis_limit: 25,
        features: ['25 analyses per month'],
        display_order: 2,
        is_default: false,
        is_purchasable: true,
        billing_interval: 'year',
        currency: 'usd',
        unit_amount_minor: 46800,
        monthly_equivalent_minor: 3900,
        comparison_copy: null,
        savings_copy: 'Save 20%',
      },
    ]);

    expect(catalog).toMatchObject([
      {
        plan: { id: 'free', slug: 'free' },
        prices: [],
      },
      {
        plan: { id: 'prism-pro', slug: 'prism-pro' },
        prices: [
          { planId: 'prism-pro', interval: 'month', amountMinor: 4900 },
          {
            planId: 'prism-pro',
            interval: 'year',
            amountMinor: 46800,
            savingsPercent: 20,
          },
        ],
      },
    ]);
    expect(JSON.stringify(catalog)).not.toMatch(/price_|stripe|plan_id/i);
  });
});
