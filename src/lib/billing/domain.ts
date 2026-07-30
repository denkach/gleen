import { z } from 'zod';

const nonEmptyStringSchema = z.string().trim().min(1);
const identifierSchema = nonEmptyStringSchema;
const minorAmountSchema = z.number().int().safe().nonnegative();
const countSchema = z.number().int().safe().nonnegative();
const currencySchema = z.string().regex(/^[a-z]{3}$/);
const timestampSchema = z.iso.datetime({ offset: true });
const nullableTimestampSchema = timestampSchema.nullable();
const nullableUrlSchema = z.url().nullable();

export const billingIntervalSchema = z.enum(['month', 'year']);
export type BillingInterval = z.infer<typeof billingIntervalSchema>;

export const billingSubscriptionStatusSchema = z.enum([
  'trialing',
  'active',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'canceled',
  'paused',
]);
export type BillingSubscriptionStatus = z.infer<
  typeof billingSubscriptionStatusSchema
>;

export const billingPlanSlugSchema = z.enum([
  'free',
  'starter',
  'prism-pro',
  'team',
]);
export type BillingPlanSlug = z.infer<typeof billingPlanSlugSchema>;

export const billingPlanSchema = z
  .object({
    id: billingPlanSlugSchema,
    slug: billingPlanSlugSchema,
    displayName: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    analysisLimit: countSchema,
    features: z.array(nonEmptyStringSchema).readonly(),
    purchasable: z.boolean(),
  })
  .strict()
  .superRefine((plan, context) => {
    if (plan.id !== plan.slug) {
      context.addIssue({
        code: 'custom',
        message: 'Public plan ID must equal its stable slug',
        path: ['id'],
      });
    }
  })
  .readonly();
export type BillingPlan = z.infer<typeof billingPlanSchema>;

export const billingPriceSchema = z
  .object({
    planId: billingPlanSlugSchema,
    interval: billingIntervalSchema,
    amountMinor: minorAmountSchema,
    currency: currencySchema,
    savingsPercent: z.number().min(0).max(100).nullable(),
  })
  .strict()
  .readonly();
export type BillingPrice = z.infer<typeof billingPriceSchema>;

export const usageEventTypeSchema = z.enum([
  'reservation',
  'settlement',
  'release',
  'period_renewal',
  'manual_adjustment',
  'refund',
  'technical_retry',
]);
export type UsageEventType = z.infer<typeof usageEventTypeSchema>;

export const usageLedgerStatusSchema = z.enum([
  'reserved',
  'settled',
  'released',
  'applied',
  'informational',
]);
export type UsageLedgerStatus = z.infer<typeof usageLedgerStatusSchema>;

const validUsageStatusByEvent = {
  reservation: 'reserved',
  settlement: 'settled',
  release: 'released',
  period_renewal: 'applied',
  manual_adjustment: 'applied',
  refund: 'applied',
  technical_retry: 'informational',
} as const satisfies Record<UsageEventType, UsageLedgerStatus>;

export const usageLedgerEntrySchema = z
  .object({
    id: identifierSchema,
    planSlug: billingPlanSlugSchema,
    eventType: usageEventTypeSchema,
    quantity: z.number().int().safe(),
    status: usageLedgerStatusSchema,
    remainingBalance: countSchema,
    occurredAt: timestampSchema,
    jobId: identifierSchema.nullable(),
    analysisId: identifierSchema.nullable(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.status !== validUsageStatusByEvent[entry.eventType]) {
      context.addIssue({
        code: 'custom',
        message: 'Usage event does not match its normalized status',
        path: ['status'],
      });
    }
  })
  .readonly();
export type UsageLedgerEntry = z.infer<typeof usageLedgerEntrySchema>;

export const usageLedgerPageSchema = z
  .object({
    items: z.array(usageLedgerEntrySchema).readonly(),
    nextCursor: z.string().min(1).nullable(),
    totalCount: countSchema,
  })
  .strict()
  .readonly();
export type UsageLedgerPage = z.infer<typeof usageLedgerPageSchema>;

export const invoiceStatusSchema = z.enum([
  'draft',
  'open',
  'paid',
  'uncollectible',
  'void',
  'failed',
]);
export type InvoiceStatus = z.infer<typeof invoiceStatusSchema>;

