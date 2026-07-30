import { z } from 'zod';

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
  locale?: string;
  timeZone?: string;
}>;

export const billingPresentationDefaults = Object.freeze({
  locale: 'en-US',
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
    locale: z.string().min(1).optional(),
  })
  .strict();

export function formatMoney(input: {
  amountMinor: number;
  currency: string;
  locale?: string;
}): string {
  const parsed = moneyInputSchema.parse(input);
  const formatter = new Intl.NumberFormat(
    parsed.locale ?? billingPresentationDefaults.locale,
    {
      style: 'currency',
      currency: parsed.currency.toUpperCase(),
      currencyDisplay: 'narrowSymbol',
    },
  );
  const minorUnitScale =
    10 ** (formatter.resolvedOptions().maximumFractionDigits ?? 2);

  return formatter.format(parsed.amountMinor / minorUnitScale);
}

function toMoney(
  amountMinor: number,
  currency: string,
  locale?: string,
): MoneyPresentation {
  return {
    amountMinor,
    currency,
    formattedAmount: formatMoney({ amountMinor, currency, locale }),
  };
}

function toPrice(price: BillingPrice, locale?: string): PricePresentation {
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

function createDateFormatter(
  options: PresentationOptions,
  includeTime: boolean,
): Intl.DateTimeFormat {
  return new Intl.DateTimeFormat(
    options.locale ?? billingPresentationDefaults.locale,
    {
      dateStyle: 'medium',
      ...(includeTime ? { timeStyle: 'short' as const } : {}),
      timeZone: options.timeZone ?? billingPresentationDefaults.timeZone,
    },
  );
}

const entitlementCopy = {
  free: { label: 'Free', variant: 'neutral' },
  trial: { label: 'Trial', variant: 'positive' },
  active: { label: 'Active', variant: 'positive' },
  past_due_with_access: {
    label: 'Payment due — access remains active',
    variant: 'warning',
  },
} as const satisfies Record<
  EntitlementStatus,
  Readonly<{ label: string; variant: SemanticVariant }>
>;

function planAction(plan: BillingPlan) {
  return plan.purchasable
    ? ({ enabled: true, reason: null } as const)
    : ({
        enabled: false,
        reason: 'This plan is not available for purchase.',
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
  options: Pick<PresentationOptions, 'locale'> = {},
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
    action: planAction(parsedPlan),
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
  } = {},
): SubscriptionPresentation {
  const parsed = billingSnapshotSchema.parse(snapshot);
  const now = options.now ?? new Date().toISOString();
  const entitlement = toEntitlementStatus({
    status: parsed.paymentSummary.subscriptionStatus,
    paidThrough: parsed.paymentSummary.paidThrough,
    now,
  });
  const dateFormatter = createDateFormatter(options, false);
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
      ...entitlementCopy[entitlement],
    },
    usage: parsed.usage,
    resetAt: parsed.period.endsAt,
    resetAtLabel: dateFormatter.format(new Date(parsed.period.endsAt)),
    scheduledChange: parsed.scheduledChange,
    paymentMethod:
      paymentMethod.status === 'available'
        ? {
            status: 'available',
            label: `${paymentMethod.brand.replace(/(^|\s)\S/g, (character) =>
              character.toUpperCase(),
            )} •••• ${paymentMethod.last4}`,
            expiryLabel: `Expires ${String(paymentMethod.expMonth).padStart(
              2,
              '0',
            )}/${paymentMethod.expYear}`,
          }
        : {
            status: 'unavailable',
            label: 'Managed in billing portal',
            expiryLabel: null,
          },
    availablePlans: parsed.availablePlans.map(({ plan, prices }) => ({
      plan,
      prices: prices.map((price) => toPrice(price, options.locale)),
      action: planAction(plan),
    })),
  };
}

export type LimitReachedPresentation = SubscriptionPresentation &
  Readonly<{
    limitUpgrade: Readonly<{
      plan: BillingPlan;
      rows: readonly Readonly<{
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
  } = {},
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
    baseline:
      presentation.currentPlan.features[index] ??
      'Not included in the current plan',
    benefit:
      upgrade.plan.features[index] ?? 'No additional catalog benefit listed',
  }));

  return {
    ...presentation,
    limitUpgrade: { plan: upgrade.plan, rows },
  };
}

