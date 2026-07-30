import { z } from 'zod';

import {
  billingIntervalSchema,
  billingPlanSlugSchema,
  billingSubscriptionStatusSchema,
  invoiceStatusSchema,
  usageEventTypeSchema,
  type BillingSnapshot,
  type InvoicePage,
  type InvoiceSummary,
  type UsageLedgerPage,
} from './domain';

const billingPageLimitMaximum = 100;
const maximumUsagePageCount = 10_000;
export const usageCursorMaximumOffset =
  billingPageLimitMaximum * maximumUsagePageCount;

export const usageCursorSchema = z
  .string()
  .regex(/^(0|[1-9]\d*)$/)
  .transform(Number)
  .refine(Number.isSafeInteger)
  .refine((offset) => offset <= usageCursorMaximumOffset)
  .transform(String);

export const usageQuerySchema = z
  .object({
    cursor: usageCursorSchema.nullable().default(null),
    limit: z.number().int().min(1).max(billingPageLimitMaximum).default(25),
    search: z.string().trim().max(200).default(''),
    eventType: usageEventTypeSchema.nullable().default(null),
    periodStart: z.iso.datetime({ offset: true }).nullable().default(null),
    periodEnd: z.iso.datetime({ offset: true }).nullable().default(null),
  })
  .strict()
  .readonly();
export type UsageQuery = z.infer<typeof usageQuerySchema>;

export const invoiceQuerySchema = z
  .object({
    cursor: usageCursorSchema.nullable().default(null),
    limit: z.number().int().min(1).max(100).default(25),
    search: z.string().trim().max(200).default(''),
    status: invoiceStatusSchema.nullable().default(null),
    refundedOnly: z.boolean().default(false),
    year: z.number().int().min(2000).max(9999).nullable().default(null),
  })
  .strict()
  .readonly();
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;

export type BillingRepository = Readonly<{
  /**
   * The implementation must source the used/reserved split from a complete
   * owner aggregation. The Task 2 overview's combined used_analyses value and
   * paginated/filterable activity pages are not sufficient on their own.
   */
  getOwnedSnapshot(userId: string): Promise<BillingSnapshot>;
  listOwnedUsage(userId: string, query: UsageQuery): Promise<UsageLedgerPage>;
  listOwnedInvoices(userId: string, query: InvoiceQuery): Promise<InvoicePage>;
  getOwnedInvoiceSummary(userId: string, year: number): Promise<InvoiceSummary>;
  getOwnedCustomerId(userId: string): Promise<string | null>;
}>;

export const billingWebhookEventSchema = z
  .object({
    eventId: z.string().trim().min(1),
    type: z.string().trim().min(1),
    createdAt: z.iso.datetime({ offset: true }),
  })
  .strict()
  .readonly();
export type BillingWebhookEvent = z.infer<typeof billingWebhookEventSchema>;

export const subscriptionProjectionSchema = z
  .object({
    eventId: z.string().trim().min(1),
    eventCreatedAt: z.iso.datetime({ offset: true }),
    userId: z.string().trim().min(1),
    externalSubscriptionId: z.string().trim().min(1),
    externalPriceId: z.string().regex(/^price_[A-Za-z0-9]+$/),
    planSlug: billingPlanSlugSchema,
    interval: billingIntervalSchema,
    status: billingSubscriptionStatusSchema,
    currentPeriodStart: z.iso.datetime({ offset: true }),
    currentPeriodEnd: z.iso.datetime({ offset: true }),
    trialEndsAt: z.iso.datetime({ offset: true }).nullable(),
    cancelAtPeriodEnd: z.boolean(),
    cancellationEffectiveAt: z.iso.datetime({ offset: true }).nullable(),
    scheduledPlanSlug: billingPlanSlugSchema.nullable(),
    scheduledChangeAt: z.iso.datetime({ offset: true }).nullable(),
    paidThrough: z.iso.datetime({ offset: true }).nullable(),
  })
  .strict()
  .readonly();
export type SubscriptionProjection = z.infer<
  typeof subscriptionProjectionSchema
>;

export const invoiceProjectionSchema = z
  .object({
    eventId: z.string().trim().min(1),
    eventCreatedAt: z.iso.datetime({ offset: true }),
    userId: z.string().trim().min(1),
    externalInvoiceId: z.string().trim().min(1),
    externalSubscriptionId: z.string().trim().min(1).nullable(),
    number: z.string().trim().min(1).nullable(),
    planSlug: billingPlanSlugSchema,
    interval: billingIntervalSchema,
    amountDueMinor: z.number().int().safe().nonnegative(),
    amountPaidMinor: z.number().int().safe().nonnegative(),
    currency: z.string().regex(/^[a-z]{3}$/),
    status: invoiceStatusSchema,
    createdAt: z.iso.datetime({ offset: true }),
    dueAt: z.iso.datetime({ offset: true }).nullable(),
    paidAt: z.iso.datetime({ offset: true }).nullable(),
    hostedUrl: z.url().nullable(),
    pdfUrl: z.url().nullable(),
    refundStatus: z.enum(['none', 'partial', 'full']),
    refundedAmountMinor: z.number().int().safe().nonnegative(),
    advancePaidThrough: z.boolean(),
  })
  .strict()
  .readonly();
export type InvoiceProjection = z.infer<typeof invoiceProjectionSchema>;

export const webhookPriceMappingSchema = z
  .object({
    stripePriceId: z.string().regex(/^price_[A-Za-z0-9]+$/),
    planSlug: billingPlanSlugSchema,
    interval: billingIntervalSchema,
  })
  .strict()
  .readonly();
export type WebhookPriceMapping = z.infer<typeof webhookPriceMappingSchema>;

export type BillingProjectionRepository = Readonly<{
  resolveWebhookUserId(customerId: string): Promise<string | null>;
  resolveWebhookPrice(priceId: string): Promise<WebhookPriceMapping | null>;
  claimWebhookEvent(
    event: BillingWebhookEvent,
  ): Promise<'claimed' | 'duplicate'>;
  applySubscription(input: SubscriptionProjection): Promise<void>;
  applyInvoice(input: InvoiceProjection): Promise<void>;
  markWebhookProcessed(eventId: string): Promise<void>;
  markWebhookFailed(eventId: string, code: string): Promise<void>;
}>;
