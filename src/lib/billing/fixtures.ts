import { z } from 'zod';

import type {
  BillingPlan,
  BillingPrice,
  BillingSnapshot,
  InvoicePage,
  InvoiceSummary,
  UsageLedgerPage,
} from './domain';
import {
  formatMoney,
  toCheckoutPresentation,
  toInvoicePresentation,
  toInvoiceSummaryPresentation,
  toSubscriptionPresentation,
  toUsagePresentation,
} from './presentation';

export const billingFixtureScreens = [
  'subscription',
  'usage',
  'checkout',
  'portal',
  'invoices',
  'limit-reached',
] as const;
export const billingFixtureStates = [
  'free',
  'active',
  'past-due',
  'scheduled-cancel',
  'empty-usage',
  'failed-invoice',
  'limit-reached',
] as const;

export type BillingFixtureScreen = (typeof billingFixtureScreens)[number];
export type BillingFixtureState = (typeof billingFixtureStates)[number];

const fixtureScreenSchema = z.enum(billingFixtureScreens);
const fixtureStateSchema = z.enum(billingFixtureStates);
const now = '2025-07-29T00:00:00.000Z';
const presentationOptions = {
  locale: 'en-US',
  timeZone: 'UTC',
  now,
} as const;

const freePlan = {
  id: 'free',
  slug: 'free',
  displayName: 'Free',
  description: 'Explore Gleen with a small monthly allowance.',
  analysisLimit: 3,
  features: ['3 analyses per month', 'Saved results', 'Basic exports'],
  purchasable: false,
} as const satisfies BillingPlan;
const starterPlan = {
  id: 'starter',
  slug: 'starter',
  displayName: 'Starter',
  description: 'For focused learners building a regular study habit.',
  analysisLimit: 25,
  features: [
    '25 analyses per month',
    'Advanced insights & takeaways',
    'Export & download',
    'Priority support',
  ],
  purchasable: true,
} as const satisfies BillingPlan;
const prismProPlan = {
  id: 'prism-pro',
  slug: 'prism-pro',
  displayName: 'Prism Pro',
  description: 'For deep research and high-volume knowledge work.',
  analysisLimit: 500,
  features: [
    '500 analyses per month',
    'More analyses, no waiting',
    'Advanced insights & takeaways',
    'Deeper insights with AI',
    'Export, share & automate',
    'Priority response',
  ],
  purchasable: true,
} as const satisfies BillingPlan;
const teamPlan = {
  id: 'team',
  slug: 'team',
  displayName: 'Team',
  description: 'Shared billing and seats for collaborative teams.',
  analysisLimit: 1000,
  features: ['Shared workspace', 'Centralized billing', 'Team controls'],
  purchasable: false,
} as const satisfies BillingPlan;

const starterMonthly = {
  planId: 'starter',
  interval: 'month',
  amountMinor: 1900,
  monthlyEquivalentMinor: 1900,
  currency: 'eur',
  savingsPercent: null,
} as const satisfies BillingPrice;
const starterYearly = {
  planId: 'starter',
  interval: 'year',
  amountMinor: 19000,
  monthlyEquivalentMinor: 1583,
  currency: 'eur',
  savingsPercent: 17,
} as const satisfies BillingPrice;
const prismMonthly = {
  planId: 'prism-pro',
  interval: 'month',
  amountMinor: 4900,
  monthlyEquivalentMinor: 4900,
  currency: 'eur',
  savingsPercent: null,
} as const satisfies BillingPrice;
const prismYearly = {
  planId: 'prism-pro',
  interval: 'year',
  amountMinor: 49000,
  monthlyEquivalentMinor: 4083,
  currency: 'eur',
  savingsPercent: 17,
} as const satisfies BillingPrice;

const availablePlans = [
  { plan: freePlan, prices: [] },
  { plan: starterPlan, prices: [starterMonthly, starterYearly] },
  { plan: prismProPlan, prices: [prismMonthly, prismYearly] },
  { plan: teamPlan, prices: [] },
] as const;

