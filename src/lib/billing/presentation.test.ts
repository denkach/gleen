import { describe, expect, it } from 'vitest';

import type {
  BillingSnapshot,
  InvoicePage,
  InvoiceSummary,
  UsageLedgerPage,
} from './domain';
import { parseBillingCatalogRows } from './domain';
import {
  billingPresentationDefaults,
  formatMoney,
  toCheckoutPresentation,
  toEntitlementStatus,
  toInvoicePresentation,
  toInvoiceSummaryPresentation,
  toSubscriptionPresentation,
  toUsagePresentation,
} from './presentation';

const catalogRows = [
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
    unit_amount_minor: 18000,
    monthly_equivalent_minor: 1500,
    comparison_copy: null,
    savings_copy: null,
  },
] as const;
const catalog = parseBillingCatalogRows(catalogRows);
const prismCatalog = catalog.find((entry) => entry.plan.slug === 'prism-pro');
if (prismCatalog === undefined) throw new Error('Missing Prism Pro fixture');
const prismPlan = prismCatalog.plan;
const prismPrice = prismCatalog.prices[0];
if (prismPrice === undefined)
  throw new Error('Missing Prism Pro price fixture');

const snapshot: BillingSnapshot = {
  currentPlan: prismPlan,
  currentPrice: prismPrice,
  period: {
    startsAt: '2026-07-01T00:00:00.000Z',
    endsAt: '2026-08-01T00:00:00.000Z',
  },
  usage: {
    used: 19,
    reserved: 1,
    remaining: 5,
    limit: 25,
    extraCredits: 4,
  },
  scheduledChange: null,
  paymentSummary: {
    subscriptionStatus: 'active',
    paidThrough: '2026-08-01T00:00:00.000Z',
    outstandingAmountMinor: 0,
    currency: 'usd',
  },
  recentActivity: [],
  availablePlans: [{ plan: prismPlan, prices: prismCatalog.prices }],
};

