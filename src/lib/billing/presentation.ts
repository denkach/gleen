import { z } from 'zod';

import { formatCurrency, formatDate } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/locales';
import type { BillingMessages } from '@/lib/i18n/messages/billing';

import {
  billingPlanSchema,
  billingPaymentMethodSchema,
  billingPriceForPlanSchema,
  billingPriceSchema,
  billingSnapshotSchema,
  billingSubscriptionStatusSchema,
  invoicePageSchema,
  invoiceSummarySchema,
  usageLedgerPageSchema,
  type BillingPlan,
  type BillingPaymentMethod,
  type BillingPrice,
  type BillingPlanSlug,
  type BillingSnapshot,
  type BillingSubscriptionStatus,
  type InvoicePage,
  type InvoiceSummary,
  type UsageLedgerPage,
} from './domain';

export type SemanticVariant = 'neutral' | 'positive' | 'warning' | 'negative';

export type PresentationOptions = Readonly<{
  locale: Locale;
  copy: BillingMessages;
  timeZone?: string;
}>;

export const billingPresentationDefaults = Object.freeze({
  timeZone: 'UTC',
} as const);

export type MoneyPresentation = Readonly<{
  amountMinor: number;
  currency: string;
  formattedAmount: string;
}>;

export type PricePresentation = Readonly<
  MoneyPresentation & {
    interval: BillingPrice['interval'];
    savingsPercent: number | null;
    monthlyEquivalent: MoneyPresentation;
  }
>;

export type EntitlementStatus =
  'free' | 'trial' | 'active' | 'past_due_with_access';

const entitlementStatusInputSchema = z
  .object({
    status: billingSubscriptionStatusSchema.nullable(),
    paidThrough: z.iso.datetime({ offset: true }).nullable(),
    now: z.iso.datetime({ offset: true }),
  })
  .strict();

export function toEntitlementStatus(input: {
  status: BillingSubscriptionStatus | null;
  paidThrough: string | null;
  now: string;
}): EntitlementStatus {
  const parsed = entitlementStatusInputSchema.parse(input);
  const hasAccess =
    parsed.paidThrough !== null &&
    Date.parse(parsed.paidThrough) > Date.parse(parsed.now);

  if (!hasAccess) return 'free';
  if (parsed.status === 'trialing') return 'trial';
  if (parsed.status === 'active') return 'active';
  if (parsed.status === 'past_due') return 'past_due_with_access';

  return 'free';
}

const moneyInputSchema = z
  .object({
    amountMinor: z.number().int().safe(),
    currency: z.string().regex(/^[a-z]{3}$/),
    locale: z.enum(['uk', 'ru', 'en', 'es', 'de']),
  })
  .strict();

export function formatMoney(input: {
  amountMinor: number;
  currency: string;
  locale: Locale;
}): string {
  const parsed = moneyInputSchema.parse(input);
  return formatCurrency(parsed);
}

function toMoney(
  amountMinor: number,
  currency: string,
  locale: Locale,
): MoneyPresentation {
  return {
    amountMinor,
    currency,
    formattedAmount: formatMoney({ amountMinor, currency, locale }),
  };
}

function toPrice(price: BillingPrice, locale: Locale): PricePresentation {
  return {
    ...toMoney(price.amountMinor, price.currency, locale),
    interval: price.interval,
    savingsPercent: price.savingsPercent,
    monthlyEquivalent: toMoney(
      price.monthlyEquivalentMinor,
      price.currency,
      locale,
    ),
  };
}

function formatBillingDate(
  value: string,
  options: PresentationOptions,
  includeTime: boolean,
): string {
  return formatDate({
    value,
    locale: options.locale,
    fallback: '—',
    options: {
      dateStyle: 'medium',
      ...(includeTime ? { timeStyle: 'short' as const } : {}),
      timeZone: options.timeZone ?? billingPresentationDefaults.timeZone,
    },
  });
}

const entitlementVariants = {
  free: 'neutral',
  trial: 'positive',
  active: 'positive',
  past_due_with_access: 'warning',
} as const satisfies Record<EntitlementStatus, SemanticVariant>;

function entitlementLabel(
  entitlement: EntitlementStatus,
  copy: BillingMessages,
): string {
  if (entitlement === 'past_due_with_access') {
    return copy.presentation.entitlement.pastDue;
  }
  return copy.presentation.entitlement[entitlement];
}

