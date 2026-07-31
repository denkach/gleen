import 'server-only';

import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { z } from 'zod';

import { validatePublicEnv } from '@/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import {
  billingIntervalSchema,
  billingPaymentMethodSchema,
  billingPlanSlugSchema,
  invoiceStatusSchema,
  usageEventTypeSchema,
  type Invoice,
  type BillingPaymentMethod,
  type UsageLedgerEntry,
} from './domain';
import {
  type BillingRepository,
  type InvoiceQuery,
  type UsageQuery,
} from './repository';
import { createStripeClient } from './stripe';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from './supabase-repository';

const checkoutInputSchema = z
  .object({
    userId: z.string().trim().min(1),
    email: z.email(),
    plan: billingPlanSlugSchema,
    interval: billingIntervalSchema,
  })
  .strict();
const checkoutActionInputSchema = checkoutInputSchema.omit({
  userId: true,
  email: true,
});
const checkoutConfirmationInputSchema = z
  .object({
    userId: z.string().trim().min(1),
    sessionId: z
      .string()
      .trim()
      .regex(/^cs_[A-Za-z0-9_]+$/),
  })
  .strict();
const checkoutConfirmationActionInputSchema =
  checkoutConfirmationInputSchema.omit({ userId: true });

const portalInputSchema = z
  .object({ userId: z.string().trim().min(1) })
  .strict();

const paymentMethodInputSchema = portalInputSchema;

const usageExportFilterSchema = z
  .object({
    search: z.string().trim().max(200).default(''),
    eventType: usageEventTypeSchema.nullable().default(null),
    periodStart: z.iso.datetime({ offset: true }).nullable().default(null),
    periodEnd: z.iso.datetime({ offset: true }).nullable().default(null),
  })
  .strict();
const invoiceExportFilterSchema = z
  .object({
    search: z.string().trim().max(200).default(''),
    status: z
      .union([invoiceStatusSchema, z.literal('refunded')])
      .nullable()
      .default(null),
    year: z.number().int().min(2000).max(9999).nullable().default(null),
  })
  .strict();

const usageExportInputSchema = z
  .object({
    userId: z.string().trim().min(1),
    filters: usageExportFilterSchema.default({
      search: '',
      eventType: null,
      periodStart: null,
      periodEnd: null,
    }),
  })
  .strict();
const invoiceExportInputSchema = z
  .object({
    userId: z.string().trim().min(1),
    filters: invoiceExportFilterSchema.default({
      search: '',
      status: null,
      year: null,
    }),
  })
  .strict();

const stripeCustomerIdSchema = z.string().trim().startsWith('cus_').min(5);
const stripePriceIdSchema = z.string().trim().startsWith('price_').min(7);
const stripeClientSecretSchema = z.string().trim().min(1);
const portalUrlSchema = z.url().refine((url) => url.startsWith('https://'));

export type CheckoutActionInput = Readonly<{
  plan: z.infer<typeof billingPlanSlugSchema>;
  interval: z.infer<typeof billingIntervalSchema>;
}>;

export type UsageExportFilters = z.input<typeof usageExportFilterSchema>;
export type InvoiceExportFilters = z.input<typeof invoiceExportFilterSchema>;

type ActionErrorCode =
  | 'billing_unavailable'
  | 'invalid_request'
  | 'plan_unavailable'
  | 'session_expired';

type ActionError = Readonly<{ ok: false; code: ActionErrorCode }>;
type CheckoutResult =
  Readonly<{ ok: true; clientSecret: string }> | ActionError;
type CheckoutConfirmationResult = Readonly<{
  state:
    | 'pending'
    | 'confirmed'
    | 'authentication-required'
    | 'canceled'
    | 'invalid-request'
    | 'retryable-error';
}>;
type PortalResult = Readonly<{ ok: true; url: string }> | ActionError;
export type PaymentMethodResult =
  Readonly<{ ok: true; paymentMethod: BillingPaymentMethod }> | ActionError;
type CsvResult =
  | Readonly<{
      ok: true;
      filename: string;
      contentType: 'text/csv;charset=utf-8';
      content: string;
    }>
  | ActionError;

