import type {
  BillingInterval,
  BillingPlanSlug,
  BillingSnapshot,
} from './domain';

export type PlanChangeTarget = Readonly<{
  plan: BillingPlanSlug;
  interval: BillingInterval;
}>;

export type PlanChangeDirection = 'upgrade' | 'downgrade' | 'unchanged';

export class PlanChangePolicyError extends Error {}

export function classifyPlanChange(
  snapshot: BillingSnapshot,
  target: PlanChangeTarget,
): PlanChangeDirection {
  const currentIndex = snapshot.availablePlans.findIndex(
    ({ plan }) => plan.slug === snapshot.currentPlan.slug,
  );
  const targetIndex = snapshot.availablePlans.findIndex(
    ({ plan }) => plan.slug === target.plan,
  );

  if (snapshot.currentPrice === null || currentIndex < 0 || targetIndex < 0) {
    throw new PlanChangePolicyError();
  }
  if (
    !snapshot.availablePlans[targetIndex]!.prices.some(
      ({ interval }) => interval === target.interval,
    )
  ) {
    throw new PlanChangePolicyError();
  }
  if (targetIndex > currentIndex) return 'upgrade';
  if (targetIndex < currentIndex) return 'downgrade';
  if (target.interval === snapshot.currentPrice.interval) return 'unchanged';
  return snapshot.currentPrice.interval === 'month' &&
    target.interval === 'year'
    ? 'upgrade'
    : 'downgrade';
}