function planAction(plan: BillingPlan, copy: BillingMessages) {
  return plan.purchasable
    ? ({ enabled: true, reason: null } as const)
    : ({
        enabled: false,
        reason: copy.presentation.planUnavailable,
      } as const);
}

export type CheckoutPresentation = Readonly<{
  plan: BillingPlan;
  price: PricePresentation;
  action: Readonly<{
    enabled: boolean;
    reason: string | null;
  }>;
}>;

export function toCheckoutPresentation(
  plan: BillingPlan,
  price: BillingPrice,
  options: PresentationOptions,
): CheckoutPresentation {
  const parsedPlan = billingPlanSchema.parse(plan);
  const parsedPrice = billingPriceSchema.parse(price);

  if (
    !billingPriceForPlanSchema(parsedPlan.slug).safeParse(parsedPrice).success
  ) {
    throw new Error('Catalog price does not belong to the selected plan');
  }

  return {
    plan: parsedPlan,
    price: toPrice(parsedPrice, options.locale),
    action: planAction(parsedPlan, options.copy),
  };
}

export type SubscriptionPresentation = Readonly<{
  currentPlan: BillingPlan;
  currentPrice: PricePresentation | null;
  entitlement: Readonly<{
    key: EntitlementStatus;
    label: string;
    variant: SemanticVariant;
  }>;
  usage: BillingSnapshot['usage'];
  resetAt: string;
  resetAtLabel: string;
  scheduledChange: BillingSnapshot['scheduledChange'];
  paymentMethod:
    | Readonly<{
        status: 'available';
        label: string;
        expiryLabel: string;
      }>
    | Readonly<{
        status: 'unavailable';
        label: string;
        expiryLabel: null;
      }>;
  availablePlans: readonly Readonly<{
    plan: BillingPlan;
    prices: readonly PricePresentation[];
    action: Readonly<{ enabled: boolean; reason: string | null }>;
  }>[];
}>;

export function toSubscriptionPresentation(
  snapshot: BillingSnapshot,
  options: PresentationOptions & {
    now?: string;
    paymentMethod?: BillingPaymentMethod;
  },
): SubscriptionPresentation {
  const parsed = billingSnapshotSchema.parse(snapshot);
  const now = options.now ?? new Date().toISOString();
  const entitlement = toEntitlementStatus({
    status: parsed.paymentSummary.subscriptionStatus,
    paidThrough: parsed.paymentSummary.paidThrough,
    now,
  });
  const paymentMethod = billingPaymentMethodSchema.parse(
    options.paymentMethod ?? { status: 'unavailable' },
  );

  return {
    currentPlan: parsed.currentPlan,
    currentPrice:
      parsed.currentPrice === null
        ? null
        : toPrice(parsed.currentPrice, options.locale),
    entitlement: {
      key: entitlement,
      label: entitlementLabel(entitlement, options.copy),
      variant: entitlementVariants[entitlement],
    },
    usage: parsed.usage,
    resetAt: parsed.period.endsAt,
    resetAtLabel: formatBillingDate(parsed.period.endsAt, options, false),
    scheduledChange: parsed.scheduledChange,
    paymentMethod:
      paymentMethod.status === 'available'
        ? {
            status: 'available',
            label: `${paymentMethod.brand.replace(/(^|\s)\S/g, (character) =>
              character.toUpperCase(),
            )} •••• ${paymentMethod.last4}`,
            expiryLabel: options.copy.presentation.payment.expires(
              String(paymentMethod.expMonth).padStart(2, '0'),
              paymentMethod.expYear,
            ),
          }
        : {
            status: 'unavailable',
            label: options.copy.presentation.payment.managed,
            expiryLabel: null,
          },
    availablePlans: parsed.availablePlans.map(({ plan, prices }) => ({
      plan,
      prices: prices.map((price) => toPrice(price, options.locale)),
      action: planAction(plan, options.copy),
    })),
  };
}

export type LimitReachedPresentation = SubscriptionPresentation &
  Readonly<{
    limitUpgrade: Readonly<{
      plan: BillingPlan;
      rows: readonly Readonly<{
        id: string;
        baseline: string;
        benefit: string;
      }>[];
    }> | null;
  }>;

