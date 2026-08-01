import 'server-only';

import {
  billingSubscriptionStatusSchema,
  invoiceStatusSchema,
  type InvoiceStatus,
} from './domain';
import type {
  BillingProjectionRepository,
  InvoiceProjection,
  ScheduledChangeProjection,
  SubscriptionProjection,
} from './repository';

type StripeWebhookEvent = Readonly<{
  id: string;
  type: string;
  created: number;
  data: Readonly<{ object: unknown }>;
}>;

export type StripeWebhookClient = Readonly<{
  webhooks: Readonly<{
    constructEvent(rawBody: string, signature: string, secret: string): unknown;
  }>;
  invoicePayments: Readonly<{
    list(input: {
      payment: { type: 'payment_intent'; payment_intent: string };
      limit: number;
    }): PromiseLike<Readonly<{ data: readonly unknown[] }>>;
  }>;
  invoices: Readonly<{
    retrieve(invoiceId: string): PromiseLike<unknown>;
  }>;
}>;

export type StripeWebhookDependencies = Readonly<{
  webhookSecret: string;
  stripe: StripeWebhookClient;
  repository: BillingProjectionRepository;
}>;

export type StripeWebhookResult =
  | Readonly<{
      ok: true;
      status: 'processed' | 'duplicate' | 'unsupported';
    }>
  | Readonly<{
      ok: false;
      code:
        | 'invalid_signature'
        | 'malformed_event'
        | 'unknown_customer'
        | 'unknown_price'
        | 'repository_failure'
        | 'stripe_lookup_failure';
      retryable: boolean;
    }>;

type ControlledFailureCode =
  'malformed_event' | 'unknown_customer' | 'unknown_price';

class ControlledWebhookFailure extends Error {
  constructor(readonly code: ControlledFailureCode) {
    super(code);
  }
}

class StripeLookupFailure extends Error {
  constructor() {
    super('stripe_lookup_failure');
  }
}

function objectValue(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return value as Readonly<Record<string, unknown>>;
}

function stringValue(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return value;
}

function nullableString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  return stringValue(value);
}

function integerValue(value: unknown): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return value as number;
}

function signedIntegerValue(value: unknown): number {
  if (!Number.isSafeInteger(value)) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return value as number;
}

function nullableInteger(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return integerValue(value);
}

function booleanValue(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return value;
}

function stringStripeId(value: unknown, prefix: string): string {
  if (
    typeof value === 'string' &&
    new RegExp(`^${prefix}[A-Za-z0-9]+$`).test(value)
  ) {
    return value;
  }
  throw new ControlledWebhookFailure('malformed_event');
}

function stripeId(
  value: unknown,
  prefix: string,
  expectedObject: string,
): string {
  if (typeof value === 'string') return stringStripeId(value, prefix);
  const expanded = objectValue(value);
  if (expanded.deleted === true || expanded.object !== expectedObject) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return stringStripeId(expanded.id, prefix);
}

function timestamp(value: unknown): string {
  return new Date(integerValue(value) * 1_000).toISOString();
}

function nullableTimestamp(value: unknown): string | null {
  const parsed = nullableInteger(value);
  return parsed === null ? null : new Date(parsed * 1_000).toISOString();
}

