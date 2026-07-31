import 'server-only';

import Stripe from 'stripe';

import type { BillingInterval, BillingPlanSlug } from './domain';

const gleenOwner = 'den-20';

export type OwnedSingleItemSubscription = Readonly<{
  id: string;
  schedule: string | Pick<Stripe.SubscriptionSchedule, 'id'> | null;
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
}>;

export type SubscriptionScheduleStripeClient = Readonly<{
  subscriptionSchedules: Readonly<{
    create(
      params: Stripe.SubscriptionScheduleCreateParams,
      options?: Stripe.RequestOptions,
    ): PromiseLike<Stripe.SubscriptionSchedule>;
    retrieve(id: string): PromiseLike<Stripe.SubscriptionSchedule>;
    update(
      id: string,
      params: Stripe.SubscriptionScheduleUpdateParams,
      options?: Stripe.RequestOptions,
    ): PromiseLike<Stripe.SubscriptionSchedule>;
    release(
      id: string,
      params: Stripe.SubscriptionScheduleReleaseParams,
      options?: Stripe.RequestOptions,
    ): PromiseLike<Stripe.SubscriptionSchedule>;
  }>;
}>;

export type ScheduledDowngrade = Readonly<{
  scheduleId: string;
  targetPlan: BillingPlanSlug;
  targetInterval: BillingInterval;
  effectiveAt: string;
}>;

export class SubscriptionScheduleConflictError extends Error {}

function conflict(): never {
  throw new SubscriptionScheduleConflictError();
}

function stripeId(value: string | { id: string }, prefix: string): string {
  const id = stripeObjectId(value);
  if (!id.startsWith(`${prefix}_`)) return conflict();
  return id;
}

function stripeObjectId(value: string | { id: string }): string {
  if (
    typeof value !== 'string' &&
    'deleted' in value &&
    value.deleted === true
  ) {
    return conflict();
  }

  const id = typeof value === 'string' ? value : value.id;
  if (id.trim().length === 0) return conflict();
  return id;
}

function attachedScheduleId(
  value: OwnedSingleItemSubscription['schedule'],
): string | null {
  return value === null ? null : stripeId(value, 'sub_sched');
}

function ownedMetadata(
  schedule: Stripe.SubscriptionSchedule,
  subscriptionId: string,
): boolean {
  return (
    schedule.metadata?.gleen_owner === gleenOwner &&
    schedule.metadata.gleen_subscription_id === subscriptionId
  );
}

function metadataHasGleenKey(metadata: Stripe.Metadata | null): boolean {
  return Object.keys(metadata ?? {}).some((key) => key.startsWith('gleen_'));
}

function phaseDiscount(
  discount: Stripe.SubscriptionSchedule.Phase.Discount,
): Stripe.SubscriptionScheduleUpdateParams.Phase.Discount {
  const serialized: Stripe.SubscriptionScheduleUpdateParams.Phase.Discount = {};

  if (discount.coupon !== null) {
    serialized.coupon = stripeObjectId(discount.coupon);
  }
  if (discount.discount !== null) {
    serialized.discount = stripeId(discount.discount, 'di');
  }
  if (discount.promotion_code !== null) {
    serialized.promotion_code = stripeId(discount.promotion_code, 'promo');
  }
  if (Object.keys(serialized).length !== 1) return conflict();
  return serialized;
}

function itemDiscount(
  discount: Stripe.SubscriptionSchedule.Phase.Item.Discount,
): Stripe.SubscriptionScheduleUpdateParams.Phase.Item.Discount {
  return phaseDiscount(discount);
}

function addInvoiceItemDiscount(
  discount: Stripe.SubscriptionSchedule.Phase.AddInvoiceItem.Discount,
): Stripe.SubscriptionScheduleUpdateParams.Phase.AddInvoiceItem.Discount {
  return phaseDiscount(discount);
}

function taxRateIds(
  taxRates: readonly Stripe.TaxRate[] | null | undefined,
): string[] | undefined {
  if (taxRates === null || taxRates === undefined) return undefined;
  return taxRates.map((taxRate) => stripeId(taxRate, 'txr'));
}