const usageEventCopy = {
  reservation: { label: 'Reserved', variant: 'warning' },
  settlement: { label: 'Used', variant: 'neutral' },
  release: { label: 'Released', variant: 'positive' },
  period_renewal: { label: 'Period renewed', variant: 'positive' },
  manual_adjustment: { label: 'Adjusted', variant: 'neutral' },
  refund: { label: 'Refunded', variant: 'positive' },
  technical_retry: { label: 'Technical retry', variant: 'neutral' },
} as const satisfies Record<
  UsageLedgerPage['items'][number]['eventType'],
  Readonly<{ label: string; variant: SemanticVariant }>
>;

const usageStatusCopy = {
  reserved: { label: 'Reserved', variant: 'warning' },
  settled: { label: 'Settled', variant: 'neutral' },
  released: { label: 'Released', variant: 'positive' },
  applied: { label: 'Applied', variant: 'positive' },
  informational: { label: 'Informational', variant: 'neutral' },
} as const satisfies Record<
  UsageLedgerPage['items'][number]['status'],
  Readonly<{ label: string; variant: SemanticVariant }>
>;

const usageSourceCopy = {
  analysis_pipeline: 'Analysis pipeline',
  stripe_webhook: 'Stripe',
  system: 'System',
  manual: 'Manual adjustment',
} as const satisfies Record<UsageLedgerPage['items'][number]['source'], string>;

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
  options: PresentationOptions = {},
): UsagePresentation {
  const parsed = usageLedgerPageSchema.parse(page);
  const dateFormatter = createDateFormatter(options, true);

  return {
    items: parsed.items.map((entry) => ({
      id: entry.id,
      planSlug: entry.planSlug,
      quantity: entry.quantity,
      remainingBalance: entry.remainingBalance,
      occurredAt: entry.occurredAt,
      occurredAtLabel: dateFormatter.format(new Date(entry.occurredAt)),
      event: {
        key: entry.eventType,
        ...usageEventCopy[entry.eventType],
        title:
          entry.analysisTitle === null
            ? usageEventCopy[entry.eventType].label
            : `${usageEventCopy[entry.eventType].label} — ${entry.analysisTitle}`,
      },
      source: {
        key: entry.source,
        label: usageSourceCopy[entry.source],
        detail: entry.channelTitle,
      },
      status: {
        key: entry.status,
        ...usageStatusCopy[entry.status],
      },
      jobId: entry.jobId,
      analysisId: entry.analysisId,
    })),
    nextCursor: parsed.nextCursor,
    totalCount: parsed.totalCount,
  };
}

const invoiceStatusCopy = {
  draft: { label: 'Draft', variant: 'neutral' },
  open: { label: 'Open', variant: 'warning' },
  paid: { label: 'Paid', variant: 'positive' },
  uncollectible: { label: 'Uncollectible', variant: 'negative' },
  void: { label: 'Void', variant: 'neutral' },
  failed: { label: 'Failed', variant: 'negative' },
} as const satisfies Record<
  InvoicePage['items'][number]['status'],
  Readonly<{ label: string; variant: SemanticVariant }>
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
  options: PresentationOptions = {},
): InvoiceSummaryPresentation {
  const parsed = invoiceSummarySchema.parse(summary);
  const amounts = parsed.yearToDateAmounts;
  return {
    totalCount: parsed.totalCount,
    lastInvoiceAt: parsed.lastInvoiceAt,
    lastInvoiceAtLabel:
      parsed.lastInvoiceAt === null
        ? 'No invoices'
        : createDateFormatter(options, false).format(
            new Date(parsed.lastInvoiceAt),
          ),
    yearToDateSpendLabel:
      amounts.length === 1
        ? formatMoney({
            amountMinor: amounts[0]!.amountMinor,
            currency: amounts[0]!.currency,
            locale: options.locale,
          })
        : amounts.length === 0
          ? '—'
          : 'Multiple currencies',
    availableYears: parsed.availableYears,
  };
}

export function toInvoicePresentation(
  page: InvoicePage,
  options: PresentationOptions = {},
): InvoicePresentation {
  const parsed = invoicePageSchema.parse(page);
  const dateFormatter = createDateFormatter(options, false);
  const formatNullableDate = (value: string | null) =>
    value === null ? null : dateFormatter.format(new Date(value));

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
                  ? 'Refunded'
                  : 'Partially refunded',
              variant: 'warning',
            } as const)
          : {
              key: invoice.status,
              ...invoiceStatusCopy[invoice.status],
            },
        createdAt: invoice.createdAt,
        createdAtLabel: dateFormatter.format(new Date(invoice.createdAt)),
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