function eventEnvelope(value: unknown): StripeWebhookEvent {
  const event = objectValue(value);
  if (event.object !== 'event') {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const data = objectValue(event.data);
  return {
    id: stringStripeId(event.id, 'evt_'),
    type: stringValue(event.type),
    created: integerValue(event.created),
    data: { object: data.object },
  };
}

function eventTime(event: StripeWebhookEvent): string {
  return new Date(event.created * 1_000).toISOString();
}

async function resolveOwnership(
  object: Readonly<Record<string, unknown>>,
  priceId: string,
  repository: BillingProjectionRepository,
) {
  const customerId = stripeId(object.customer, 'cus_', 'customer');
  const [userId, price] = await Promise.all([
    repository.resolveWebhookUserId(customerId),
    repository.resolveWebhookPrice(priceId),
  ]);
  if (userId === null) {
    throw new ControlledWebhookFailure('unknown_customer');
  }
  if (price === null) {
    throw new ControlledWebhookFailure('unknown_price');
  }
  return { userId, ...price };
}

async function subscriptionProjection(
  event: StripeWebhookEvent,
  repository: BillingProjectionRepository,
): Promise<SubscriptionProjection> {
  const subscription = objectValue(event.data.object);
  if (subscription.object !== 'subscription') {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const externalSubscriptionId = stringStripeId(subscription.id, 'sub_');
  const items = objectValue(subscription.items).data;
  if (!Array.isArray(items) || items.length !== 1) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const item = objectValue(items[0]);
  const priceId = stripeId(item.price, 'price_', 'price');
  const ownership = await resolveOwnership(subscription, priceId, repository);
  const status = billingSubscriptionStatusSchema.safeParse(subscription.status);
  if (!status.success) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const currentPeriodStart = timestamp(item.current_period_start);
  const currentPeriodEnd = timestamp(item.current_period_end);
  const explicitCancelAt = nullableTimestamp(subscription.cancel_at);
  const scheduledCancellation =
    status.data !== 'canceled' &&
    (booleanValue(subscription.cancel_at_period_end) ||
      explicitCancelAt !== null);
  const cancellationEffectiveAt = scheduledCancellation
    ? (explicitCancelAt ?? currentPeriodEnd)
    : status.data === 'canceled'
      ? (nullableTimestamp(subscription.ended_at) ??
        nullableTimestamp(subscription.canceled_at) ??
        currentPeriodEnd)
      : null;
  const paidThrough = ['trialing', 'active', 'past_due'].includes(status.data)
    ? currentPeriodEnd
    : null;

  return {
    eventId: event.id,
    eventCreatedAt: eventTime(event),
    userId: ownership.userId,
    externalSubscriptionId,
    externalPriceId: ownership.stripePriceId,
    planSlug: ownership.planSlug,
    interval: ownership.interval,
    status: status.data,
    currentPeriodStart,
    currentPeriodEnd,
    trialEndsAt: nullableTimestamp(subscription.trial_end),
    cancelAtPeriodEnd: scheduledCancellation,
    cancellationEffectiveAt,
    scheduledPlanSlug: null,
    scheduledChangeAt: null,
    paidThrough,
  };
}

const terminalScheduleEvents = new Set([
  'subscription_schedule.completed',
  'subscription_schedule.released',
  'subscription_schedule.canceled',
]);
const terminalScheduleStatuses = new Set(['completed', 'released', 'canceled']);

function scheduleMetadata(
  schedule: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> | null {
  if (schedule.metadata === null || schedule.metadata === undefined) {
    return null;
  }
  const metadata = objectValue(schedule.metadata);
  return metadata.gleen_owner === 'den-20' ? metadata : null;
}

function scheduleSubscriptionId(
  schedule: Readonly<Record<string, unknown>>,
  metadata: Readonly<Record<string, unknown>>,
): string {
  const metadataSubscriptionId = stringStripeId(
    metadata.gleen_subscription_id,
    'sub_',
  );
  const source =
    schedule.subscription ??
    schedule.released_subscription ??
    metadataSubscriptionId;
  const externalSubscriptionId = stripeId(source, 'sub_', 'subscription');
  if (externalSubscriptionId !== metadataSubscriptionId) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return externalSubscriptionId;
}

function futureSchedulePhase(
  schedule: Readonly<Record<string, unknown>>,
): Readonly<Record<string, unknown>> {
  if (!Array.isArray(schedule.phases) || schedule.phases.length !== 2) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const phases = schedule.phases.map(objectValue);
  const status = stringValue(schedule.status);
  let currentPhase: Readonly<Record<string, unknown>>;
  let boundary: number;

  if (status === 'active') {
    currentPhase = objectValue(schedule.current_phase);
    const currentStart = integerValue(currentPhase.start_date);
    boundary = integerValue(currentPhase.end_date);
    const matchingCurrentPhases = phases.filter(
      (phase) =>
        phase.start_date === currentStart && phase.end_date === boundary,
    );
    if (matchingCurrentPhases.length !== 1) {
      throw new ControlledWebhookFailure('malformed_event');
    }
  } else if (status === 'not_started') {
    currentPhase = phases[0]!;
    boundary = integerValue(currentPhase.end_date);
  } else {
    throw new ControlledWebhookFailure('malformed_event');
  }

  const futurePhases = phases.filter(
    (phase) => integerValue(phase.start_date) === boundary,
  );
  if (futurePhases.length !== 1 || futurePhases[0] === currentPhase) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return futurePhases[0]!;
}

async function scheduleProjection(
  event: StripeWebhookEvent,
  repository: BillingProjectionRepository,
): Promise<ScheduledChangeProjection | null> {
  const schedule = objectValue(event.data.object);
  if (schedule.object !== 'subscription_schedule') {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const externalScheduleId = stringStripeId(schedule.id, 'sub_sched_');
  const metadata = scheduleMetadata(schedule);
  if (metadata === null) return null;

  const externalSubscriptionId = scheduleSubscriptionId(schedule, metadata);
  const customerId = stripeId(schedule.customer, 'cus_', 'customer');
  const userId = await repository.resolveWebhookUserId(customerId);
  if (userId === null) {
    throw new ControlledWebhookFailure('unknown_customer');
  }

  const scheduleStatus = stringValue(schedule.status);
  if (terminalScheduleStatuses.has(scheduleStatus)) {
    if (
      terminalScheduleEvents.has(event.type) &&
      scheduleStatus !== event.type.slice('subscription_schedule.'.length)
    ) {
      throw new ControlledWebhookFailure('malformed_event');
    }
    return {
      eventId: event.id,
      eventCreatedAt: eventTime(event),
      userId,
      externalSubscriptionId,
      externalScheduleId,
      scheduledPlanSlug: null,
      scheduledChangeAt: null,
    };
  }
  if (terminalScheduleEvents.has(event.type)) {
    throw new ControlledWebhookFailure('malformed_event');
  }

  const futurePhase = futureSchedulePhase(schedule);
  if (!Array.isArray(futurePhase.items) || futurePhase.items.length !== 1) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const item = objectValue(futurePhase.items[0]);
  const priceId = stripeId(item.price, 'price_', 'price');
  const price = await repository.resolveWebhookPrice(priceId);
  if (price === null) {
    throw new ControlledWebhookFailure('unknown_price');
  }

  return {
    eventId: event.id,
    eventCreatedAt: eventTime(event),
    userId,
    externalSubscriptionId,
    externalScheduleId,
    scheduledPlanSlug: price.planSlug,
    scheduledChangeAt: timestamp(futurePhase.start_date),
  };
}

function invoicePriceId(invoice: Readonly<Record<string, unknown>>): string {
  const lineData = objectValue(invoice.lines).data;
  if (!Array.isArray(lineData)) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const priceIds = new Set<string>();
  const pricedLines: Array<
    Readonly<{ priceId: string; amount: unknown }>
  > = [];
  for (const value of lineData) {
    const line = objectValue(value);
    const pricingValue = line.pricing;
    if (pricingValue === null || pricingValue === undefined) continue;
    const pricing = objectValue(pricingValue);
    if (pricing.type !== 'price_details') continue;
    const details = objectValue(pricing.price_details);
    const priceId = stripeId(details.price, 'price_', 'price');
    priceIds.add(priceId);
    pricedLines.push({ priceId, amount: line.amount });
  }
  if (priceIds.size === 1) return [...priceIds][0]!;

  const positivePriceIds = new Set(
    pricedLines
      .filter(({ amount }) => signedIntegerValue(amount) > 0)
      .map(({ priceId }) => priceId),
  );
  if (positivePriceIds.size === 1) return [...positivePriceIds][0]!;

  throw new ControlledWebhookFailure('malformed_event');
}

function invoiceSubscriptionId(
  invoice: Readonly<Record<string, unknown>>,
): string | null {
  if (invoice.parent === null || invoice.parent === undefined) return null;
  const parent = objectValue(invoice.parent);
  if (parent.type !== 'subscription_details') return null;
  const details = objectValue(parent.subscription_details);
  return stripeId(details.subscription, 'sub_', 'subscription');
}

function invoiceStatus(type: string, value: unknown): InvoiceStatus {
  if (type === 'invoice.payment_failed') return 'failed';
  if (type === 'invoice.paid') return 'paid';
  const parsed = invoiceStatusSchema.safeParse(value);
  if (!parsed.success) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  return parsed.data;
}

async function invoiceProjection(
  event: StripeWebhookEvent,
  repository: BillingProjectionRepository,
  refund: Readonly<{
    status: 'none' | 'partial' | 'full';
    amountMinor: number;
  }> = { status: 'none', amountMinor: 0 },
): Promise<InvoiceProjection> {
  const invoice = objectValue(event.data.object);
  if (invoice.object !== 'invoice') {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const externalInvoiceId = stringStripeId(invoice.id, 'in_');
  const ownership = await resolveOwnership(
    invoice,
    invoicePriceId(invoice),
    repository,
  );
  const currency = stringValue(invoice.currency);
  if (!/^[a-z]{3}$/.test(currency)) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const paidAt = objectValue(invoice.status_transitions).paid_at;

  return {
    eventId: event.id,
    eventCreatedAt: eventTime(event),
    userId: ownership.userId,
    externalInvoiceId,
    externalSubscriptionId: invoiceSubscriptionId(invoice),
    number: nullableString(invoice.number),
    planSlug: ownership.planSlug,
    interval: ownership.interval,
    amountDueMinor: integerValue(invoice.amount_due),
    amountPaidMinor: integerValue(invoice.amount_paid),
    currency,
    status: invoiceStatus(event.type, invoice.status),
    createdAt: timestamp(invoice.created),
    dueAt: nullableTimestamp(invoice.due_date),
    paidAt: nullableTimestamp(paidAt),
    hostedUrl: nullableString(invoice.hosted_invoice_url),
    pdfUrl: nullableString(invoice.invoice_pdf),
    refundStatus: refund.status,
    refundedAmountMinor: refund.amountMinor,
    advancePaidThrough: event.type === 'invoice.paid',
  };
}

async function refundedInvoiceProjection(
  event: StripeWebhookEvent,
  dependencies: StripeWebhookDependencies,
): Promise<InvoiceProjection> {
  const charge = objectValue(event.data.object);
  if (charge.object !== 'charge') {
    throw new ControlledWebhookFailure('malformed_event');
  }
  stringStripeId(charge.id, 'ch_');
  const paymentIntentId = stripeId(
    charge.payment_intent,
    'pi_',
    'payment_intent',
  );
  let invoicePayments: Readonly<{ data: readonly unknown[] }>;
  try {
    invoicePayments = await dependencies.stripe.invoicePayments.list({
      payment: { type: 'payment_intent', payment_intent: paymentIntentId },
      limit: 2,
    });
  } catch {
    throw new StripeLookupFailure();
  }
  if (invoicePayments.data.length !== 1) {
    throw new ControlledWebhookFailure('malformed_event');
  }
  const invoiceId = stripeId(
    objectValue(invoicePayments.data[0]).invoice,
    'in_',
    'invoice',
  );
  let invoice: unknown;
  try {
    invoice = await dependencies.stripe.invoices.retrieve(invoiceId);
  } catch {
    throw new StripeLookupFailure();
  }
  const amount = integerValue(charge.amount);
  const amountRefunded = integerValue(charge.amount_refunded);
  const refundStatus = amountRefunded >= amount ? 'full' : 'partial';
  const invoiceEvent = {
    ...event,
    data: { object: invoice },
  };
  return invoiceProjection(invoiceEvent, dependencies.repository, {
    status: refundStatus,
    amountMinor: amountRefunded,
  });
}

async function recordFailure(
  repository: BillingProjectionRepository,
  eventId: string,
  code: string,
): Promise<boolean> {
  try {
    await repository.markWebhookFailed(eventId, code);
    return true;
  } catch {
    return false;
  }
}

export async function processStripeWebhook(
  rawBody: string,
  signature: string | null,
  dependencies: StripeWebhookDependencies,
): Promise<StripeWebhookResult> {
  if (signature === null || signature.length === 0) {
    return { ok: false, code: 'invalid_signature', retryable: false };
  }

  let verifiedEvent: unknown;
  try {
    verifiedEvent = dependencies.stripe.webhooks.constructEvent(
      rawBody,
      signature,
      dependencies.webhookSecret,
    );
  } catch {
    return { ok: false, code: 'invalid_signature', retryable: false };
  }
  let event: StripeWebhookEvent;
  try {
    event = eventEnvelope(verifiedEvent);
  } catch {
    return { ok: false, code: 'malformed_event', retryable: false };
  }

  try {
    const claim = await dependencies.repository.claimWebhookEvent({
      eventId: event.id,
      type: event.type,
      createdAt: eventTime(event),
    });
    if (claim === 'duplicate') return { ok: true, status: 'duplicate' };
  } catch {
    return { ok: false, code: 'repository_failure', retryable: true };
  }

  let status: 'processed' | 'unsupported' = 'processed';
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await dependencies.repository.applySubscription(
          await subscriptionProjection(event, dependencies.repository),
        );
        break;
      case 'subscription_schedule.created':
      case 'subscription_schedule.updated':
      case 'subscription_schedule.completed':
      case 'subscription_schedule.released':
      case 'subscription_schedule.canceled': {
        const projection = await scheduleProjection(
          event,
          dependencies.repository,
        );
        if (projection === null) {
          status = 'unsupported';
          break;
        }
        await dependencies.repository.applyScheduledChange(projection);
        break;
      }
      case 'invoice.paid':
      case 'invoice.payment_failed':
      case 'invoice.updated':
        await dependencies.repository.applyInvoice(
          await invoiceProjection(event, dependencies.repository),
        );
        break;
      case 'charge.refunded':
        await dependencies.repository.applyInvoice(
          await refundedInvoiceProjection(event, dependencies),
        );
        break;
      default:
        status = 'unsupported';
    }
    await dependencies.repository.markWebhookProcessed(event.id);
    return { ok: true, status };
  } catch (error) {
    if (error instanceof ControlledWebhookFailure) {
      const recorded = await recordFailure(
        dependencies.repository,
        event.id,
        error.code,
      );
      return recorded
        ? { ok: false, code: error.code, retryable: false }
        : { ok: false, code: 'repository_failure', retryable: true };
    }
    const code =
      error instanceof StripeLookupFailure
        ? 'stripe_lookup_failure'
        : 'repository_failure';
    await recordFailure(dependencies.repository, event.id, code);
    return { ok: false, code, retryable: true };
  }
}

export function createStripeWebhookPost(
  dependencies: () => StripeWebhookDependencies,
) {
  return async function POST(request: Request): Promise<Response> {
    const rawBody = await request.text();
    const signature = request.headers.get('stripe-signature');
    if (signature === null || signature.length === 0) {
      return Response.json(
        { ok: false, code: 'invalid_signature' },
        { status: 400 },
      );
    }
    const result = await processStripeWebhook(
      rawBody,
      signature,
      dependencies(),
    );

    if (result.ok) return Response.json(result, { status: 200 });
    const status =
      result.code === 'invalid_signature' ? 400 : result.retryable ? 503 : 200;
    return Response.json({ ok: false, code: result.code }, { status });
  };
}
