import 'server-only';

import { headers } from 'next/headers';
import type Stripe from 'stripe';
import { z } from 'zod';

import { validatePublicEnv, validateStripePortalEnv } from '@/env';
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
  type BillingInterval,
  type BillingPlanSlug,
  type UsageLedgerEntry,
} from './domain';
import { classifyPlanChange, PlanChangePolicyError } from './plan-change';
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
import {
  releaseOwnedDowngrade,
  scheduleOwnedDowngrade,
  type OwnedSingleItemSubscription,
  type SubscriptionScheduleStripeClient,
} from './subscription-schedule';

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
const planChangeInputSchema = checkoutInputSchema.omit({ email: true });
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

export type ActionErrorCode =
  | 'billing_unavailable'
  | 'invalid_request'
  | 'plan_unavailable'
  | 'session_expired'
  | 'subscription_already_exists';

export type ActionError = Readonly<{ ok: false; code: ActionErrorCode }>;
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
export type PlanChangeResult =
  | Readonly<{ ok: true; kind: 'upgrade'; url: string }>
  | Readonly<{
      ok: true;
      kind: 'downgrade';
      plan: BillingPlanSlug;
      interval: BillingInterval;
      effectiveAt: string;
    }>
  | ActionError;
export type CancelScheduledDowngradeResult =
  Readonly<{ ok: true }> | ActionError;
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