export type BillingStripeClient = Readonly<{
  checkout: Readonly<{
    sessions: Readonly<{
      create(
        input: Stripe.Checkout.SessionCreateParams,
      ): PromiseLike<Pick<Stripe.Checkout.Session, 'client_secret'>>;
      retrieve(
        sessionId: string,
      ): PromiseLike<
        Pick<
          Stripe.Checkout.Session,
          'id' | 'client_reference_id' | 'status' | 'metadata'
        >
      >;
    }>;
  }>;
  billingPortal: Readonly<{
    sessions: Readonly<{
      create(input: {
        customer: string;
        return_url: string;
      }): PromiseLike<Pick<Stripe.BillingPortal.Session, 'url'>>;
    }>;
  }>;
  customers: Readonly<{
    create(
      input: Stripe.CustomerCreateParams,
      options: Stripe.RequestOptions,
    ): PromiseLike<Pick<Stripe.Customer, 'id'>>;
    update(
      customerId: string,
      input: Stripe.CustomerUpdateParams,
    ): PromiseLike<Pick<Stripe.Customer, 'id'>>;
    retrieve(
      customerId: string,
      params: Stripe.CustomerRetrieveParams,
    ): PromiseLike<Stripe.Customer | Stripe.DeletedCustomer>;
  }>;
  paymentMethods: Readonly<{
    retrieve(paymentMethodId: string): PromiseLike<Stripe.PaymentMethod>;
  }>;
}>;

export type BillingActionAdminRepository = Readonly<{
  resolvePurchasablePrice(
    plan: z.infer<typeof billingPlanSlugSchema>,
    interval: z.infer<typeof billingIntervalSchema>,
  ): Promise<string | null>;
  persistOwnedCustomerId(userId: string, customerId: string): Promise<string>;
}>;

type BillingActionsDependencies = Readonly<{
  stripe: BillingStripeClient;
  repository: BillingRepository;
  adminRepository: BillingActionAdminRepository;
  appUrl: string;
}>;

function fixedAppUrl(appUrl: string, pathname: string): string {
  const allowedOrigin = new URL(appUrl);
  return new URL(pathname, allowedOrigin.origin).toString();
}

export function resolveBillingAppUrl(
  requestHeaders: Pick<Headers, 'get'>,
  fallback: string,
): string {
  const host =
    requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host');
  const protocol = requestHeaders.get('x-forwarded-proto') ?? 'https';
  if (host === null) {
    const requestOrigin = requestHeaders.get('origin');
    if (requestOrigin !== null) {
      try {
        const origin = new URL(requestOrigin);
        if (origin.protocol === 'https:' || origin.protocol === 'http:') {
          return origin.origin;
        }
      } catch {
        // Fall through to the configured application origin.
      }
    }
    return new URL(fallback).origin;
  }
  try {
    const origin = new URL(`${protocol}://${host}`).origin;
    return origin;
  } catch {
    return new URL(fallback).origin;
  }
}

function actionFailure(code: ActionErrorCode): ActionError {
  return { ok: false, code };
}