export const invoiceRefundStatusSchema = z.enum(['none', 'partial', 'full']);
export type InvoiceRefundStatus = z.infer<typeof invoiceRefundStatusSchema>;

export const invoiceSchema = z
  .object({
    id: identifierSchema,
    number: z.string().trim().min(1).nullable(),
    planSlug: billingPlanSlugSchema,
    planName: nonEmptyStringSchema,
    interval: billingIntervalSchema,
    amountDueMinor: minorAmountSchema,
    amountPaidMinor: minorAmountSchema,
    currency: currencySchema,
    status: invoiceStatusSchema,
    createdAt: timestampSchema,
    dueAt: nullableTimestampSchema,
    paidAt: nullableTimestampSchema,
    hostedUrl: nullableUrlSchema,
    pdfUrl: nullableUrlSchema,
    refundStatus: invoiceRefundStatusSchema,
    refundedAmountMinor: minorAmountSchema,
  })
  .strict()
  .superRefine((invoice, context) => {
    if (invoice.refundedAmountMinor > invoice.amountPaidMinor) {
      context.addIssue({
        code: 'custom',
        message: 'Refund cannot exceed the paid amount',
        path: ['refundedAmountMinor'],
      });
    }
  })
  .readonly();
export type Invoice = z.infer<typeof invoiceSchema>;

export const invoicePageSchema = z
  .object({
    items: z.array(invoiceSchema).readonly(),
    nextCursor: z.string().min(1).nullable(),
    totalCount: countSchema,
  })
  .strict()
  .readonly();
export type InvoicePage = z.infer<typeof invoicePageSchema>;

export const billingPeriodSchema = z
  .object({
    startsAt: timestampSchema,
    endsAt: timestampSchema,
  })
  .strict()
  .refine(
    (period) => Date.parse(period.endsAt) > Date.parse(period.startsAt),
    'Billing period end must be after its start',
  )
  .readonly();
export type BillingPeriod = z.infer<typeof billingPeriodSchema>;

/**
 * The Task 2 overview combines reserved and settled usage. Repositories must
 * populate this split from a complete owner-scoped aggregation (or a later
 * view extension), never from a paginated/filterable activity page and never
 * by assuming reserved usage is zero.
 */
export const billingUsageSummarySchema = z
  .object({
    used: countSchema,
    reserved: countSchema,
    remaining: countSchema,
    limit: countSchema,
  })
  .strict()
  .superRefine((usage, context) => {
    if (usage.used + usage.reserved + usage.remaining !== usage.limit) {
      context.addIssue({
        code: 'custom',
        message: 'Usage counts must equal the period limit',
      });
    }
  })
  .readonly();
export type BillingUsageSummary = z.infer<typeof billingUsageSummarySchema>;

export const scheduledBillingChangeSchema = z
  .object({
    kind: z.enum(['downgrade', 'cancellation']),
    plan: billingPlanSchema.nullable(),
    effectiveAt: timestampSchema,
  })
  .strict()
  .superRefine((change, context) => {
    if (
      (change.kind === 'downgrade' && change.plan === null) ||
      (change.kind === 'cancellation' && change.plan !== null)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Scheduled change does not match its plan',
        path: ['plan'],
      });
    }
  })
  .readonly();
export type ScheduledBillingChange = z.infer<
  typeof scheduledBillingChangeSchema
>;

export const billingPaymentSummarySchema = z
  .object({
    subscriptionStatus: billingSubscriptionStatusSchema.nullable(),
    paidThrough: nullableTimestampSchema,
    outstandingAmountMinor: minorAmountSchema,
    currency: currencySchema,
  })
  .strict()
  .readonly();
export type BillingPaymentSummary = z.infer<typeof billingPaymentSummarySchema>;

export const availableBillingPlanSchema = z
  .object({
    plan: billingPlanSchema,
    prices: z.array(billingPriceSchema).readonly(),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.prices.some((price) => price.planId !== entry.plan.id)) {
      context.addIssue({
        code: 'custom',
        message: 'Catalog price does not belong to its plan',
        path: ['prices'],
      });
    }
  })
  .readonly();
export type AvailableBillingPlan = z.infer<typeof availableBillingPlanSchema>;

