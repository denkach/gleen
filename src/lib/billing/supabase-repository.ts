import { z } from 'zod';

import {
  billingCustomerOverviewRowSchema,
  billingInvoiceHistoryRowSchema,
  billingPaymentSummaryRowSchema,
  billingSnapshotSchema,
  billingSubscriptionOverviewRowSchema,
  billingUsageActivityRowSchema,
  billingUsageSummaryRowSchema,
  invoicePageSchema,
  parseBillingCatalogRows,
  usageLedgerPageSchema,
  type AvailableBillingPlan,
  type BillingSubscriptionOverviewRow,
  type BillingUsageActivityRow,
} from './domain';
import {
  invoiceQuerySchema,
  usageQuerySchema,
  type BillingRepository,
} from './repository';

type SupabaseError = Readonly<{ code?: string; message?: string }>;
type SupabaseResult = Readonly<{
  data: unknown;
  error: SupabaseError | null;
  count?: number | null;
}>;

type Query = Readonly<{
  select(columns?: string, options?: Readonly<{ count: 'exact' }>): Query;
  eq(column: string, value: unknown): Query;
  gte(column: string, value: unknown): Query;
  lte(column: string, value: unknown): Query;
  ilike(column: string, pattern: string): Query;
  order(column: string, options: Readonly<{ ascending: boolean }>): Query;
  limit(count: number): Query;
  range(from: number, to: number): Query;
  maybeSingle(): PromiseLike<SupabaseResult>;
  single(): PromiseLike<SupabaseResult>;
  then<TResult1 = SupabaseResult, TResult2 = never>(
    onfulfilled?:
      ((value: SupabaseResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2>;
}>;

export type SupabaseBillingClient = Readonly<{
  from(view: string): Query;
}>;

export class BillingRepositoryError extends Error {
  readonly code = 'billing_persistence_failure' as const;

  constructor() {
    super('Unable to load or persist billing data');
    this.name = 'BillingRepositoryError';
  }
}

function dataOrThrow(result: SupabaseResult): unknown {
  if (result.error !== null) throw new BillingRepositoryError();
  return result.data;
}

function parseBoundary<T>(schema: z.ZodType<T>, result: SupabaseResult): T {
  try {
    return schema.parse(dataOrThrow(result));
  } catch {
    throw new BillingRepositoryError();
  }
}

function parseValue<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch {
    throw new BillingRepositoryError();
  }
}

function parseOffset(cursor: string | null): number {
  if (cursor === null) return 0;
  if (!/^(0|[1-9]\d*)$/.test(cursor)) throw new BillingRepositoryError();
  const offset = Number(cursor);
  if (!Number.isSafeInteger(offset)) throw new BillingRepositoryError();
  return offset;
}

function exactCountOrThrow(
  result: SupabaseResult,
  offset: number,
  visibleRows: number,
): number {
  const count = result.count;
  if (
    typeof count !== 'number' ||
    !Number.isSafeInteger(count) ||
    count < 0 ||
    count < offset + visibleRows
  ) {
    throw new BillingRepositoryError();
  }
  return count;
}

function mapActivity(row: BillingUsageActivityRow) {
  return {
    id: row.id,
    planSlug: row.plan_slug,
    eventType: row.event_type,
    quantity: row.quantity,
    status: row.status,
    remainingBalance: row.remaining_balance,
    occurredAt: row.occurred_at,
    jobId: row.job_id,
    analysisId: row.analysis_id,
    source: row.source,
    analysisTitle: row.analysis_title,
    channelTitle: row.channel_title,
  };
}

function findPlan(
  catalog: readonly AvailableBillingPlan[],
  slug: BillingSubscriptionOverviewRow['plan_slug'],
) {
  const plan = catalog.find((entry) => entry.plan.slug === slug);
  if (plan === undefined) throw new BillingRepositoryError();
  return plan;
}

export function createSupabaseBillingRepository(
  client: SupabaseBillingClient,
): BillingRepository {
  return {
    async getOwnedSnapshot(userId) {
      const activityQuery = client
        .from('billing_usage_activity')
        .select('*')
        .eq('user_id', userId)
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(5);
      const [
        catalogResult,
        overviewResult,
        usageResult,
        activityResult,
        paymentResult,
      ] = await Promise.all([
        client.from('billing_plan_catalog').select('*'),
        client
          .from('billing_subscription_overview')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        client
          .from('billing_usage_summary')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        activityQuery,
        client
          .from('billing_payment_summary')
          .select('*')
          .eq('user_id', userId),
      ]);

      try {
        const catalog = parseBillingCatalogRows(
          parseBoundary(z.array(z.unknown()), catalogResult),
        );
        const overview = parseBoundary(
          billingSubscriptionOverviewRowSchema,
          overviewResult,
        );
        const usage = parseBoundary(billingUsageSummaryRowSchema, usageResult);
        const activity = parseBoundary(
          z.array(billingUsageActivityRowSchema),
          activityResult,
        );
        const payments = parseBoundary(
          z.array(billingPaymentSummaryRowSchema),
          paymentResult,
        );
        if (
          overview.user_id !== userId ||
          usage.user_id !== userId ||
          activity.some((row) => row.user_id !== userId) ||
          payments.some((row) => row.user_id !== userId) ||
          overview.used_analyses !==
            usage.settled_analyses + usage.reserved_analyses
        ) {
          throw new BillingRepositoryError();
        }
        const current = findPlan(catalog, overview.plan_slug);
        const currentPrice =
          overview.billing_interval === null
            ? null
            : (current.prices.find(
                (price) => price.interval === overview.billing_interval,
              ) ?? null);
        if (overview.billing_interval !== null && currentPrice === null) {
          throw new BillingRepositoryError();
        }
        const currency =
          currentPrice?.currency ??
          catalog.flatMap((entry) => entry.prices)[0]?.currency;
        if (currency === undefined) throw new BillingRepositoryError();
        const outstandingAmountMinor =
          payments.find((payment) => payment.currency === currency)
            ?.outstanding_amount_minor ?? 0;

        const scheduledChange =
          overview.cancel_at_period_end === true &&
          overview.cancellation_effective_at !== null
            ? {
                kind: 'cancellation' as const,
                plan: null,
                effectiveAt: overview.cancellation_effective_at,
              }
            : overview.scheduled_plan_slug !== null &&
                overview.scheduled_change_at !== null
              ? {
                  kind: 'downgrade' as const,
                  plan: findPlan(catalog, overview.scheduled_plan_slug).plan,
                  effectiveAt: overview.scheduled_change_at,
                }
              : null;

        return billingSnapshotSchema.parse({
          currentPlan: current.plan,
          currentPrice,
          period: {
            startsAt: overview.period_start,
            endsAt: overview.resets_at,
          },
          usage: {
            used: usage.settled_analyses,
            reserved: usage.reserved_analyses,
            remaining: overview.remaining_analyses,
            limit: overview.analysis_limit,
            extraCredits: usage.extra_credits,
          },
          scheduledChange,
          paymentSummary: {
            subscriptionStatus: overview.subscription_status,
            paidThrough: overview.paid_through,
            outstandingAmountMinor,
            currency,
          },
          recentActivity: activity.map(mapActivity),
          availablePlans: catalog,
        });
      } catch (error) {
        if (error instanceof BillingRepositoryError) throw error;
        throw new BillingRepositoryError();
      }
    },

    async listOwnedUsage(userId, input) {
      const parsed = parseValue(usageQuerySchema, input);
      const offset = parseOffset(parsed.cursor);
      let query = client
        .from('billing_usage_activity')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);
      if (parsed.search !== '') {
        query = query.ilike('search_text', `%${parsed.search}%`);
      }
      if (parsed.eventType !== null) {
        query = query.eq('event_type', parsed.eventType);
      }
      if (parsed.periodStart !== null) {
        query = query.gte('occurred_at', parsed.periodStart);
      }
      if (parsed.periodEnd !== null) {
        query = query.lte('occurred_at', parsed.periodEnd);
      }
      const result = await query
        .order('occurred_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + parsed.limit);
      try {
        const rows = parseBoundary(
          z.array(billingUsageActivityRowSchema),
          result,
        );
        if (rows.some((row) => row.user_id !== userId)) {
          throw new BillingRepositoryError();
        }
        const hasNext = rows.length > parsed.limit;
        const items = rows.slice(0, parsed.limit);
        return usageLedgerPageSchema.parse({
          items: items.map(mapActivity),
          nextCursor: hasNext ? String(offset + parsed.limit) : null,
          totalCount: exactCountOrThrow(result, offset, items.length),
        });
      } catch (error) {
        if (error instanceof BillingRepositoryError) throw error;
        throw new BillingRepositoryError();
      }
    },

    async listOwnedInvoices(userId, input) {
      const parsed = parseValue(invoiceQuerySchema, input);
      const offset = parseOffset(parsed.cursor);
      let query = client
        .from('billing_invoice_history')
        .select('*', { count: 'exact' })
        .eq('user_id', userId);
      if (parsed.search !== '') {
        query = query.ilike('invoice_number', `%${parsed.search}%`);
      }
      if (parsed.status !== null) query = query.eq('status', parsed.status);
      if (parsed.year !== null) {
        query = query
          .gte('invoice_created_at', `${parsed.year}-01-01T00:00:00.000Z`)
          .lte('invoice_created_at', `${parsed.year}-12-31T23:59:59.999Z`);
      }
      const result = await query
        .order('invoice_created_at', { ascending: false })
        .order('id', { ascending: false })
        .range(offset, offset + parsed.limit);
      try {
        const rows = parseBoundary(
          z.array(billingInvoiceHistoryRowSchema),
          result,
        );
        if (rows.some((row) => row.user_id !== userId)) {
          throw new BillingRepositoryError();
        }
        const hasNext = rows.length > parsed.limit;
        const items = rows.slice(0, parsed.limit);
        return invoicePageSchema.parse({
          items: items.map((row) => ({
            id: row.id,
            number: row.invoice_number,
            planSlug: row.plan_slug,
            planName: row.plan_name,
            interval: row.billing_interval,
            amountDueMinor: row.amount_due_minor,
            amountPaidMinor: row.amount_paid_minor,
            currency: row.currency,
            status: row.status,
            createdAt: row.invoice_created_at,
            dueAt: row.due_at,
            paidAt: row.paid_at,
            hostedUrl: row.hosted_invoice_url,
            pdfUrl: row.invoice_pdf_url,
            refundStatus: row.refund_status,
            refundedAmountMinor: row.refunded_amount_minor,
          })),
          nextCursor: hasNext ? String(offset + parsed.limit) : null,
          totalCount: exactCountOrThrow(result, offset, items.length),
        });
      } catch (error) {
        if (error instanceof BillingRepositoryError) throw error;
        throw new BillingRepositoryError();
      }
    },

    async getOwnedCustomerId(userId) {
      const result = await client
        .from('billing_customer_overview')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();
      if (result.error !== null) throw new BillingRepositoryError();
      if (result.data === null) return null;
      const row = parseBoundary(billingCustomerOverviewRowSchema, result);
      if (row.user_id !== userId) throw new BillingRepositoryError();
      return row.stripe_customer_id;
    },
  };
}