function snapshotFor(state: BillingFixtureState): BillingSnapshot {
  const isFree = state === 'free';
  const isLimit = state === 'limit-reached';
  const currentPlan = isFree ? freePlan : starterPlan;
  const used = isLimit ? 24 : isFree ? 1 : 17;
  const reserved = isLimit ? 1 : 1;
  const remaining = currentPlan.analysisLimit - used - reserved;

  return {
    currentPlan,
    currentPrice: isFree ? null : starterMonthly,
    period: {
      startsAt: '2025-07-01T00:00:00.000Z',
      endsAt: '2025-08-01T00:00:00.000Z',
    },
    usage: {
      used,
      reserved,
      remaining,
      limit: currentPlan.analysisLimit,
      extraCredits: 0,
    },
    scheduledChange:
      state === 'scheduled-cancel'
        ? {
            kind: 'cancellation',
            plan: null,
            effectiveAt: '2025-08-01T00:00:00.000Z',
          }
        : null,
    paymentSummary: {
      subscriptionStatus: isFree
        ? null
        : state === 'past-due'
          ? 'past_due'
          : 'active',
      paidThrough: isFree ? null : '2025-08-01T00:00:00.000Z',
      outstandingAmountMinor: state === 'past-due' ? 1900 : 0,
      currency: 'eur',
    },
    recentActivity: [],
    availablePlans,
  };
}

const usagePage = {
  items: [
    {
      id: 'fixture-usage-001',
      planSlug: 'starter',
      eventType: 'settlement',
      quantity: -1,
      status: 'settled',
      remainingBalance: 7,
      occurredAt: '2025-07-28T14:30:00.000Z',
      jobId: 'fixture-job-001',
      analysisId: 'fixture-analysis-001',
      source: 'analysis_pipeline',
      analysisTitle: 'How great teams communicate',
      channelTitle: 'Gleen Learning',
    },
    {
      id: 'fixture-usage-002',
      planSlug: 'starter',
      eventType: 'technical_retry',
      quantity: 0,
      status: 'informational',
      remainingBalance: 8,
      occurredAt: '2025-07-26T09:15:00.000Z',
      jobId: 'fixture-job-002',
      analysisId: null,
      source: 'system',
      analysisTitle: null,
      channelTitle: null,
    },
  ],
  nextCursor: null,
  totalCount: 2,
} as const satisfies UsageLedgerPage;

const paidInvoice = {
  id: 'fixture-invoice-001',
  number: 'GL-2025-001',
  planSlug: 'starter',
  planName: 'Starter',
  interval: 'month',
  amountDueMinor: 1900,
  amountPaidMinor: 1900,
  currency: 'eur',
  status: 'paid',
  createdAt: '2025-07-01T00:00:00.000Z',
  dueAt: null,
  paidAt: '2025-07-01T00:01:00.000Z',
  hostedUrl: 'https://example.invalid/fixture-invoice',
  pdfUrl: 'https://example.invalid/fixture-invoice.pdf',
  refundStatus: 'none',
  refundedAmountMinor: 0,
} as const;
const failedInvoice = {
  ...paidInvoice,
  id: 'fixture-invoice-failed',
  number: 'GL-2025-002',
  amountPaidMinor: 0,
  status: 'failed',
  createdAt: '2025-07-28T00:00:00.000Z',
  paidAt: null,
  hostedUrl: null,
  pdfUrl: null,
} as const;

function invoicePage(state: BillingFixtureState): InvoicePage {
  const items = state === 'failed-invoice' ? [failedInvoice] : [paidInvoice];
  return { items, nextCursor: null, totalCount: items.length };
}

const invoiceSummary = {
  totalCount: 1,
  lastInvoiceAt: '2025-07-01T00:00:00.000Z',
  selectedYear: 2025,
  yearToDateAmounts: [{ currency: 'eur', amountMinor: 1900 }],
  availableYears: [2025],
} as const satisfies InvoiceSummary;

const allowedFixtureStates = {
  subscription: ['free', 'active', 'past-due', 'scheduled-cancel'],
  usage: ['active', 'empty-usage'],
  checkout: ['active'],
  portal: ['active', 'past-due', 'scheduled-cancel'],
  invoices: ['active', 'failed-invoice'],
  'limit-reached': ['limit-reached'],
} as const satisfies Record<
  BillingFixtureScreen,
  readonly BillingFixtureState[]
>;

export function isBillingFixtureSelection(
  screen: unknown,
  state: unknown,
): screen is BillingFixtureScreen {
  const parsedScreen = fixtureScreenSchema.safeParse(screen);
  const parsedState = fixtureStateSchema.safeParse(state);
  return (
    parsedScreen.success &&
    parsedState.success &&
    (
      allowedFixtureStates[parsedScreen.data] as readonly BillingFixtureState[]
    ).includes(parsedState.data)
  );
}

function subscriptionFixture(state: BillingFixtureState) {
  return {
    screen: 'subscription',
    state,
    now,
    presentation: toSubscriptionPresentation(snapshotFor(state), {
      ...presentationOptions,
      paymentMethod: {
        status: 'available',
        brand: 'visa',
        last4: '4242',
        expMonth: 8,
        expYear: 2028,
      },
    }),
  } as const;
}