describe('billing presentation', () => {
  it('formats minor monetary units with Intl.NumberFormat', () => {
    expect(
      formatMoney({ amountMinor: 4900, currency: 'usd', locale: 'en' }),
    ).toBe('$49.00');
    expect(
      formatMoney({ amountMinor: 4900, currency: 'jpy', locale: 'en' }),
    ).toBe('¥4,900');
    expect(formatMoney({ amountMinor: 4900, currency: 'usd' })).toBe('$49.00');
    expect(billingPresentationDefaults).toEqual({
      locale: 'en-US',
      timeZone: 'UTC',
    });
  });

  it('maps paid-through status deterministically', () => {
    expect(
      toEntitlementStatus({
        status: 'past_due',
        paidThrough: '2026-08-01T00:00:00.000Z',
        now: '2026-07-30T00:00:00.000Z',
      }),
    ).toBe('past_due_with_access');
    expect(
      toEntitlementStatus({
        status: 'unpaid',
        paidThrough: '2026-07-29T00:00:00.000Z',
        now: '2026-07-30T00:00:00.000Z',
      }),
    ).toBe('free');
    expect(
      toEntitlementStatus({
        status: 'active',
        paidThrough: '2026-07-29T00:00:00.000Z',
        now: '2026-07-30T00:00:00.000Z',
      }),
    ).toBe('free');
  });

  it('maps live catalog rows consistently while preserving historical invoice money', () => {
    const subscription = toSubscriptionPresentation(snapshot, {
      now: '2026-07-30T00:00:00.000Z',
      paymentMethod: {
        status: 'available',
        brand: 'visa',
        last4: '4242',
        expMonth: 8,
        expYear: 2028,
      },
    });
    const checkout = toCheckoutPresentation(prismPlan, prismPrice);
    const invoices: InvoicePage = {
      items: [
        {
          id: 'invoice-1',
          number: 'GLEEN-001',
          planSlug: 'prism-pro',
          planName: 'Prism Pro',
          interval: 'month',
          amountDueMinor: 4800,
          amountPaidMinor: 4800,
          currency: 'usd',
          status: 'paid',
          createdAt: '2026-07-01T00:00:00.000Z',
          dueAt: null,
          paidAt: '2026-07-01T00:00:00.000Z',
          hostedUrl: 'https://billing.example.test/invoice-1',
          pdfUrl: 'https://billing.example.test/invoice-1.pdf',
          refundStatus: 'none',
          refundedAmountMinor: 0,
        },
      ],
      nextCursor: null,
      totalCount: 1,
    };
    const invoice = toInvoicePresentation(invoices).items[0];

    expect(subscription.currentPrice).toMatchObject({
      amountMinor: 4900,
      currency: 'usd',
      formattedAmount: '$49.00',
      monthlyEquivalent: {
        amountMinor: 4900,
        currency: 'usd',
        formattedAmount: '$49.00',
      },
    });
    expect(subscription.availablePlans[0]?.prices).toHaveLength(2);
    expect(subscription.availablePlans[0]?.prices[1]).toMatchObject({
      amountMinor: 18000,
      formattedAmount: '$180.00',
      monthlyEquivalent: {
        amountMinor: 1500,
        formattedAmount: '$15.00',
      },
      savingsPercent: 69,
    });
    expect(subscription.resetAtLabel).toBe('Aug 1, 2026');
    expect(subscription.paymentMethod).toEqual({
      status: 'available',
      label: 'Visa •••• 4242',
      expiryLabel: 'Expires 08/2028',
    });
    expect(checkout.price).toEqual(subscription.currentPrice);
    expect(invoice?.amountDue).toMatchObject({
      amountMinor: 4800,
      currency: 'usd',
      formattedAmount: '$48.00',
    });
  });

  it('returns normalized status and deterministic dates for every ledger status', () => {
    const usage: UsageLedgerPage = {
      items: [
        {
          id: 'usage-1',
          planSlug: 'prism-pro',
          eventType: 'reservation',
          quantity: -1,
          status: 'reserved',
          remainingBalance: 5,
          occurredAt: '2026-07-30T12:30:00.000Z',
          jobId: 'job-1',
          analysisId: 'analysis-1',
          source: 'analysis_pipeline',
          analysisTitle: 'Systems thinking',
          channelTitle: 'Knowledge Channel',
        },
        {
          id: 'usage-2',
          planSlug: 'prism-pro',
          eventType: 'settlement',
          quantity: 0,
          status: 'settled',
          remainingBalance: 5,
          occurredAt: '2026-07-30T12:30:00.000Z',
          jobId: 'job-1',
          analysisId: 'analysis-1',
          source: 'analysis_pipeline',
          analysisTitle: 'Systems thinking',
          channelTitle: 'Knowledge Channel',
        },
        {
          id: 'usage-3',
          planSlug: 'prism-pro',
          eventType: 'release',
          quantity: 1,
          status: 'released',
          remainingBalance: 6,
          occurredAt: '2026-07-30T12:30:00.000Z',
          jobId: 'job-2',
          analysisId: 'analysis-2',
          source: 'analysis_pipeline',
          analysisTitle: 'Product demo',
          channelTitle: 'Gleen',
        },
        {
          id: 'usage-4',
          planSlug: 'prism-pro',
          eventType: 'refund',
          quantity: 1,
          status: 'applied',
          remainingBalance: 7,
          occurredAt: '2026-07-30T12:30:00.000Z',
          jobId: null,
          analysisId: null,
          source: 'stripe_webhook',
          analysisTitle: null,
          channelTitle: null,
        },
        {
          id: 'usage-5',
          planSlug: 'prism-pro',
          eventType: 'technical_retry',
          quantity: 0,
          status: 'informational',
          remainingBalance: 7,
          occurredAt: '2026-07-30T12:30:00.000Z',
          jobId: 'job-3',
          analysisId: 'analysis-3',
          source: 'analysis_pipeline',
          analysisTitle: 'Systems thinking',
          channelTitle: 'Knowledge Channel',
        },
      ],
      nextCursor: 'next',
      totalCount: 5,
    };
    const presented = toUsagePresentation(usage);

    expect(presented.items.map(({ status }) => status)).toEqual([
      { key: 'reserved', label: 'Reserved', variant: 'warning' },
      { key: 'settled', label: 'Settled', variant: 'neutral' },
      { key: 'released', label: 'Released', variant: 'positive' },
      { key: 'applied', label: 'Applied', variant: 'positive' },
      { key: 'informational', label: 'Informational', variant: 'neutral' },
    ]);
    expect(presented.items[0]).toMatchObject({
      event: {
        label: 'Reserved',
        title: 'Reserved — Systems thinking',
        variant: 'warning',
      },
      source: {
        key: 'analysis_pipeline',
        label: 'Analysis pipeline',
        detail: 'Knowledge Channel',
      },
      occurredAtLabel: 'Jul 30, 2026, 12:30 PM',
    });
  });

  it('presents an explicit unavailable payment method without fixture details', () => {
    expect(
      toSubscriptionPresentation(snapshot, {
        now: '2026-07-30T00:00:00.000Z',
        paymentMethod: { status: 'unavailable' },
      }).paymentMethod,
    ).toEqual({
      status: 'unavailable',
      label: 'Managed in billing portal',
      expiryLabel: null,
    });
  });

  it('returns semantic invoice variants with deterministic default dates', () => {
    const invoicePage: InvoicePage = {
      items: [
        {
          id: 'invoice-2',
          number: null,
          planSlug: 'prism-pro',
          planName: 'Prism Pro',
          interval: 'month',
          amountDueMinor: 4900,
          amountPaidMinor: 0,
          currency: 'usd',
          status: 'failed',
          createdAt: '2026-07-30T12:30:00.000Z',
          dueAt: null,
          paidAt: null,
          hostedUrl: null,
          pdfUrl: null,
          refundStatus: 'none',
          refundedAmountMinor: 0,
        },
      ],
      nextCursor: null,
      totalCount: 1,
    };

    expect(toInvoicePresentation(invoicePage).items[0]).toMatchObject({
      status: { label: 'Failed', variant: 'negative' },
      createdAtLabel: 'Jul 30, 2026',
    });
  });

  it('keeps Team availability data-driven', () => {
    const team = { ...prismPlan, id: 'team' as const, slug: 'team' as const };
    const unavailable = toCheckoutPresentation(
      { ...team, purchasable: false },
      { ...prismPrice, planId: team.id },
      { locale: 'en' },
    );
    const available = toCheckoutPresentation(
      { ...team, purchasable: true },
      { ...prismPrice, planId: team.id },
      { locale: 'en' },
    );

    expect(unavailable.action).toEqual({
      enabled: false,
      reason: 'This plan is not available for purchase.',
    });
    expect(available.action).toEqual({ enabled: true, reason: null });
  });

  it('rejects a valid price slug owned by a different checkout plan', () => {
    expect(() =>
      toCheckoutPresentation(prismPlan, {
        ...prismPrice,
        planId: 'starter',
      }),
    ).toThrow('Catalog price does not belong to the selected plan');
  });

  it('presents owner-level invoice summary values deterministically', () => {
    const summary: InvoiceSummary = {
      totalCount: 87,
      lastInvoiceAt: '2026-07-18T00:00:00.000Z',
      selectedYear: 2026,
      yearToDateAmounts: [{ currency: 'usd', amountMinor: 29400 }],
      availableYears: [2026, 2024],
    };

    expect(toInvoiceSummaryPresentation(summary)).toEqual({
      totalCount: 87,
      lastInvoiceAt: '2026-07-18T00:00:00.000Z',
      lastInvoiceAtLabel: 'Jul 18, 2026',
      yearToDateSpendLabel: '$294.00',
      availableYears: [2026, 2024],
    });
  });
});