export const billingSnapshotSchema = z
  .object({
    currentPlan: billingPlanSchema,
    currentPrice: billingPriceSchema.nullable(),
    period: billingPeriodSchema,
    usage: billingUsageSummarySchema,
    scheduledChange: scheduledBillingChangeSchema.nullable(),
    paymentSummary: billingPaymentSummarySchema,
    recentActivity: z.array(usageLedgerEntrySchema).readonly(),
    availablePlans: z.array(availableBillingPlanSchema).readonly(),
  })
  .strict()
  .superRefine((snapshot, context) => {
    if (
      snapshot.currentPrice !== null &&
      snapshot.currentPrice.planId !== snapshot.currentPlan.id
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Current price does not belong to the current plan',
        path: ['currentPrice'],
      });
    }
  })
  .readonly();
export type BillingSnapshot = z.infer<typeof billingSnapshotSchema>;

/**
 * Exact, public columns exposed by the security-invoker catalog view.
 * The Stripe Price ID and internal database IDs are deliberately absent.
 */
export const billingPlanCatalogRowSchema = z
  .object({
    slug: billingPlanSlugSchema,
    display_name: nonEmptyStringSchema,
    description: nonEmptyStringSchema,
    analysis_limit: countSchema,
    features: z.array(nonEmptyStringSchema).readonly(),
    display_order: countSchema,
    is_default: z.boolean(),
    is_purchasable: z.boolean(),
    billing_interval: billingIntervalSchema.nullable(),
    currency: currencySchema.nullable(),
    unit_amount_minor: minorAmountSchema.nullable(),
    monthly_equivalent_minor: minorAmountSchema.nullable(),
    comparison_copy: z.string().nullable(),
    savings_copy: z.string().nullable(),
  })
  .strict()
  .superRefine((row, context) => {
    const priceFields = [
      row.billing_interval,
      row.currency,
      row.unit_amount_minor,
      row.monthly_equivalent_minor,
    ];
    const populatedFields = priceFields.filter((field) => field !== null);

    if (
      populatedFields.length !== 0 &&
      populatedFields.length !== priceFields.length
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Catalog price fields must be all present or all null',
      });
    }
  })
  .readonly();
export type BillingPlanCatalogRow = z.infer<typeof billingPlanCatalogRowSchema>;

/**
 * Converts the public catalog view into the closed client catalog. Stable plan
 * slugs intentionally serve as public IDs because the view does not expose
 * database plan UUIDs or internal Stripe Price IDs.
 */
export function parseBillingCatalogRows(
  input: readonly unknown[],
): readonly AvailableBillingPlan[] {
  const rows = z.array(billingPlanCatalogRowSchema).parse(input);
  const defaultRows = rows.filter((row) => row.is_default);

  if (defaultRows.length !== 1 || defaultRows[0]?.slug !== 'free') {
    throw new Error('Free must be the single default billing plan');
  }

  const groups = new Map<
    BillingPlanSlug,
    {
      first: BillingPlanCatalogRow;
      rows: BillingPlanCatalogRow[];
    }
  >();

  for (const row of rows) {
    const existing = groups.get(row.slug);
    if (existing === undefined) {
      groups.set(row.slug, { first: row, rows: [row] });
      continue;
    }

    const samePlan =
      row.display_name === existing.first.display_name &&
      row.description === existing.first.description &&
      row.analysis_limit === existing.first.analysis_limit &&
      row.display_order === existing.first.display_order &&
      row.is_default === existing.first.is_default &&
      row.is_purchasable === existing.first.is_purchasable &&
      JSON.stringify(row.features) === JSON.stringify(existing.first.features);
    if (!samePlan) {
      throw new Error(`Inconsistent catalog rows for ${row.slug}`);
    }
    existing.rows.push(row);
  }

  return [...groups.values()]
    .sort((left, right) => left.first.display_order - right.first.display_order)
    .map(({ first, rows: planRows }) => {
      const monthlyByCurrency = new Map(
        planRows
          .filter(
            (row) =>
              row.billing_interval === 'month' &&
              row.currency !== null &&
              row.unit_amount_minor !== null,
          )
          .map((row) => [row.currency!, row.unit_amount_minor!] as const),
      );
      const prices = planRows
        .filter(
          (
            row,
          ): row is BillingPlanCatalogRow & {
            billing_interval: BillingInterval;
            currency: string;
            unit_amount_minor: number;
            monthly_equivalent_minor: number;
          } =>
            row.billing_interval !== null &&
            row.currency !== null &&
            row.unit_amount_minor !== null &&
            row.monthly_equivalent_minor !== null,
        )
        .map((row) => {
          const monthlyAmount = monthlyByCurrency.get(row.currency);
          const savingsPercent =
            row.billing_interval === 'year' &&
            monthlyAmount !== undefined &&
            monthlyAmount > 0
              ? Math.round(
                  (1 - row.monthly_equivalent_minor / monthlyAmount) * 100,
                )
              : null;

          return billingPriceSchema.parse({
            planId: first.slug,
            interval: row.billing_interval,
            amountMinor: row.unit_amount_minor,
            currency: row.currency,
            savingsPercent,
          });
        })
        .sort((left, right) =>
          left.interval === right.interval
            ? 0
            : left.interval === 'month'
              ? -1
              : 1,
        );

      return availableBillingPlanSchema.parse({
        plan: {
          id: first.slug,
          slug: first.slug,
          displayName: first.display_name,
          description: first.description,
          analysisLimit: first.analysis_limit,
          features: first.features,
          purchasable: first.is_purchasable,
        },
        prices,
      });
    });
}