function automaticTax(
  value: Stripe.SubscriptionSchedule.Phase.AutomaticTax | undefined,
): Stripe.SubscriptionScheduleUpdateParams.Phase.AutomaticTax | undefined {
  if (value === undefined) return undefined;
  if (value.disabled_reason !== null) return conflict();
  if (value.liability === null) return { enabled: value.enabled };

  const liability = { type: value.liability.type };
  if (value.liability.type === 'account') {
    if (value.liability.account === undefined) return conflict();
    return {
      enabled: value.enabled,
      liability: {
        ...liability,
        account: stripeId(value.liability.account, 'acct'),
      },
    };
  }
  return { enabled: value.enabled, liability };
}

function invoiceSettings(
  value: Stripe.SubscriptionSchedule.Phase.InvoiceSettings | null,
): Stripe.SubscriptionScheduleUpdateParams.Phase.InvoiceSettings | undefined {
  if (value === null) return undefined;

  const serialized: Stripe.SubscriptionScheduleUpdateParams.Phase.InvoiceSettings =
    {};
  if (value.account_tax_ids !== null) {
    serialized.account_tax_ids = value.account_tax_ids.map((taxId) =>
      stripeId(taxId, 'txi'),
    );
  }
  if (value.days_until_due !== null) {
    serialized.days_until_due = value.days_until_due;
  }
  if (value.issuer !== null) {
    const issuer = { type: value.issuer.type };
    if (value.issuer.type === 'account') {
      if (value.issuer.account === undefined) return conflict();
      serialized.issuer = {
        ...issuer,
        account: stripeId(value.issuer.account, 'acct'),
      };
    } else {
      serialized.issuer = issuer;
    }
  }
  return serialized;
}

function transferData(
  value: Stripe.SubscriptionSchedule.Phase.TransferData | null,
): Stripe.SubscriptionScheduleUpdateParams.Phase.TransferData | undefined {
  if (value === null) return undefined;
  return {
    ...(value.amount_percent === null
      ? {}
      : { amount_percent: value.amount_percent }),
    destination: stripeId(value.destination, 'acct'),
  };
}

function phaseItem(
  item: Stripe.SubscriptionSchedule.Phase.Item,
): Stripe.SubscriptionScheduleUpdateParams.Phase.Item {
  const taxRates = taxRateIds(item.tax_rates);
  if (item.billing_thresholds?.usage_gte === null) return conflict();
  return {
    ...(item.billing_thresholds === null
      ? {}
      : {
          billing_thresholds: { usage_gte: item.billing_thresholds.usage_gte },
        }),
    discounts: item.discounts.map(itemDiscount),
    ...(item.metadata === null ? {} : { metadata: item.metadata }),
    price: stripeId(item.price, 'price'),
    ...(item.quantity === undefined ? {} : { quantity: item.quantity }),
    ...(taxRates === undefined ? {} : { tax_rates: taxRates }),
  };
}

function addInvoiceItem(
  item: Stripe.SubscriptionSchedule.Phase.AddInvoiceItem,
): Stripe.SubscriptionScheduleUpdateParams.Phase.AddInvoiceItem {
  const taxRates = taxRateIds(item.tax_rates);
  return {
    discounts: item.discounts.map(addInvoiceItemDiscount),
    ...(item.metadata === null ? {} : { metadata: item.metadata }),
    period: item.period,
    price: stripeId(item.price, 'price'),
    ...(item.quantity === null ? {} : { quantity: item.quantity }),
    ...(taxRates === undefined ? {} : { tax_rates: taxRates }),
  };
}

function currentAndFuturePhases(
  schedule: Stripe.SubscriptionSchedule,
  periodStart: number,
  periodEnd: number,
): readonly [
  Stripe.SubscriptionSchedule.Phase,
  Stripe.SubscriptionSchedule.Phase | undefined,
] {
  const currentAndFuture = schedule.phases.filter(
    (phase) => phase.end_date > periodStart,
  );
  if (currentAndFuture.length === 0 || currentAndFuture.length > 2) {
    return conflict();
  }

  const [current, future] = currentAndFuture;
  if (
    current === undefined ||
    current.start_date !== periodStart ||
    current.end_date !== periodEnd ||
    current.items.length !== 1
  ) {
    return conflict();
  }
  if (
    future !== undefined &&
    (future.start_date < periodEnd ||
      future.start_date !== periodEnd ||
      future.items.length !== 1)
  ) {
    return conflict();
  }
  return [current, future];
}