function usageFixture(state: BillingFixtureState) {
  const subscription = toSubscriptionPresentation(
    snapshotFor('active'),
    presentationOptions,
  );
  const page =
    state === 'empty-usage'
      ? ({
          items: [],
          nextCursor: null,
          totalCount: 0,
        } satisfies UsageLedgerPage)
      : usagePage;
  return {
    screen: 'usage',
    state,
    now,
    subscription: {
      usage: subscription.usage,
      resetAt: subscription.resetAt,
      resetAtLabel: subscription.resetAtLabel,
    },
    usage: toUsagePresentation(page, presentationOptions),
  } as const;
}

function checkoutFixture(state: BillingFixtureState) {
  const presentation = toCheckoutPresentation(
    prismProPlan,
    prismMonthly,
    presentationOptions,
  );
  return {
    screen: 'checkout',
    state,
    now,
    presentation,
    prices: [prismMonthly, prismYearly].map(
      (price) =>
        toCheckoutPresentation(prismProPlan, price, presentationOptions).price,
    ),
    totals: {
      subtotal: '€49.00',
      discount: '—',
      tax: 'Calculated after billing address',
      total: '€49.00',
      currency: 'EUR',
    },
  } as const;
}

function portalFixture(state: BillingFixtureState) {
  const snapshot = snapshotFor(state);
  const subscription = toSubscriptionPresentation(snapshot, {
    ...presentationOptions,
    paymentMethod: {
      status: 'available',
      brand: 'visa',
      last4: '4242',
      expMonth: 8,
      expYear: 2028,
    },
  });
  return {
    screen: 'portal',
    state,
    now,
    subscription: {
      currentPlan: subscription.currentPlan,
      currentPrice: subscription.currentPrice,
      entitlement: subscription.entitlement,
      resetAt: subscription.resetAt,
      resetAtLabel: subscription.resetAtLabel,
      paymentMethod: subscription.paymentMethod,
      outstandingBalance: {
        amountMinor: snapshot.paymentSummary.outstandingAmountMinor,
        currency: snapshot.paymentSummary.currency,
        formattedAmount: formatMoney({
          amountMinor: snapshot.paymentSummary.outstandingAmountMinor,
          currency: snapshot.paymentSummary.currency,
          locale: presentationOptions.locale,
        }),
      },
    },
    activity: toInvoicePresentation(invoicePage(state), presentationOptions),
  } as const;
}

function invoicesFixture(state: BillingFixtureState) {
  const subscription = toSubscriptionPresentation(
    snapshotFor(state === 'failed-invoice' ? 'past-due' : 'active'),
    presentationOptions,
  );
  return {
    screen: 'invoices',
    state,
    now,
    subscription: {
      resetAt: subscription.resetAt,
      resetAtLabel: subscription.resetAtLabel,
      entitlement: subscription.entitlement,
    },
    invoices: toInvoicePresentation(invoicePage(state), presentationOptions),
    summary: toInvoiceSummaryPresentation(
      state === 'failed-invoice'
        ? { ...invoiceSummary, lastInvoiceAt: failedInvoice.createdAt }
        : invoiceSummary,
      presentationOptions,
    ),
  } as const;
}

function limitFixture(state: BillingFixtureState) {
  return {
    screen: 'limit-reached',
    state,
    now,
    presentation: toSubscriptionPresentation(
      snapshotFor('limit-reached'),
      presentationOptions,
    ),
  } as const;
}

export type BillingFixture =
  | ReturnType<typeof subscriptionFixture>
  | ReturnType<typeof usageFixture>
  | ReturnType<typeof checkoutFixture>
  | ReturnType<typeof portalFixture>
  | ReturnType<typeof invoicesFixture>
  | ReturnType<typeof limitFixture>;

export function getBillingFixture(
  screen: unknown,
  state: unknown,
): BillingFixture {
  if (!isBillingFixtureSelection(screen, state)) {
    throw new Error('Invalid billing fixture selection');
  }

  switch (screen) {
    case 'subscription':
      return subscriptionFixture(state as BillingFixtureState);
    case 'usage':
      return usageFixture(state as BillingFixtureState);
    case 'checkout':
      return checkoutFixture(state as BillingFixtureState);
    case 'portal':
      return portalFixture(state as BillingFixtureState);
    case 'invoices':
      return invoicesFixture(state as BillingFixtureState);
    case 'limit-reached':
      return limitFixture(state as BillingFixtureState);
  }
}