export function createBillingActions(dependencies: BillingActionsDependencies) {
  const checkoutReturnUrl = `${fixedAppUrl(
    dependencies.appUrl,
    '/app/subscription/checkout',
  )}?session_id={CHECKOUT_SESSION_ID}`;
  const portalReturnUrl = fixedAppUrl(
    dependencies.appUrl,
    '/app/subscription/portal',
  );

  return {
    async getPaymentMethodForUser(
      input: unknown,
    ): Promise<PaymentMethodResult> {
      const parsed = paymentMethodInputSchema.safeParse(input);
      if (!parsed.success) return actionFailure('invalid_request');

      try {
        const customerId = await dependencies.repository.getOwnedCustomerId(
          parsed.data.userId,
        );
        if (customerId === null) {
          return {
            ok: true,
            paymentMethod: { status: 'unavailable' },
          };
        }
        const ownedCustomerId = stripeCustomerIdSchema.parse(customerId);
        const customer = await dependencies.stripe.customers.retrieve(
          ownedCustomerId,
          { expand: ['invoice_settings.default_payment_method'] },
        );
        if (customer.deleted) {
          return {
            ok: true,
            paymentMethod: { status: 'unavailable' },
          };
        }
        const defaultPaymentMethod =
          customer.invoice_settings.default_payment_method;
        if (defaultPaymentMethod === null) {
          return {
            ok: true,
            paymentMethod: { status: 'unavailable' },
          };
        }
        const paymentMethod =
          typeof defaultPaymentMethod === 'string'
            ? await dependencies.stripe.paymentMethods.retrieve(
                defaultPaymentMethod,
              )
            : defaultPaymentMethod;
        if (paymentMethod.type !== 'card' || paymentMethod.card == null) {
          return {
            ok: true,
            paymentMethod: { status: 'unavailable' },
          };
        }

        return {
          ok: true,
          paymentMethod: billingPaymentMethodSchema.parse({
            status: 'available',
            brand: paymentMethod.card.brand,
            last4: paymentMethod.card.last4,
            expMonth: paymentMethod.card.exp_month,
            expYear: paymentMethod.card.exp_year,
          }),
        };
      } catch {
        return actionFailure('billing_unavailable');
      }
    },

    async createCheckoutForUser(input: unknown): Promise<CheckoutResult> {
      const parsed = checkoutInputSchema.safeParse(input);
      if (!parsed.success) return actionFailure('invalid_request');

      try {
        const priceId =
          await dependencies.adminRepository.resolvePurchasablePrice(
            parsed.data.plan,
            parsed.data.interval,
          );
        if (priceId === null) return actionFailure('plan_unavailable');
        const ownedPriceId = stripePriceIdSchema.parse(priceId);

        let customerId = await dependencies.repository.getOwnedCustomerId(
          parsed.data.userId,
        );
        if (customerId === null) {
          const customer = await dependencies.stripe.customers.create(
            {
              email: parsed.data.email,
              metadata: { gleen_user_id: parsed.data.userId },
            },
            { idempotencyKey: `gleen-customer-${parsed.data.userId}` },
          );
          customerId =
            await dependencies.adminRepository.persistOwnedCustomerId(
              parsed.data.userId,
              stripeCustomerIdSchema.parse(customer.id),
            );
        } else {
          await dependencies.stripe.customers.update(
            stripeCustomerIdSchema.parse(customerId),
            { email: parsed.data.email },
          );
        }
        const ownedCustomerId = stripeCustomerIdSchema.parse(customerId);

        const session = await dependencies.stripe.checkout.sessions.create({
          mode: 'subscription',
          ui_mode: 'custom',
          customer: ownedCustomerId,
          line_items: [{ price: ownedPriceId, quantity: 1 }],
          client_reference_id: parsed.data.userId,
          metadata: {
            gleen_user_id: parsed.data.userId,
            plan_slug: parsed.data.plan,
            interval: parsed.data.interval,
          },
          subscription_data: {
            metadata: { gleen_user_id: parsed.data.userId },
          },
          return_url: checkoutReturnUrl,
        });
        return {
          ok: true,
          clientSecret: stripeClientSecretSchema.parse(session.client_secret),
        };
      } catch {
        return actionFailure('billing_unavailable');
      }
    },

    async getCheckoutConfirmationForUser(
      input: unknown,
    ): Promise<CheckoutConfirmationResult> {
      const parsed = checkoutConfirmationInputSchema.safeParse(input);
      if (!parsed.success) return { state: 'invalid-request' };

      try {
        const session = await dependencies.stripe.checkout.sessions.retrieve(
          parsed.data.sessionId,
        );
        if (session.client_reference_id !== parsed.data.userId)
          return { state: 'invalid-request' };
        if (session.status === 'expired') return { state: 'canceled' };
        if (session.status !== 'complete') return { state: 'pending' };
        const plan = billingPlanSlugSchema.safeParse(
          session.metadata?.plan_slug,
        );
        const interval = billingIntervalSchema.safeParse(
          session.metadata?.interval,
        );
        if (!plan.success || !interval.success) {
          return { state: 'invalid-request' };
        }
        const snapshot = await dependencies.repository.getOwnedSnapshot(
          parsed.data.userId,
        );
        const webhookProjectionMatches =
          snapshot.currentPlan.slug === plan.data &&
          snapshot.currentPrice?.interval === interval.data &&
          (snapshot.paymentSummary.subscriptionStatus === 'active' ||
            snapshot.paymentSummary.subscriptionStatus === 'trialing');
        return { state: webhookProjectionMatches ? 'confirmed' : 'pending' };
      } catch {
        return { state: 'retryable-error' };
      }
    },

    async createPortalForUser(input: unknown): Promise<PortalResult> {
      const parsed = portalInputSchema.safeParse(input);
      if (!parsed.success) return actionFailure('invalid_request');

      try {
        const customerId = await dependencies.repository.getOwnedCustomerId(
          parsed.data.userId,
        );
        if (customerId === null) return actionFailure('plan_unavailable');
        const session = await dependencies.stripe.billingPortal.sessions.create(
          {
            customer: stripeCustomerIdSchema.parse(customerId),
            return_url: portalReturnUrl,
          },
        );
        return { ok: true, url: portalUrlSchema.parse(session.url) };
      } catch {
        return actionFailure('billing_unavailable');
      }
    },

    async exportUsageForUser(input: unknown): Promise<CsvResult> {
      return exportUsageWithRepository(dependencies.repository, input);
    },

    async exportInvoicesForUser(input: unknown): Promise<CsvResult> {
      return exportInvoicesWithRepository(dependencies.repository, input);
    },
  };
}