function currentPhase(
  schedule: Stripe.SubscriptionSchedule,
  periodStart: number,
  periodEnd: number,
): Stripe.SubscriptionSchedule.Phase {
  return currentAndFuturePhases(schedule, periodStart, periodEnd)[0];
}

function intervalEnd(start: number, interval: BillingInterval): number {
  const date = new Date(start * 1000);
  const targetYear = date.getUTCFullYear() + (interval === 'year' ? 1 : 0);
  const targetMonth = date.getUTCMonth() + (interval === 'month' ? 1 : 0);
  const daysInTargetMonth = new Date(
    Date.UTC(targetYear, targetMonth + 1, 0),
  ).getUTCDate();
  return (
    Date.UTC(
      targetYear,
      targetMonth,
      Math.min(date.getUTCDate(), daysInTargetMonth),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ) / 1000
  );
}

function hasNoMetadata(metadata: Stripe.Metadata | null): boolean {
  return metadata === null || Object.keys(metadata).length === 0;
}

function hasNoTaxRates(
  taxRates: readonly Stripe.TaxRate[] | null | undefined,
): boolean {
  return taxRates === null || taxRates === undefined || taxRates.length === 0;
}

function targetPhaseIsGleenCompatible(
  phase: Stripe.SubscriptionSchedule.Phase,
  targetPriceId: string,
  targetInterval: BillingInterval,
  effectiveAt: number,
): void {
  if (
    phase.start_date !== effectiveAt ||
    phase.end_date !== intervalEnd(effectiveAt, targetInterval) ||
    phase.proration_behavior !== 'none' ||
    phase.add_invoice_items.length !== 0 ||
    phase.application_fee_percent !== null ||
    phase.automatic_tax !== undefined ||
    phase.billing_cycle_anchor !== null ||
    phase.billing_thresholds !== null ||
    phase.collection_method !== null ||
    phase.default_payment_method !== null ||
    !hasNoTaxRates(phase.default_tax_rates) ||
    phase.description !== null ||
    phase.discounts.length !== 0 ||
    phase.invoice_settings !== null ||
    !hasNoMetadata(phase.metadata) ||
    phase.on_behalf_of !== null ||
    phase.transfer_data !== null ||
    phase.trial_end !== null ||
    phase.items.length !== 1
  ) {
    return conflict();
  }

  const [item] = phase.items;
  if (
    item === undefined ||
    stripeId(item.price, 'price') !== targetPriceId ||
    item.quantity !== 1 ||
    item.billing_thresholds !== null ||
    item.discounts.length !== 0 ||
    !hasNoMetadata(item.metadata) ||
    !hasNoTaxRates(item.tax_rates)
  ) {
    return conflict();
  }
}

type ManagedTarget = Readonly<{
  priceId: string;
  interval: BillingInterval;
  changeKey: string;
}>;

function managedTarget(
  schedule: Stripe.SubscriptionSchedule,
  currentPeriodEnd: number,
): ManagedTarget {
  const metadata = schedule.metadata;
  const targetPlan = metadata?.gleen_target_plan;
  const targetInterval = metadata?.gleen_target_interval;
  const effectiveAt = metadata?.gleen_effective_at;
  const changeKey = metadata?.gleen_change_key;
  if (
    targetPlan === undefined ||
    targetPlan.trim().length === 0 ||
    (targetInterval !== 'month' && targetInterval !== 'year') ||
    effectiveAt !== new Date(currentPeriodEnd * 1000).toISOString() ||
    changeKey === undefined
  ) {
    return conflict();
  }

  const prefix = `gleen-den20-update:${schedule.id}:`;
  const suffix = `:${currentPeriodEnd}`;
  if (!changeKey.startsWith(prefix) || !changeKey.endsWith(suffix)) {
    return conflict();
  }
  const priceId = changeKey.slice(prefix.length, -suffix.length);
  if (priceId.includes(':') || stripeId(priceId, 'price') !== priceId) {
    return conflict();
  }

  return { priceId, interval: targetInterval, changeKey };
}

function validatesManagedTargetPhase(
  schedule: Stripe.SubscriptionSchedule,
  currentPeriodStart: number,
  currentPeriodEnd: number,
  target: ManagedTarget,
): void {
  if (schedule.end_behavior !== 'release') return conflict();
  const [, future] = currentAndFuturePhases(
    schedule,
    currentPeriodStart,
    currentPeriodEnd,
  );
  if (future === undefined) return conflict();
  targetPhaseIsGleenCompatible(
    future,
    target.priceId,
    target.interval,
    currentPeriodEnd,
  );
}

