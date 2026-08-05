import { z } from 'zod';

import { billingMessages } from '@/lib/i18n/messages/billing';
import type { Locale } from '@/lib/i18n/locales';

import type {
  BillingPlanCatalogRow,
  BillingPlanSlug,
  BillingSnapshot,
  InvoicePage,
  InvoiceSummary,
  UsageLedgerPage,
} from './domain';
import { parseBillingCatalogRows } from './domain';
import {
  formatMoney,
  toCheckoutPresentation,
  toInvoicePresentation,
  toInvoiceSummaryPresentation,
  toLimitReachedPresentation,
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
  'error',
] as const;

export type BillingFixtureScreen = (typeof billingFixtureScreens)[number];
export type BillingFixtureState = (typeof billingFixtureStates)[number];

const fixtureScreenSchema = z.enum(billingFixtureScreens);
const fixtureStateSchema = z.enum(billingFixtureStates);
const now = '2025-07-29T00:00:00.000Z';
function presentationOptions(locale: Locale) {
  return {
    locale,
    copy: billingMessages[locale],
    timeZone: 'UTC',
    now,
  } as const;
}

function paidCatalogRows(plan: {
  slug: Exclude<BillingPlanSlug, 'free'>;
  displayName: string;
  description: string;
  analysisLimit: number;
  features: readonly string[];
  displayOrder: number;
  purchasable: boolean;
  monthlyAmount: number;
  yearlyAmount: number;
  yearlyMonthlyEquivalent: number;
  comparisonCopy: string;
}): readonly BillingPlanCatalogRow[] {
  const base = {
    slug: plan.slug,
    display_name: plan.displayName,
    description: plan.description,
    analysis_limit: plan.analysisLimit,
    features: plan.features,
    display_order: plan.displayOrder,
    is_default: false,
    is_purchasable: plan.purchasable,
  };
  return [
    {
      ...base,
      billing_interval: 'month',
      currency: 'usd',
      unit_amount_minor: plan.monthlyAmount,
      monthly_equivalent_minor: plan.monthlyAmount,
      comparison_copy: null,
      savings_copy: null,
    },
    {
      ...base,
      billing_interval: 'year',
      currency: 'usd',
      unit_amount_minor: plan.yearlyAmount,
      monthly_equivalent_minor: plan.yearlyMonthlyEquivalent,
      comparison_copy: plan.comparisonCopy,
      savings_copy: 'Save 20%',
    },
  ];
}

export const billingFixtureCatalogRows = [
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
  ...paidCatalogRows({
    slug: 'starter',
    displayName: 'Starter',
    description: 'For individuals getting started with AI analysis.',
    analysisLimit: 10,
    features: [
      '10 analyses per month',
      'Basic insights & summaries',
      'Standard templates',
      'Export results',
      'Email support',
    ],
    displayOrder: 1,
    purchasable: true,
    monthlyAmount: 1900,
    yearlyAmount: 18000,
    yearlyMonthlyEquivalent: 1500,
    comparisonCopy: '$19 monthly',
  }),
  ...paidCatalogRows({
    slug: 'prism-pro',
    displayName: 'Prism Pro',
    description:
      'For professionals who need deeper insights and more capacity.',
    analysisLimit: 25,
    features: [
      '25 analyses per month',
      'Advanced insights & takeaways',
      'All premium templates',
      'Export & download',
      'Priority support',
    ],
    displayOrder: 2,
    purchasable: true,
    monthlyAmount: 4900,
    yearlyAmount: 46800,
    yearlyMonthlyEquivalent: 3900,
    comparisonCopy: '$49 monthly',
  }),
  ...paidCatalogRows({
    slug: 'team',
    displayName: 'Team',
    description: 'For teams collaborating and scaling their impact.',
    analysisLimit: 100,
    features: [
      '100 analyses per month',
      'Team workspace',
      'Collaboration & sharing',
      'Admin controls & roles',
      'Priority onboarding',
    ],
    displayOrder: 3,
    purchasable: false,
    monthlyAmount: 12900,
    yearlyAmount: 123600,
    yearlyMonthlyEquivalent: 10300,
    comparisonCopy: '$129 monthly',
  }),
] satisfies readonly BillingPlanCatalogRow[];

export const billingFixtureCatalog = parseBillingCatalogRows(
  billingFixtureCatalogRows,
);

function catalogPlan(slug: BillingPlanSlug) {
  const entry = billingFixtureCatalog.find((row) => row.plan.slug === slug);
  if (entry === undefined) {
    throw new Error(`Missing canonical fixture plan: ${slug}`);
  }
  return entry;
}

function catalogPrice(slug: BillingPlanSlug, interval: 'month' | 'year') {
  const price = catalogPlan(slug).prices.find(
    (candidate) => candidate.interval === interval,
  );
  if (price === undefined) {
    throw new Error(`Missing canonical fixture price: ${slug}/${interval}`);
  }
  return price;
}

const freePlan = catalogPlan('free').plan;
const starterPlan = catalogPlan('starter').plan;
const prismProPlan = catalogPlan('prism-pro').plan;
const starterMonthly = catalogPrice('starter', 'month');
const prismMonthly = catalogPrice('prism-pro', 'month');
const prismYearly = catalogPrice('prism-pro', 'year');
const availablePlans = billingFixtureCatalog;