type AdminClient = ReturnType<typeof createAdminSupabaseClient>;

class BillingActionPersistenceError extends Error {}

function dataRows(result: {
  data: unknown;
  error: unknown;
}): readonly unknown[] {
  if (result.error !== null || !Array.isArray(result.data)) {
    throw new BillingActionPersistenceError();
  }
  return result.data;
}

export function createSupabaseBillingActionAdminRepository(
  client: AdminClient,
): BillingActionAdminRepository {
  return {
    async resolvePurchasablePrice(plan, interval) {
      const planResult = await client
        .from('billing_plans')
        .select('id')
        .eq('slug', plan)
        .eq('is_active', true)
        .eq('is_purchasable', true)
        .limit(2);
      const plans = dataRows(planResult);
      if (plans.length !== 1) return null;
      const planId = z
        .object({ id: z.string().uuid() })
        .strict()
        .parse(plans[0]).id;

      const priceResult = await client
        .from('billing_prices')
        .select('stripe_price_id')
        .eq('plan_id', planId)
        .eq('billing_interval', interval)
        .eq('is_active', true)
        .not('stripe_price_id', 'is', null)
        .limit(2);
      const prices = dataRows(priceResult);
      if (prices.length !== 1) return null;
      return z
        .object({ stripe_price_id: stripePriceIdSchema })
        .strict()
        .parse(prices[0]).stripe_price_id;
    },

    async persistOwnedCustomerId(userId, customerId) {
      const validatedUserId = z.string().uuid().parse(userId);
      const validatedCustomerId = stripeCustomerIdSchema.parse(customerId);
      const insertResult = await client.from('billing_customers').insert({
        user_id: validatedUserId,
        stripe_customer_id: validatedCustomerId,
      });
      if (insertResult.error === null) return validatedCustomerId;
      if (insertResult.error.code !== '23505') {
        throw new BillingActionPersistenceError();
      }

      const existingResult = await client
        .from('billing_customers')
        .select('stripe_customer_id')
        .eq('user_id', validatedUserId)
        .maybeSingle();
      if (existingResult.error !== null) {
        throw new BillingActionPersistenceError();
      }
      return z
        .object({ stripe_customer_id: stripeCustomerIdSchema })
        .strict()
        .parse(existingResult.data).stripe_customer_id;
    },
  };
}

function protectSpreadsheetCell(value: string): string {
  return /^[\t\r\n ]*[=+\-@]/.test(value) ? `'${value}` : value;
}

function csvCell(value: string | number): string {
  const protectedValue = protectSpreadsheetCell(String(value));
  return `"${protectedValue.replaceAll('"', '""')}"`;
}