export type BillingStripeClient = SubscriptionScheduleStripeClient &
  Readonly<{
    checkout: Readonly<{
      sessions: Readonly<{
        create(
          input: Stripe.Checkout.SessionCreateParams,
          options?: Stripe.RequestOptions,
        ): PromiseLike<Pick<Stripe.Checkout.Session, 'id' | 'client_secret'>>;
        expire(
          sessionId: string,
        ): PromiseLike<Pick<Stripe.Checkout.Session, 'id' | 'status'>>;
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
      configurations: Readonly<{
        retrieve(
          configurationId: string,
          params: Stripe.BillingPortal.ConfigurationRetrieveParams,
        ): PromiseLike<Pick<Stripe.BillingPortal.Configuration, 'features'>>;
      }>;
      sessions: Readonly<{
        create(
          input: Stripe.BillingPortal.SessionCreateParams,
        ): PromiseLike<Pick<Stripe.BillingPortal.Session, 'url'>>;
      }>;
    }>;
    subscriptions: Readonly<{
      list(
        input: Pick<
          Stripe.SubscriptionListParams,
          'customer' | 'status' | 'limit'
        >,
      ): PromiseLike<
        Readonly<{
          data: readonly (Pick<
            Stripe.Subscription,
            'id' | 'status' | 'schedule'
          > &
            Readonly<{
              items: Readonly<{
                data: readonly Pick<
                  Stripe.SubscriptionItem,
                  | 'id'
                  | 'price'
                  | 'quantity'
                  | 'current_period_start'
                  | 'current_period_end'
                >[];
              }>;
            }>)[];
          has_more: boolean;
        }>
      >;
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
  claimCheckoutAttempt(
    userId: string,
    plan: BillingPlanSlug,
    interval: BillingInterval,
    replaceSessionId?: string,
  ): Promise<{
    idempotencyKey: string;
    plan: BillingPlanSlug;
    interval: BillingInterval;
    sessionId: string | null;
    clientSecret: string | null;
  }>;
  persistCheckoutAttempt(
    userId: string,
    idempotencyKey: string,
    sessionId: string,
    clientSecret: string,
  ): Promise<void>;
  clearCheckoutAttempt(userId: string, sessionId: string): Promise<void>;
}>;

type BillingActionsDependencies = Readonly<{
  stripe: BillingStripeClient;
  repository: BillingRepository;
  adminRepository: BillingActionAdminRepository;
  appUrl: string | null;
  resolvePlanChangeAppUrl?: () => Promise<string>;
  portalConfigurationId: string;
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

const terminalSubscriptionStatuses = new Set<Stripe.Subscription.Status>([
  'canceled',
  'incomplete_expired',
]);

async function listNonTerminalSubscriptions(
  stripe: BillingStripeClient,
  customerId: string,
): Promise<readonly OwnedSingleItemSubscription[] | null> {
  const result = await stripe.subscriptions.list({
    customer: customerId,
    status: 'all',
    limit: 10,
  });
  if (result.has_more) return null;
  return result.data
    .filter(
      (subscription) => !terminalSubscriptionStatuses.has(subscription.status),
    )
    .map((subscription) => ({
      id: subscription.id,
      schedule: subscription.schedule,
      items: subscription.items,
    }));
}

async function rejectExplicitlyExternalSchedule(
  stripe: BillingStripeClient,
  subscription: OwnedSingleItemSubscription,
): Promise<void> {
  if (subscription.schedule === null) return;
  const scheduleId =
    typeof subscription.schedule === 'string'
      ? subscription.schedule
      : subscription.schedule.id;
  const schedule = await stripe.subscriptionSchedules.retrieve(scheduleId);
  if (
    schedule.metadata?.gleen_owner !== undefined &&
    schedule.metadata.gleen_owner !== 'den-20'
  ) {
    throw new BillingActionPersistenceError();
  }
}

export function createBillingActions(dependencies: BillingActionsDependencies) {
  function configuredAppUrl(): string {
    if (dependencies.appUrl === null) throw new BillingActionPersistenceError();
    return dependencies.appUrl;
  }

  function checkoutReturnUrl(): string {
    return `${fixedAppUrl(
      configuredAppUrl(),
      '/app/subscription/checkout',
    )}?session_id={CHECKOUT_SESSION_ID}`;
  }

  function portalReturnUrl(): string {
    return fixedAppUrl(configuredAppUrl(), '/app/subscription/portal');
  }

  async function planChangeReturnUrl(): Promise<string> {
    const appUrl =
      dependencies.resolvePlanChangeAppUrl === undefined
        ? configuredAppUrl()
        : await dependencies.resolvePlanChangeAppUrl();
    return fixedAppUrl(appUrl, '/app/subscription');
  }

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

        const subscriptions = await listNonTerminalSubscriptions(
          dependencies.stripe,
          ownedCustomerId,
        );
        if (subscriptions === null) {
          return actionFailure('billing_unavailable');
        }
        if (subscriptions.length > 0) {
          return actionFailure('subscription_already_exists');
        }

        let attempt = await dependencies.adminRepository.claimCheckoutAttempt(
          parsed.data.userId,
          parsed.data.plan,
          parsed.data.interval,
        );
        if (attempt.sessionId !== null) {
          const storedSession =
            await dependencies.stripe.checkout.sessions.retrieve(
              attempt.sessionId,
            );
          if (storedSession.client_reference_id !== parsed.data.userId) {
            return actionFailure('billing_unavailable');
          }
          if (storedSession.status === 'complete') {
            return actionFailure('subscription_already_exists');
          }
          if (storedSession.status === 'expired') {
            await dependencies.adminRepository.clearCheckoutAttempt(
              parsed.data.userId,
              attempt.sessionId,
            );
            attempt = await dependencies.adminRepository.claimCheckoutAttempt(
              parsed.data.userId,
              parsed.data.plan,
              parsed.data.interval,
            );
          }
        }
        if (
          attempt.plan !== parsed.data.plan ||
          attempt.interval !== parsed.data.interval
        ) {
          if (attempt.sessionId === null)
            return actionFailure('billing_unavailable');
          await dependencies.stripe.checkout.sessions.expire(attempt.sessionId);
          attempt = await dependencies.adminRepository.claimCheckoutAttempt(
            parsed.data.userId,
            parsed.data.plan,
            parsed.data.interval,
            attempt.sessionId,
          );
        }
        if (
          attempt.plan !== parsed.data.plan ||
          attempt.interval !== parsed.data.interval
        ) {
          return actionFailure('billing_unavailable');
        }
        if (attempt.clientSecret !== null) {
          return { ok: true, clientSecret: attempt.clientSecret };
        }

        const session = await dependencies.stripe.checkout.sessions.create(
          {
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
            return_url: checkoutReturnUrl(),
          },
          {
            idempotencyKey: attempt.idempotencyKey,
          },
        );
        const clientSecret = stripeClientSecretSchema.parse(
          session.client_secret,
        );
        await dependencies.adminRepository.persistCheckoutAttempt(
          parsed.data.userId,
          attempt.idempotencyKey,
          session.id,
          clientSecret,
        );
        return {
          ok: true,
          clientSecret,
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
        if (session.status === 'expired') {
          await dependencies.adminRepository.clearCheckoutAttempt(
            parsed.data.userId,
            session.id,
          );
          return { state: 'canceled' };
        }
        if (session.status !== 'complete') return { state: 'pending' };
        await dependencies.adminRepository.clearCheckoutAttempt(
          parsed.data.userId,
          session.id,
        );
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

    async changePlanForUser(
      input: unknown,
      scope: 'all' | 'upgrade-only' = 'all',
    ): Promise<PlanChangeResult> {
      const parsed = planChangeInputSchema.safeParse(input);
      if (!parsed.success) return actionFailure('invalid_request');

      try {
        const customerId = await dependencies.repository.getOwnedCustomerId(
          parsed.data.userId,
        );
        if (customerId === null) return actionFailure('plan_unavailable');
        const ownedCustomerId = stripeCustomerIdSchema.parse(customerId);

        const snapshot = await dependencies.repository.getOwnedSnapshot(
          parsed.data.userId,
        );

        const direction = classifyPlanChange(snapshot, parsed.data);
        if (direction === 'unchanged') return actionFailure('invalid_request');
        if (scope === 'upgrade-only' && direction !== 'upgrade') {
          return actionFailure('invalid_request');
        }

        const priceId =
          await dependencies.adminRepository.resolvePurchasablePrice(
            parsed.data.plan,
            parsed.data.interval,
          );
        if (priceId === null) return actionFailure('plan_unavailable');
        const ownedPriceId = stripePriceIdSchema.parse(priceId);

        const subscriptions = await listNonTerminalSubscriptions(
          dependencies.stripe,
          ownedCustomerId,
        );
        if (subscriptions === null || subscriptions.length !== 1) {
          return actionFailure('billing_unavailable');
        }
        const [subscription] = subscriptions;
        if (
          subscription === undefined ||
          subscription.items.data.length !== 1
        ) {
          return actionFailure('billing_unavailable');
        }
        const [item] = subscription.items.data;

        if (direction === 'downgrade') {
          await rejectExplicitlyExternalSchedule(
            dependencies.stripe,
            subscription,
          );
          const scheduled = await scheduleOwnedDowngrade({
            stripe: dependencies.stripe,
            subscription,
            targetPriceId: ownedPriceId,
            targetPlan: parsed.data.plan,
            targetInterval: parsed.data.interval,
          });
          return {
            ok: true,
            kind: 'downgrade',
            plan: scheduled.targetPlan,
            interval: scheduled.targetInterval,
            effectiveAt: scheduled.effectiveAt,
          };
        }

        if (item === undefined) return actionFailure('billing_unavailable');

        const configuration =
          await dependencies.stripe.billingPortal.configurations.retrieve(
            dependencies.portalConfigurationId,
            { expand: ['features.subscription_update.products'] },
          );
        const update = configuration.features.subscription_update;
        const allowedPrices =
          update.products?.flatMap((product) => product.prices) ?? [];
        if (
          !update.enabled ||
          update.proration_behavior !== 'always_invoice' ||
          !allowedPrices.includes(ownedPriceId)
        ) {
          return actionFailure('billing_unavailable');
        }

        const returnUrl = await planChangeReturnUrl();
        const session = await dependencies.stripe.billingPortal.sessions.create(
          {
            configuration: dependencies.portalConfigurationId,
            customer: ownedCustomerId,
            return_url: returnUrl,
            flow_data: {
              type: 'subscription_update_confirm',
              subscription_update_confirm: {
                subscription: subscription.id,
                items: [{ id: item.id, price: ownedPriceId }],
              },
              after_completion: {
                type: 'redirect',
                redirect: { return_url: returnUrl },
              },
            },
          },
        );
        return {
          ok: true,
          kind: 'upgrade',
          url: portalUrlSchema.parse(session.url),
        };
      } catch (error) {
        if (error instanceof PlanChangePolicyError) {
          return actionFailure('invalid_request');
        }
        return actionFailure('billing_unavailable');
      }
    },

    async cancelScheduledDowngradeForUser(
      input: unknown,
    ): Promise<CancelScheduledDowngradeResult> {
      const parsed = portalInputSchema.safeParse(input);
      if (!parsed.success) return actionFailure('invalid_request');

      try {
        const customerId = await dependencies.repository.getOwnedCustomerId(
          parsed.data.userId,
        );
        if (customerId === null) return actionFailure('plan_unavailable');
        const ownedCustomerId = stripeCustomerIdSchema.parse(customerId);
        const subscriptions = await listNonTerminalSubscriptions(
          dependencies.stripe,
          ownedCustomerId,
        );
        if (subscriptions === null || subscriptions.length !== 1) {
          return actionFailure('billing_unavailable');
        }
        const [subscription] = subscriptions;
        if (
          subscription === undefined ||
          subscription.items.data.length !== 1
        ) {
          return actionFailure('billing_unavailable');
        }

        await releaseOwnedDowngrade({
          stripe: dependencies.stripe,
          subscription,
        });
        return { ok: true };
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
            return_url: portalReturnUrl(),
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

    async claimCheckoutAttempt(userId, plan, interval, replaceSessionId) {
      const result = await client.rpc(
        'claim_billing_checkout_attempt_service_role',
        {
          target_user_id: z.string().uuid().parse(userId),
          target_plan_slug: plan,
          target_interval: interval,
          target_replace_session_id: replaceSessionId ?? null,
        },
      );
      if (result.error !== null) throw new BillingActionPersistenceError();
      const row = z
        .object({
          idempotency_key: z.string().min(1),
          plan_slug: billingPlanSlugSchema,
          billing_interval: billingIntervalSchema,
          stripe_session_id: z.string().nullable(),
          client_secret: z.string().nullable(),
        })
        .strict()
        .parse(Array.isArray(result.data) ? result.data[0] : result.data);
      return {
        idempotencyKey: row.idempotency_key,
        plan: row.plan_slug,
        interval: row.billing_interval,
        sessionId: row.stripe_session_id,
        clientSecret: row.client_secret,
      };
    },

    async persistCheckoutAttempt(
      userId,
      idempotencyKey,
      sessionId,
      clientSecret,
    ) {
      const result = await client.rpc(
        'persist_billing_checkout_attempt_service_role',
        {
          target_user_id: z.string().uuid().parse(userId),
          target_idempotency_key: idempotencyKey,
          target_session_id: sessionId,
          target_client_secret: clientSecret,
        },
      );
      if (result.error !== null) throw new BillingActionPersistenceError();
    },

    async clearCheckoutAttempt(userId, sessionId) {
      const result = await client.rpc(
        'clear_billing_checkout_attempt_service_role',
        {
          target_user_id: z.string().uuid().parse(userId),
          target_session_id: sessionId,
        },
      );
      if (result.error !== null) throw new BillingActionPersistenceError();
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
  appUrl: string | null = null,
  resolvePlanChangeAppUrl?: () => Promise<string>,
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
    resolvePlanChangeAppUrl,
    portalConfigurationId: validateStripePortalEnv(process.env)
      .STRIPE_PORTAL_CONFIGURATION_ID,
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

export async function changePlan(
  input: CheckoutActionInput,
): Promise<PlanChangeResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  const parsed = checkoutActionInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure('invalid_request');
  return productionBillingActions(
    context.supabase,
    null,
    requestBillingAppUrl,
  ).changePlanForUser({
    userId: context.userId,
    ...parsed.data,
  });
}

export async function cancelScheduledDowngrade(): Promise<CancelScheduledDowngradeResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  return productionBillingActions(
    context.supabase,
  ).cancelScheduledDowngradeForUser({ userId: context.userId });
}

/**
 * Temporary compatibility boundary for the existing Portal-only subscription
 * page. The split action is the product API; callers that require a Portal
 * URL cannot represent scheduled downgrades and must migrate to changePlan.
 */
export async function createPlanChangePortalSession(
  input: CheckoutActionInput,
): Promise<PortalResult> {
  'use server';
  const context = await authenticatedContext();
  if (context === null) return actionFailure('session_expired');
  const parsed = checkoutActionInputSchema.safeParse(input);
  if (!parsed.success) return actionFailure('invalid_request');
  const result = await productionBillingActions(
    context.supabase,
    null,
    requestBillingAppUrl,
  ).changePlanForUser(
    { userId: context.userId, ...parsed.data },
    'upgrade-only',
  );
  if (!result.ok) return result;
  return result.kind === 'upgrade'
    ? { ok: true, url: result.url }
    : actionFailure('invalid_request');
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
