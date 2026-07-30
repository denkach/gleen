import 'server-only';

import type Stripe from 'stripe';
import { z } from 'zod';

import { validatePublicEnv } from '@/env';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { createServerSupabaseClient } from '@/lib/supabase/server';

import {
  billingIntervalSchema,
  billingPlanSlugSchema,
  invoiceStatusSchema,
  usageEventTypeSchema,
  type Invoice,
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
    plan: billingPlanSlugSchema,
    interval: billingIntervalSchema,
  })
  .strict();
const checkoutActionInputSchema = checkoutInputSchema.omit({ userId: true });

const portalInputSchema = z
  .object({ userId: z.string().trim().min(1) })
  .strict();

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
    status: invoiceStatusSchema.nullable().default(null),
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
type PortalResult = Readonly<{ ok: true; url: string }> | ActionError;
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
              metadata: { gleen_user_id: parsed.data.userId },
            },
            { idempotencyKey: `gleen-customer-${parsed.data.userId}` },
          );
          customerId =
            await dependencies.adminRepository.persistOwnedCustomerId(
              parsed.data.userId,
              stripeCustomerIdSchema.parse(customer.id),
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
    const rows = await allInvoiceRows(
      repository,
      parsed.data.userId,
      parsed.data.filters,
    );
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
  return { userId: user.id, supabase };
}

function productionBillingActions(
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>,
) {
  return createBillingActions({
    stripe: createStripeClient(),
    repository: createSupabaseBillingRepository(
      supabase as unknown as SupabaseBillingClient,
    ),
    adminRepository: createSupabaseBillingActionAdminRepository(
      createAdminSupabaseClient(),
    ),
    appUrl: validatePublicEnv(process.env).NEXT_PUBLIC_APP_URL,
  });
}

export async function createCheckoutSession(
  input: CheckoutActionInput,
): Promise<CheckoutResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  const parsed = checkoutActionInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure('invalid_request');
  return productionBillingActions(context.supabase).createCheckoutForUser({
    userId: context.userId,
    ...parsed.data,
  });
}

export async function createPortalSession(): Promise<PortalResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  return productionBillingActions(context.supabase).createPortalForUser({
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