function snapshotFor(state: BillingFixtureState): BillingSnapshot {
  const isFree = state === 'free';
  const isLimit = state === 'limit-reached';
  const currentPlan = isFree ? freePlan : starterPlan;
  const used = isLimit ? 9 : isFree ? 1 : 2;
  const reserved = isFree ? 0 : 1;
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
            revision: null,
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
      currency: 'usd',
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
  currency: 'usd',
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
  yearToDateAmounts: [{ currency: 'usd', amountMinor: 1900 }],
  availableYears: [2025],
} as const satisfies InvoiceSummary;

const allowedFixtureStates = {
  subscription: ['free', 'active', 'past-due', 'scheduled-cancel', 'error'],
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

function shellFor(snapshot: BillingSnapshot) {
  const used = snapshot.usage.used + snapshot.usage.reserved;
  const remaining = snapshot.usage.remaining;
  return {
    identity: {
      displayName: 'Billing Preview',
      email: 'preview@example.invalid',
      initials: 'BP',
    },
    usage: {
      status: 'available',
      planName: snapshot.currentPlan.displayName,
      used,
      remaining,
      limit: snapshot.usage.limit,
      resetAt: snapshot.period.endsAt,
    },
  } as const;
}

function subscriptionFixture(state: BillingFixtureState, locale: Locale) {
  const snapshot = snapshotFor(state === 'error' ? 'active' : state);
  const options = presentationOptions(locale);
  return {
    screen: 'subscription',
    state,
    now,
    shell: shellFor(snapshot),
    presentation:
      state === 'error'
        ? null
        : toSubscriptionPresentation(snapshot, {
            ...options,
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

function usageFixture(state: BillingFixtureState, locale: Locale) {
  const snapshot = snapshotFor('active');
  const options = presentationOptions(locale);
  const subscription = toSubscriptionPresentation(snapshot, options);
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
    shell: shellFor(snapshot),
    subscription: {
      usage: subscription.usage,
      resetAt: subscription.resetAt,
      resetAtLabel: subscription.resetAtLabel,
    },
    usage: toUsagePresentation(page, options),
  } as const;
}

function checkoutFixture(state: BillingFixtureState, locale: Locale) {
  const snapshot = snapshotFor('active');
  const options = presentationOptions(locale);
  const presentation = toCheckoutPresentation(
    prismProPlan,
    prismMonthly,
    options,
  );
  return {
    screen: 'checkout',
    state,
    now,
    shell: shellFor(snapshot),
    presentation,
    prices: [prismMonthly, prismYearly].map(
      (price) => toCheckoutPresentation(prismProPlan, price, options).price,
    ),
    totals: {
      subtotal: formatMoney({
        amountMinor: 4900,
        currency: 'usd',
        locale,
      }),
      discount: '—',
      tax: billingMessages[locale].checkout.order.calculatedAfterAddress,
      total: formatMoney({ amountMinor: 4900, currency: 'usd', locale }),
      currency: 'USD',
    },
  } as const;
}

function portalFixture(state: BillingFixtureState, locale: Locale) {
  const snapshot = snapshotFor(state);
  const options = presentationOptions(locale);
  const subscription = toSubscriptionPresentation(snapshot, {
    ...options,
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
    shell: shellFor(snapshot),
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
          locale,
        }),
      },
    },
    activity: toInvoicePresentation(invoicePage(state), options),
  } as const;
}

function invoicesFixture(state: BillingFixtureState, locale: Locale) {
  const snapshot = snapshotFor(
    state === 'failed-invoice' ? 'past-due' : 'active',
  );
  const options = presentationOptions(locale);
  const subscription = toSubscriptionPresentation(snapshot, options);
  return {
    screen: 'invoices',
    state,
    now,
    shell: shellFor(snapshot),
    subscription: {
      resetAt: subscription.resetAt,
      resetAtLabel: subscription.resetAtLabel,
      entitlement: subscription.entitlement,
    },
    invoices: toInvoicePresentation(invoicePage(state), options),
    summary: toInvoiceSummaryPresentation(
      state === 'failed-invoice'
        ? { ...invoiceSummary, lastInvoiceAt: failedInvoice.createdAt }
        : invoiceSummary,
      options,
    ),
  } as const;
}

function limitFixture(state: BillingFixtureState, locale: Locale) {
  const snapshot = snapshotFor('limit-reached');
  return {
    screen: 'limit-reached',
    state,
    now,
    shell: shellFor(snapshot),
    presentation: toLimitReachedPresentation(
      snapshot,
      presentationOptions(locale),
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
  locale: Locale = 'en',
): BillingFixture {
  if (!isBillingFixtureSelection(screen, state)) {
    throw new Error('Invalid billing fixture selection');
  }

  switch (screen) {
    case 'subscription':
      return subscriptionFixture(state as BillingFixtureState, locale);
    case 'usage':
      return usageFixture(state as BillingFixtureState, locale);
    case 'checkout':
      return checkoutFixture(state as BillingFixtureState, locale);
    case 'portal':
      return portalFixture(state as BillingFixtureState, locale);
    case 'invoices':
      return invoicesFixture(state as BillingFixtureState, locale);
    case 'limit-reached':
      return limitFixture(state as BillingFixtureState, locale);
  }
}