export function toLimitReachedPresentation(
  snapshot: BillingSnapshot,
  options: PresentationOptions & {
    now?: string;
    paymentMethod?: BillingPaymentMethod;
  },
): LimitReachedPresentation {
  const presentation = toSubscriptionPresentation(snapshot, options);
  const upgrade =
    presentation.availablePlans.find(
      ({ plan, action }) =>
        plan.slug !== presentation.currentPlan.slug &&
        plan.analysisLimit > presentation.currentPlan.analysisLimit &&
        action.enabled,
    ) ?? null;

  if (upgrade === null) return { ...presentation, limitUpgrade: null };

  const rowCount = Math.max(
    presentation.currentPlan.features.length,
    upgrade.plan.features.length,
  );
  const rows = Array.from({ length: rowCount }, (_, index) => ({
    id: `${presentation.currentPlan.slug}-to-${upgrade.plan.slug}-${index}`,
    baseline:
      presentation.currentPlan.features[index] ??
      options.copy.presentation.featureFallback.current,
    benefit:
      upgrade.plan.features[index] ??
      options.copy.presentation.featureFallback.upgrade,
  }));

  return {
    ...presentation,
    limitUpgrade: { plan: upgrade.plan, rows },
  };
}

const usageEventVariants = {
  reservation: 'warning',
  settlement: 'neutral',
  release: 'positive',
  period_renewal: 'positive',
  manual_adjustment: 'neutral',
  refund: 'positive',
  technical_retry: 'neutral',
} as const satisfies Record<
  UsageLedgerPage['items'][number]['eventType'],
  SemanticVariant
>;

const usageStatusVariants = {
  reserved: 'warning',
  settled: 'neutral',
  released: 'positive',
  applied: 'positive',
  informational: 'neutral',
} as const satisfies Record<
  UsageLedgerPage['items'][number]['status'],
  SemanticVariant
>;

function usageEventLabel(
  event: UsageLedgerPage['items'][number]['eventType'],
  copy: BillingMessages,
): string {
  const labels = copy.presentation.usage.event;
  const key = {
    reservation: 'reservation',
    settlement: 'settlement',
    release: 'release',
    period_renewal: 'periodRenewal',
    manual_adjustment: 'manualAdjustment',
    refund: 'refund',
    technical_retry: 'technicalRetry',
  } as const;
  return labels[key[event]];
}

function usageSourceLabel(
  source: UsageLedgerPage['items'][number]['source'],
  copy: BillingMessages,
): string {
  const labels = copy.presentation.usage.source;
  const key = {
    analysis_pipeline: 'analysisPipeline',
    stripe_webhook: 'stripe',
    system: 'system',
    manual: 'manual',
  } as const;
  return labels[key[source]];
}

export type UsagePresentation = Readonly<{
  items: readonly Readonly<{
    id: string;
    planSlug: BillingPlanSlug;
    quantity: number;
    remainingBalance: number;
    occurredAt: string;
    occurredAtLabel: string;
    event: Readonly<{
      key: UsageLedgerPage['items'][number]['eventType'];
      label: string;
      title: string;
      variant: SemanticVariant;
    }>;
    source: Readonly<{
      key: UsageLedgerPage['items'][number]['source'];
      label: string;
      detail: string | null;
    }>;
    status: Readonly<{
      key: UsageLedgerPage['items'][number]['status'];
      label: string;
      variant: SemanticVariant;
    }>;
    jobId: string | null;
    analysisId: string | null;
  }>[];
  nextCursor: string | null;
  totalCount: number;
}>;

export function toUsagePresentation(
  page: UsageLedgerPage,
  options: PresentationOptions,
): UsagePresentation {
  const parsed = usageLedgerPageSchema.parse(page);

  return {
    items: parsed.items.map((entry) => {
      const eventLabel = usageEventLabel(entry.eventType, options.copy);
      return {
        id: entry.id,
        planSlug: entry.planSlug,
        quantity: entry.quantity,
        remainingBalance: entry.remainingBalance,
        occurredAt: entry.occurredAt,
        occurredAtLabel: formatBillingDate(entry.occurredAt, options, true),
        event: {
          key: entry.eventType,
          label: eventLabel,
          variant: usageEventVariants[entry.eventType],
          title:
            entry.analysisTitle === null
              ? eventLabel
              : `${eventLabel} — ${entry.analysisTitle}`,
        },
        source: {
          key: entry.source,
          label: usageSourceLabel(entry.source, options.copy),
          detail: entry.channelTitle,
        },
        status: {
          key: entry.status,
          label: options.copy.presentation.usage.status[entry.status],
          variant: usageStatusVariants[entry.status],
        },
        jobId: entry.jobId,
        analysisId: entry.analysisId,
      };
    }),
    nextCursor: parsed.nextCursor,
    totalCount: parsed.totalCount,
  };
}

