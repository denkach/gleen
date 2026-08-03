import { describe, expect, it } from 'vitest';

import type {
  BillingInterval,
  BillingPlanSlug,
  BillingSnapshot,
} from './domain';
import { billingFixtureCatalog } from './fixtures';
import { classifyPlanChange, PlanChangePolicyError } from './plan-change';

function snapshotFor(
  currentPlan: BillingPlanSlug,
  currentInterval: BillingInterval,
): BillingSnapshot {
  const currentCatalogPlan = billingFixtureCatalog.find(
    ({ plan }) => plan.slug === currentPlan,
  );
  const currentPrice = currentCatalogPlan?.prices.find(
    ({ interval }) => interval === currentInterval,
  );

  if (currentCatalogPlan === undefined || currentPrice === undefined) {
    throw new Error(
      `Missing test catalog price: ${currentPlan}/${currentInterval}`,
    );
  }

  return {
    currentPlan: currentCatalogPlan.plan,
    currentPrice,
    period: {
      startsAt: '2026-07-01T00:00:00.000Z',
      endsAt: '2026-08-01T00:00:00.000Z',
    },
    usage: {
      used: 0,
      reserved: 0,
      remaining: currentCatalogPlan.plan.analysisLimit,
      limit: currentCatalogPlan.plan.analysisLimit,
      extraCredits: 0,
    },
    scheduledChange: null,
    paymentSummary: {
      subscriptionStatus: 'active',
      paidThrough: '2026-08-01T00:00:00.000Z',
      outstandingAmountMinor: 0,
      currency: 'usd',
    },
    recentActivity: [],
    availablePlans: billingFixtureCatalog,
  };
}

describe('classifyPlanChange', () => {
  it.each([
    ['starter', 'month', 'prism-pro', 'month', 'upgrade'],
    ['starter', 'year', 'prism-pro', 'month', 'upgrade'],
    ['prism-pro', 'month', 'starter', 'year', 'downgrade'],
    ['prism-pro', 'year', 'starter', 'month', 'downgrade'],
    ['starter', 'month', 'starter', 'year', 'upgrade'],
    ['starter', 'year', 'starter', 'month', 'downgrade'],
    ['starter', 'month', 'starter', 'month', 'unchanged'],
  ] as const)(
    '%s/%s -> %s/%s is %s',
    (currentPlan, currentInterval, targetPlan, targetInterval, expected) => {
      expect(
        classifyPlanChange(snapshotFor(currentPlan, currentInterval), {
          plan: targetPlan,
          interval: targetInterval,
        }),
      ).toBe(expected);
    },
  );

  it('rejects a Free snapshot without a current paid price', () => {
    const freePlan = billingFixtureCatalog.find(
      ({ plan }) => plan.slug === 'free',
    );
    if (freePlan === undefined) throw new Error('Missing Free test plan');

    const snapshot = {
      ...snapshotFor('starter', 'month'),
      currentPlan: freePlan.plan,
      currentPrice: null,
    };

    expect(() =>
      classifyPlanChange(snapshot, { plan: 'starter', interval: 'month' }),
    ).toThrow(PlanChangePolicyError);
  });

  it('rejects a target plan absent from the server catalog', () => {
    const snapshot = {
      ...snapshotFor('starter', 'month'),
      availablePlans: billingFixtureCatalog.filter(
        ({ plan }) => plan.slug !== 'prism-pro',
      ),
    };

    expect(() =>
      classifyPlanChange(snapshot, { plan: 'prism-pro', interval: 'month' }),
    ).toThrow(PlanChangePolicyError);
  });

  it('rejects a target interval unavailable in the server catalog', () => {
    const snapshot = {
      ...snapshotFor('starter', 'month'),
      availablePlans: billingFixtureCatalog.map((entry) =>
        entry.plan.slug === 'prism-pro'
          ? {
              ...entry,
              prices: entry.prices.filter(
                ({ interval }) => interval === 'month',
              ),
            }
          : entry,
      ),
    };

    expect(() =>
      classifyPlanChange(snapshot, { plan: 'prism-pro', interval: 'year' }),
    ).toThrow(PlanChangePolicyError);
  });
});
