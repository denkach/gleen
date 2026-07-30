import { describe, expect, it } from 'vitest';

import type {
  BillingPlan,
  BillingPrice,
  BillingSnapshot,
  InvoicePage,
  UsageLedgerPage,
} from './domain';
import {
  formatMoney,
  toCheckoutPresentation,
  toEntitlementStatus,
  toInvoicePresentation,
  toSubscriptionPresentation,
  toUsagePresentation,
} from './presentation';

const prismPlan: BillingPlan = {
  id: 'plan-prism-pro',
  slug: 'prism-pro',
  displayName: 'Prism Pro',
  description: 'For professionals.',
  analysisLimit: 25,
  features: ['25 analyses per month'],
  purchasable: true,
};

const prismPrice: BillingPrice = {
  planId: prismPlan.id,
  interval: 'month',
  amountMinor: 4900,
  currency: 'usd',
  savingsPercent: null,
};

const snapshot: BillingSnapshot = {
  currentPlan: prismPlan,
  currentPrice: prismPrice,
  period: {
    startsAt: '2026-07-01T00:00:00.000Z',
    endsAt: '2026-08-01T00:00:00.000Z',
  },
  usage: { used: 19, reserved: 1, remaining: 5, limit: 25 },
  scheduledChange: null,
  paymentSummary: {
    subscriptionStatus: 'active',
    paidThrough: '2026-08-01T00:00:00.000Z',
    outstandingAmountMinor: 0,
    currency: 'usd',
  },
  recentActivity: [],
  availablePlans: [{ plan: prismPlan, prices: [prismPrice] }],
};

describe('billing presentation', () => {
  it('formats minor monetary units with Intl.NumberFormat', () => {
    expect(
      formatMoney({ amountMinor: 4900, currency: 'usd', locale: 'en' }),
    ).toBe('$49.00');
    expect(
      formatMoney({ amountMinor: 4900, currency: 'jpy', locale: 'en' }),
    ).toBe('¥4,900');
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

  it('keeps catalog money identical across subscription, checkout, and invoice presentation', () => {
    const subscription = toSubscriptionPresentation(snapshot, {
      locale: 'en',
      now: '2026-07-30T00:00:00.000Z',
      timeZone: 'UTC',
    });
    const checkout = toCheckoutPresentation(prismPlan, prismPrice, {
      locale: 'en',
    });
    const invoices: InvoicePage = {
      items: [
        {
          id: 'invoice-1',
          number: 'GLEEN-001',
          planSlug: 'prism-pro',
          planName: 'Prism Pro',
          interval: prismPrice.interval,
          amountDueMinor: prismPrice.amountMinor,
          amountPaidMinor: prismPrice.amountMinor,
          currency: prismPrice.currency,
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
    const invoice = toInvoicePresentation(invoices, {
      locale: 'en',
      timeZone: 'UTC',
    }).items[0];

    expect(subscription.currentPrice).toMatchObject({
      amountMinor: 4900,
      currency: 'usd',
      formattedAmount: '$49.00',
    });
    expect(checkout.price).toEqual(subscription.currentPrice);
    expect(invoice?.amountDue).toMatchObject({
      amountMinor: 4900,
      currency: 'usd',
      formattedAmount: '$49.00',
    });
  });

  it('returns semantic variants and formatted dates for usage and invoices', () => {
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
        },
      ],
      nextCursor: 'next',
      totalCount: 1,
    };
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

    expect(
      toUsagePresentation(usage, { locale: 'en', timeZone: 'UTC' }).items[0],
    ).toMatchObject({
      event: { label: 'Reserved', variant: 'warning' },
      occurredAtLabel: 'Jul 30, 2026, 12:30 PM',
    });
    expect(
      toInvoicePresentation(invoicePage, {
        locale: 'en',
        timeZone: 'UTC',
      }).items[0],
    ).toMatchObject({
      status: { label: 'Failed', variant: 'negative' },
      createdAtLabel: 'Jul 30, 2026',
    });
  });

  it('keeps Team availability data-driven', () => {
    const team = { ...prismPlan, id: 'plan-team', slug: 'team' as const };
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
});