function currentPhaseUpdate(
  schedule: Stripe.SubscriptionSchedule,
  periodStart: number,
  periodEnd: number,
): Stripe.SubscriptionScheduleUpdateParams.Phase {
  const phase = currentPhase(schedule, periodStart, periodEnd);
  const defaultTaxRates = taxRateIds(phase.default_tax_rates);
  const automaticTaxSettings = automaticTax(phase.automatic_tax);
  const phaseInvoiceSettings = invoiceSettings(phase.invoice_settings);
  const phaseTransferData = transferData(phase.transfer_data);

  return {
    add_invoice_items: phase.add_invoice_items.map(addInvoiceItem),
    ...(phase.application_fee_percent === null
      ? {}
      : { application_fee_percent: phase.application_fee_percent }),
    ...(automaticTaxSettings === undefined
      ? {}
      : { automatic_tax: automaticTaxSettings }),
    ...(phase.billing_cycle_anchor === null
      ? {}
      : { billing_cycle_anchor: phase.billing_cycle_anchor }),
    ...(phase.billing_thresholds === null
      ? {}
      : {
          billing_thresholds: {
            ...(phase.billing_thresholds.amount_gte === null
              ? {}
              : { amount_gte: phase.billing_thresholds.amount_gte }),
            ...(phase.billing_thresholds.reset_billing_cycle_anchor === null
              ? {}
              : {
                  reset_billing_cycle_anchor:
                    phase.billing_thresholds.reset_billing_cycle_anchor,
                }),
          },
        }),
    ...(phase.collection_method === null
      ? {}
      : { collection_method: phase.collection_method }),
    currency: phase.currency,
    ...(phase.default_payment_method === null
      ? {}
      : {
          default_payment_method: stripeId(phase.default_payment_method, 'pm'),
        }),
    ...(defaultTaxRates === undefined
      ? {}
      : { default_tax_rates: defaultTaxRates }),
    ...(phase.description === null ? {} : { description: phase.description }),
    discounts: phase.discounts.map(phaseDiscount),
    end_date: phase.end_date,
    ...(phaseInvoiceSettings === undefined
      ? {}
      : { invoice_settings: phaseInvoiceSettings }),
    items: phase.items.map(phaseItem),
    ...(phase.metadata === null ? {} : { metadata: phase.metadata }),
    ...(phase.on_behalf_of === null
      ? {}
      : { on_behalf_of: stripeId(phase.on_behalf_of, 'acct') }),
    proration_behavior: 'none',
    start_date: phase.start_date,
    ...(phaseTransferData === undefined
      ? {}
      : { transfer_data: phaseTransferData }),
    ...(phase.trial_end === null ? {} : { trial_end: phase.trial_end }),
  };
}

function futureTargetPhase(
  targetPriceId: string,
  targetInterval: BillingInterval,
  effectiveAt: number,
): Stripe.SubscriptionScheduleUpdateParams.Phase {
  return {
    start_date: effectiveAt,
    duration: { interval: targetInterval, interval_count: 1 },
    items: [{ price: stripeId(targetPriceId, 'price'), quantity: 1 }],
    proration_behavior: 'none',
  };
}

function subscriptionPeriod(
  subscription: OwnedSingleItemSubscription,
): Readonly<{ start: number; end: number }> {
  if (subscription.items.data.length !== 1) return conflict();
  const [item] = subscription.items.data;
  if (
    item === undefined ||
    !Number.isInteger(item.current_period_start) ||
    !Number.isInteger(item.current_period_end) ||
    item.current_period_end <= item.current_period_start
  ) {
    return conflict();
  }
  return { start: item.current_period_start, end: item.current_period_end };
}

function validatesManagedActiveSchedule(
  schedule: Stripe.SubscriptionSchedule,
  subscriptionId: string,
): void {
  if (
    (schedule.status !== 'active' && schedule.status !== 'not_started') ||
    schedule.subscription === null ||
    stripeId(schedule.subscription, 'sub') !== subscriptionId
  ) {
    conflict();
  }
}

function result(
  scheduleId: string,
  targetPlan: BillingPlanSlug,
  targetInterval: BillingInterval,
  periodEnd: number,
): ScheduledDowngrade {
  return {
    scheduleId,
    targetPlan,
    targetInterval,
    effectiveAt: new Date(periodEnd * 1000).toISOString(),
  };
}