const invoiceStatusVariants = {
  draft: 'neutral',
  open: 'warning',
  paid: 'positive',
  uncollectible: 'negative',
  void: 'neutral',
  failed: 'negative',
} as const satisfies Record<
  InvoicePage['items'][number]['status'],
  SemanticVariant
>;

export type InvoicePresentation = Readonly<{
  items: readonly Readonly<{
    id: string;
    number: string | null;
    planSlug: BillingPlanSlug;
    planName: string;
    interval: BillingPrice['interval'];
    amountDue: MoneyPresentation;
    amountPaid: MoneyPresentation;
    refundedAmount: MoneyPresentation;
    status: Readonly<{
      key: InvoicePage['items'][number]['status'] | 'refunded';
      label: string;
      variant: SemanticVariant;
    }>;
    createdAt: string;
    createdAtLabel: string;
    dueAt: string | null;
    dueAtLabel: string | null;
    paidAt: string | null;
    paidAtLabel: string | null;
    hostedUrl: string | null;
    pdfUrl: string | null;
  }>[];
  nextCursor: string | null;
  totalCount: number;
}>;

export type InvoiceSummaryPresentation = Readonly<{
  totalCount: number;
  lastInvoiceAt: string | null;
  lastInvoiceAtLabel: string;
  yearToDateSpendLabel: string;
  availableYears: readonly number[];
}>;

export function toInvoiceSummaryPresentation(
  summary: InvoiceSummary,
  options: PresentationOptions,
): InvoiceSummaryPresentation {
  const parsed = invoiceSummarySchema.parse(summary);
  const amounts = parsed.yearToDateAmounts;
  return {
    totalCount: parsed.totalCount,
    lastInvoiceAt: parsed.lastInvoiceAt,
    lastInvoiceAtLabel:
      parsed.lastInvoiceAt === null
        ? options.copy.presentation.invoice.noInvoices
        : formatBillingDate(parsed.lastInvoiceAt, options, false),
    yearToDateSpendLabel:
      amounts.length === 1
        ? formatMoney({
            amountMinor: amounts[0]!.amountMinor,
            currency: amounts[0]!.currency,
            locale: options.locale,
          })
        : amounts.length === 0
          ? '—'
          : options.copy.presentation.invoice.multipleCurrencies,
    availableYears: parsed.availableYears,
  };
}

export function toInvoicePresentation(
  page: InvoicePage,
  options: PresentationOptions,
): InvoicePresentation {
  const parsed = invoicePageSchema.parse(page);
  const formatNullableDate = (value: string | null) =>
    value === null ? null : formatBillingDate(value, options, false);

  return {
    items: parsed.items.map((invoice) => {
      const refunded = invoice.refundStatus !== 'none';
      return {
        id: invoice.id,
        number: invoice.number,
        planSlug: invoice.planSlug,
        planName: invoice.planName,
        interval: invoice.interval,
        amountDue: toMoney(
          invoice.amountDueMinor,
          invoice.currency,
          options.locale,
        ),
        amountPaid: toMoney(
          invoice.amountPaidMinor,
          invoice.currency,
          options.locale,
        ),
        refundedAmount: toMoney(
          invoice.refundedAmountMinor,
          invoice.currency,
          options.locale,
        ),
        status: refunded
          ? ({
              key: 'refunded',
              label:
                invoice.refundStatus === 'full'
                  ? options.copy.presentation.invoice.status.refunded
                  : options.copy.presentation.invoice.status.partiallyRefunded,
              variant: 'warning',
            } as const)
          : {
              key: invoice.status,
              label: options.copy.presentation.invoice.status[invoice.status],
              variant: invoiceStatusVariants[invoice.status],
            },
        createdAt: invoice.createdAt,
        createdAtLabel: formatBillingDate(invoice.createdAt, options, false),
        dueAt: invoice.dueAt,
        dueAtLabel: formatNullableDate(invoice.dueAt),
        paidAt: invoice.paidAt,
        paidAtLabel: formatNullableDate(invoice.paidAt),
        hostedUrl: invoice.hostedUrl,
        pdfUrl: invoice.pdfUrl,
      };
    }),
    nextCursor: parsed.nextCursor,
    totalCount: parsed.totalCount,
  };
}