export const billingSubscriptionOverviewRowSchema = z
  .object({
    user_id: identifierSchema,
    plan_slug: billingPlanSlugSchema,
    plan_name: nonEmptyStringSchema,
    plan_description: nonEmptyStringSchema,
    analysis_limit: countSchema,
    used_analyses: countSchema,
    remaining_analyses: countSchema,
    period_start: timestampSchema,
    resets_at: timestampSchema,
    subscription_status: billingSubscriptionStatusSchema.nullable(),
    billing_interval: billingIntervalSchema.nullable(),
    cancel_at_period_end: z.boolean().nullable(),
    cancellation_effective_at: nullableTimestampSchema,
    scheduled_plan_slug: billingPlanSlugSchema.nullable(),
    scheduled_change_at: nullableTimestampSchema,
    paid_through: nullableTimestampSchema,
  })
  .strict()
  .readonly();
export type BillingSubscriptionOverviewRow = z.infer<
  typeof billingSubscriptionOverviewRowSchema
>;

export const billingUsageActivityRowSchema = z
  .object({
    id: identifierSchema,
    user_id: identifierSchema,
    plan_slug: billingPlanSlugSchema,
    event_type: usageEventTypeSchema,
    quantity: z.number().int().safe(),
    status: usageLedgerStatusSchema,
    remaining_balance: countSchema,
    occurred_at: timestampSchema,
    job_id: identifierSchema.nullable(),
    analysis_id: identifierSchema.nullable(),
  })
  .strict()
  .superRefine((row, context) => {
    if (row.status !== validUsageStatusByEvent[row.event_type]) {
      context.addIssue({
        code: 'custom',
        message: 'Usage event does not match its normalized status',
        path: ['status'],
      });
    }
  })
  .readonly();
export type BillingUsageActivityRow = z.infer<
  typeof billingUsageActivityRowSchema
>;

export const billingInvoiceHistoryRowSchema = z
  .object({
    id: identifierSchema,
    user_id: identifierSchema,
    invoice_number: z.string().trim().min(1).nullable(),
    plan_slug: billingPlanSlugSchema,
    plan_name: nonEmptyStringSchema,
    billing_interval: billingIntervalSchema,
    amount_due_minor: minorAmountSchema,
    amount_paid_minor: minorAmountSchema,
    currency: currencySchema,
    status: invoiceStatusSchema,
    invoice_created_at: timestampSchema,
    due_at: nullableTimestampSchema,
    paid_at: nullableTimestampSchema,
    hosted_invoice_url: nullableUrlSchema,
    invoice_pdf_url: nullableUrlSchema,
    refund_status: invoiceRefundStatusSchema,
    refunded_amount_minor: minorAmountSchema,
  })
  .strict()
  .readonly();
export type BillingInvoiceHistoryRow = z.infer<
  typeof billingInvoiceHistoryRowSchema
>;