function csvDocument(
  headers: readonly string[],
  rows: readonly (readonly (string | number)[])[],
): string {
  const lines = [
    headers.map(csvCell).join(','),
    ...rows.map((row) => row.map(csvCell).join(',')),
  ];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

async function allUsageRows(
  repository: BillingRepository,
  userId: string,
  filters: Omit<UsageQuery, 'cursor' | 'limit'>,
): Promise<readonly UsageLedgerEntry[]> {
  const rows: UsageLedgerEntry[] = [];
  let cursor: string | null = null;
  const visited = new Set<string>();
  do {
    const page = await repository.listOwnedUsage(userId, {
      ...filters,
      cursor,
      limit: 100,
    });
    rows.push(...page.items);
    cursor = page.nextCursor;
    if (cursor !== null && visited.has(cursor)) {
      throw new BillingActionPersistenceError();
    }
    if (cursor !== null) visited.add(cursor);
  } while (cursor !== null);
  return rows;
}

async function allInvoiceRows(
  repository: BillingRepository,
  userId: string,
  filters: Omit<InvoiceQuery, 'cursor' | 'limit'>,
): Promise<readonly Invoice[]> {
  const rows: Invoice[] = [];
  let cursor: string | null = null;
  const visited = new Set<string>();
  do {
    const page = await repository.listOwnedInvoices(userId, {
      ...filters,
      cursor,
      limit: 100,
    });
    rows.push(...page.items);
    cursor = page.nextCursor;
    if (cursor !== null && visited.has(cursor)) {
      throw new BillingActionPersistenceError();
    }
    if (cursor !== null) visited.add(cursor);
  } while (cursor !== null);
  return rows;
}

async function exportUsageWithRepository(
  repository: BillingRepository,
  input: unknown,
): Promise<CsvResult> {
  const parsed = usageExportInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure('invalid_request');
  try {
    const rows = await allUsageRows(
      repository,
      parsed.data.userId,
      parsed.data.filters,
    );
    return {
      ok: true,
      filename: 'gleen-usage.csv',
      contentType: 'text/csv;charset=utf-8',
      content: csvDocument(
        ['Date', 'Event', 'Plan', 'Quantity', 'Status', 'Remaining'],
        rows.map((row) => [
          row.occurredAt,
          row.eventType,
          row.planSlug,
          row.quantity,
          row.status,
          row.remainingBalance,
        ]),
      ),
    };
  } catch {
    return actionFailure('billing_unavailable');
  }
}

async function exportInvoicesWithRepository(
  repository: BillingRepository,
  input: unknown,
): Promise<CsvResult> {
  const parsed = invoiceExportInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure('invalid_request');
  try {
    const rows = await allInvoiceRows(repository, parsed.data.userId, {
      search: parsed.data.filters.search,
      status:
        parsed.data.filters.status === 'refunded'
          ? null
          : parsed.data.filters.status,
      refundedOnly: parsed.data.filters.status === 'refunded',
      year: parsed.data.filters.year,
    });
    return {
      ok: true,
      filename: 'gleen-invoices.csv',
      contentType: 'text/csv;charset=utf-8',
      content: csvDocument(
        [
          'Date',
          'Invoice',
          'Plan',
          'Interval',
          'Amount due',
          'Amount paid',
          'Currency',
          'Status',
          'Refund status',
          'Refunded amount',
        ],
        rows.map((row) => [
          row.createdAt,
          row.number ?? '',
          row.planName,
          row.interval,
          row.amountDueMinor,
          row.amountPaidMinor,
          row.currency,
          row.status,
          row.refundStatus,
          row.refundedAmountMinor,
        ]),
      ),
    };
  } catch {
    return actionFailure('billing_unavailable');
  }
}

async function authenticatedContext() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user === null) return null;
  return { userId: user.id, email: user.email?.trim() ?? null, supabase };
}

function productionBillingActions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
  appUrl = validatePublicEnv(process.env).NEXT_PUBLIC_APP_URL,
) {
  return createBillingActions({
    stripe: createStripeClient(),
    repository: createSupabaseBillingRepository(
      supabase as unknown as SupabaseBillingClient,
    ),
    adminRepository: createSupabaseBillingActionAdminRepository(
      createAdminSupabaseClient(),
    ),
    appUrl,
  });
}

async function requestBillingAppUrl() {
  const fallback = validatePublicEnv(process.env).NEXT_PUBLIC_APP_URL;
  return resolveBillingAppUrl(await headers(), fallback);
}

export async function createCheckoutSession(
  input: CheckoutActionInput,
): Promise<CheckoutResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  if (context.email === null) return actionFailure('session_expired');
  const parsed = checkoutActionInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure('invalid_request');
  return productionBillingActions(
    context.supabase,
    await requestBillingAppUrl(),
  ).createCheckoutForUser({
    userId: context.userId,
    email: context.email,
    ...parsed.data,
  });
}

export async function getCheckoutConfirmation(
  input: unknown,
): Promise<CheckoutConfirmationResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return { state: 'authentication-required' };
  const parsed = checkoutConfirmationActionInputSchema.safeParse(
    typeof input === 'string' ? { sessionId: input } : input,
  );
  if (!parsed.success) return { state: 'invalid-request' };
  return productionBillingActions(
    context.supabase,
  ).getCheckoutConfirmationForUser({
    userId: context.userId,
    sessionId: parsed.data.sessionId,
  });
}

export async function createPortalSession(): Promise<PortalResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  return productionBillingActions(
    context.supabase,
    await requestBillingAppUrl(),
  ).createPortalForUser({ userId: context.userId });
}

export async function getPaymentMethodSummary(): Promise<PaymentMethodResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  return productionBillingActions(context.supabase).getPaymentMethodForUser({
    userId: context.userId,
  });
}

export async function exportUsageCsv(
  filters: UsageExportFilters = {},
): Promise<CsvResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  return exportUsageWithRepository(
    createSupabaseBillingRepository(
      context.supabase as unknown as SupabaseBillingClient,
    ),
    { userId: context.userId, filters },
  );
}

export async function exportInvoicesCsv(
  filters: InvoiceExportFilters = {},
): Promise<CsvResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  return exportInvoicesWithRepository(
    createSupabaseBillingRepository(
      context.supabase as unknown as SupabaseBillingClient,
    ),
    { userId: context.userId, filters },
  );
}