export async function scheduleOwnedDowngrade(
  input: Readonly<{
    stripe: SubscriptionScheduleStripeClient;
    subscription: OwnedSingleItemSubscription;
    targetPriceId: string;
    targetPlan: BillingPlanSlug;
    targetInterval: BillingInterval;
  }>,
): Promise<ScheduledDowngrade> {
  const { start: currentPeriodStart, end: currentPeriodEnd } =
    subscriptionPeriod(input.subscription);
  const attachedId = attachedScheduleId(input.subscription.schedule);
  const bootstrapKey = `gleen-den20-schedule:${input.subscription.id}:${currentPeriodEnd}`;
  let schedule: Stripe.SubscriptionSchedule;

  if (attachedId === null) {
    schedule = await input.stripe.subscriptionSchedules.create(
      { from_subscription: input.subscription.id },
      { idempotencyKey: bootstrapKey },
    );
  } else {
    schedule = await input.stripe.subscriptionSchedules.retrieve(attachedId);
  }

  validatesManagedActiveSchedule(schedule, input.subscription.id);

  if (attachedId !== null && !ownedMetadata(schedule, input.subscription.id)) {
    if (metadataHasGleenKey(schedule.metadata)) return conflict();

    const replayed = await input.stripe.subscriptionSchedules.create(
      { from_subscription: input.subscription.id },
      { idempotencyKey: bootstrapKey },
    );
    validatesManagedActiveSchedule(replayed, input.subscription.id);
    if (replayed.id !== attachedId) return conflict();
    schedule = replayed;
  }

  const scheduled = result(
    schedule.id,
    input.targetPlan,
    input.targetInterval,
    currentPeriodEnd,
  );
  currentPhase(schedule, currentPeriodStart, currentPeriodEnd);
  if (ownedMetadata(schedule, input.subscription.id)) {
    const existingTarget = managedTarget(schedule, currentPeriodEnd);
    if (
      schedule.metadata?.gleen_target_plan === input.targetPlan &&
      schedule.metadata.gleen_target_interval === input.targetInterval
    ) {
      const expectedChangeKey = `gleen-den20-update:${schedule.id}:${input.targetPriceId}:${currentPeriodEnd}`;
      if (existingTarget.changeKey !== expectedChangeKey) return conflict();
      validatesManagedTargetPhase(
        schedule,
        currentPeriodStart,
        currentPeriodEnd,
        existingTarget,
      );
      return scheduled;
    }
    validatesManagedTargetPhase(
      schedule,
      currentPeriodStart,
      currentPeriodEnd,
      existingTarget,
    );
  }

  const changeKey = `gleen-den20-update:${schedule.id}:${input.targetPriceId}:${currentPeriodEnd}`;
  await input.stripe.subscriptionSchedules.update(
    schedule.id,
    {
      end_behavior: 'release',
      proration_behavior: 'none',
      metadata: {
        gleen_owner: gleenOwner,
        gleen_subscription_id: input.subscription.id,
        gleen_target_plan: input.targetPlan,
        gleen_target_interval: input.targetInterval,
        gleen_effective_at: scheduled.effectiveAt,
        gleen_change_key: changeKey,
      },
      phases: [
        currentPhaseUpdate(schedule, currentPeriodStart, currentPeriodEnd),
        futureTargetPhase(
          input.targetPriceId,
          input.targetInterval,
          currentPeriodEnd,
        ),
      ],
    },
    { idempotencyKey: changeKey },
  );

  return scheduled;
}

export async function releaseOwnedDowngrade(
  input: Readonly<{
    stripe: SubscriptionScheduleStripeClient;
    subscription: OwnedSingleItemSubscription;
  }>,
): Promise<void> {
  const scheduleId = attachedScheduleId(input.subscription.schedule);
  if (scheduleId === null) return;

  const schedule =
    await input.stripe.subscriptionSchedules.retrieve(scheduleId);
  validatesManagedActiveSchedule(schedule, input.subscription.id);
  if (!ownedMetadata(schedule, input.subscription.id)) return conflict();

  await input.stripe.subscriptionSchedules.release(
    scheduleId,
    { preserve_cancel_date: true },
    { idempotencyKey: `gleen-den20-release:${scheduleId}` },
  );
}
