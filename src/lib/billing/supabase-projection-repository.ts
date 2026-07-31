import 'server-only';

import { z } from 'zod';

import {
  billingWebhookEventSchema,
  invoiceProjectionSchema,
  scheduledChangeProjectionSchema,
  subscriptionProjectionSchema,
  webhookPriceMappingSchema,
  type BillingProjectionRepository,
} from './repository';
import { BillingRepositoryError } from './supabase-repository';

type SupabaseResult = Readonly<{
  data: unknown;
  error: Readonly<{ code?: string; message?: string }> | null;
}>;

declare const supabaseBillingAdminClientBrand: unique symbol;

export type SupabaseBillingAdminClient = Readonly<{
  from(table: string): {
    select(columns: string): unknown;
  };
  rpc(
    functionName: string,
    arguments_: Readonly<Record<string, unknown>>,
  ): PromiseLike<SupabaseResult>;
  readonly [supabaseBillingAdminClientBrand]: true;
}>;

type SupabaseLookupQuery = Readonly<{
  eq(column: string, value: unknown): SupabaseLookupQuery;
  maybeSingle(): PromiseLike<SupabaseResult>;
}>;

function parseValue<T>(schema: z.ZodType<T>, value: unknown): T {
  try {
    return schema.parse(value);
  } catch {
    throw new BillingRepositoryError();
  }
}

function rpcSuccess(result: SupabaseResult): unknown {
  if (result.error !== null) throw new BillingRepositoryError();
  return result.data;
}

export function createSupabaseBillingProjectionRepository(
  adminClient: SupabaseBillingAdminClient,
): BillingProjectionRepository {
  return {
    async resolveWebhookUserId(customerId) {
      const validatedCustomerId = z
        .string()
        .regex(/^cus_[A-Za-z0-9]+$/)
        .parse(customerId);
      const query = adminClient
        .from('billing_customers')
        .select('user_id') as SupabaseLookupQuery;
      const result = await query
        .eq('stripe_customer_id', validatedCustomerId)
        .maybeSingle();
      if (result.error !== null) throw new BillingRepositoryError();
      if (result.data === null) return null;
      return parseValue(
        z.object({ user_id: z.string().uuid() }).strict(),
        result.data,
      ).user_id;
    },

    async resolveWebhookPrice(priceId) {
      const validatedPriceId = z
        .string()
        .regex(/^price_[A-Za-z0-9]+$/)
        .parse(priceId);
      const query = adminClient
        .from('billing_prices')
        .select(
          'stripe_price_id,billing_interval,billing_plans!inner(slug)',
        ) as SupabaseLookupQuery;
      const result = await query
        .eq('stripe_price_id', validatedPriceId)
        .maybeSingle();
      if (result.error !== null) throw new BillingRepositoryError();
      if (result.data === null) return null;
      const row = parseValue(
        z
          .object({
            stripe_price_id: z.string().regex(/^price_[A-Za-z0-9]+$/),
            billing_interval: z.enum(['month', 'year']),
            billing_plans: z.object({ slug: z.string() }).strict(),
          })
          .strict(),
        result.data,
      );
      return webhookPriceMappingSchema.parse({
        stripePriceId: row.stripe_price_id,
        planSlug: row.billing_plans.slug,
        interval: row.billing_interval,
      });
    },

    async claimWebhookEvent(input) {
      const event = parseValue(billingWebhookEventSchema, input);
      const data = rpcSuccess(
        await adminClient.rpc('claim_billing_webhook_event_service_role', {
          target_event_id: event.eventId,
          target_event_type: event.type,
          target_created_at: event.createdAt,
        }),
      );
      if (typeof data !== 'boolean') throw new BillingRepositoryError();
      return data ? 'claimed' : 'duplicate';
    },

    async applySubscription(input) {
      const projection = parseValue(subscriptionProjectionSchema, input);
      rpcSuccess(
        await adminClient.rpc(
          'apply_billing_subscription_projection_service_role',
          {
            target_event_id: projection.eventId,
            target_event_created_at: projection.eventCreatedAt,
            target_user_id: projection.userId,
            target_external_subscription_id: projection.externalSubscriptionId,
            target_external_price_id: projection.externalPriceId,
            target_plan_slug: projection.planSlug,
            target_interval: projection.interval,
            target_status: projection.status,
            target_period_start: projection.currentPeriodStart,
            target_period_end: projection.currentPeriodEnd,
            target_trial_ends_at: projection.trialEndsAt,
            target_cancel_at_period_end: projection.cancelAtPeriodEnd,
            target_cancellation_effective_at:
              projection.cancellationEffectiveAt,
            target_scheduled_plan_slug: projection.scheduledPlanSlug,
            target_scheduled_change_at: projection.scheduledChangeAt,
            target_paid_through: projection.paidThrough,
          },
        ),
      );
    },

    async applyScheduledChange(input) {
      const projection = parseValue(scheduledChangeProjectionSchema, input);
      rpcSuccess(
        await adminClient.rpc(
          'apply_billing_schedule_projection_service_role',
          {
            target_event_id: projection.eventId,
            target_event_created_at: projection.eventCreatedAt,
            target_user_id: projection.userId,
            target_external_subscription_id: projection.externalSubscriptionId,
            target_external_schedule_id: projection.externalScheduleId,
            target_scheduled_plan_slug: projection.scheduledPlanSlug,
            target_scheduled_change_at: projection.scheduledChangeAt,
          },
        ),
      );
    },

    async applyInvoice(input) {
      const projection = parseValue(invoiceProjectionSchema, input);
      rpcSuccess(
        await adminClient.rpc('apply_billing_invoice_projection_service_role', {
          target_event_id: projection.eventId,
          target_event_created_at: projection.eventCreatedAt,
          target_user_id: projection.userId,
          target_external_invoice_id: projection.externalInvoiceId,
          target_external_subscription_id: projection.externalSubscriptionId,
          target_number: projection.number,
          target_plan_slug: projection.planSlug,
          target_interval: projection.interval,
          target_amount_due_minor: projection.amountDueMinor,
          target_amount_paid_minor: projection.amountPaidMinor,
          target_currency: projection.currency,
          target_status: projection.status,
          target_created_at: projection.createdAt,
          target_due_at: projection.dueAt,
          target_paid_at: projection.paidAt,
          target_hosted_url: projection.hostedUrl,
          target_pdf_url: projection.pdfUrl,
          target_refund_status: projection.refundStatus,
          target_refunded_amount_minor: projection.refundedAmountMinor,
          target_advance_paid_through: projection.advancePaidThrough,
        }),
      );
    },

    async markWebhookProcessed(eventId) {
      rpcSuccess(
        await adminClient.rpc('mark_billing_webhook_processed_service_role', {
          target_event_id: eventId,
        }),
      );
    },

    async markWebhookFailed(eventId, code) {
      rpcSuccess(
        await adminClient.rpc('mark_billing_webhook_failed_service_role', {
          target_event_id: eventId,
          target_error_code: code,
        }),
      );
    },
  };
}
