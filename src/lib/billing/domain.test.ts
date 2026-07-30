import { describe, expect, it } from 'vitest';

import {
  billingIntervalSchema,
  billingPlanSchema,
  billingSnapshotSchema,
  billingSubscriptionStatusSchema,
  invoicePageSchema,
  parseBillingCatalogRows,
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
      id: 'plan-prism-pro',
      slug: 'prism-pro',
      displayName: 'Prism Pro',
      description: 'For professionals.',
      analysisLimit: 25,
      features: ['25 analyses per month'],
      purchasable: true,
    } as const;

    expect(billingPlanSchema.parse(plan)).toEqual(plan);
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
        id: 'plan-free',
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
    expect(Object.keys(snapshot).join(' ')).not.toMatch(
      /stripe|customer|secret|priceId/i,
    );
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
