'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { BillingInterval } from '@/lib/billing/domain';
import type {
  PricePresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';
import { cx } from '@/lib/cx';

import { BillingIcon } from './billing-icons';
import {
  BillingCard,
  BillingPage,
  BillingPrism,
  BillingStatus,
} from './billing-page';

type PlanRow = SubscriptionPresentation['availablePlans'][number];

function priceForInterval(
  row: PlanRow,
  interval: BillingInterval,
): PricePresentation | null {
  return row.prices.find((price) => price.interval === interval) ?? null;
}

function intervalLabel(interval: BillingInterval) {
  return interval === 'year' ? 'Yearly' : 'Monthly';
}

export function SubscriptionScreen({
  presentation,
  initialInterval,
}: Readonly<{
  presentation: SubscriptionPresentation | null;
  initialInterval: BillingInterval;
}>) {
  const [interval, setInterval] = useState(initialInterval);

  if (presentation === null) {
    return (
      <BillingPage
        eyebrow="Your plan"
        title="Subscription"
        description="Manage your plan, billing cycle, monthly capacity, and payment method."
      >
        <BillingCard className="billing-state-card">
          <div className="billing-state-icon">
            <BillingIcon name="alert" />
          </div>
          <div role="alert">
            <h2>Billing details are temporarily unavailable.</h2>
            <p>Please try again. Your application access is not affected.</p>
          </div>
          <Link className="billing-button" href="/app/subscription">
            Try subscription again
          </Link>
        </BillingCard>
      </BillingPage>
    );
  }

  const consumed = presentation.usage.used + presentation.usage.reserved;
  const usagePercent =
    presentation.usage.limit === 0
      ? 0
      : Math.min(100, Math.round((consumed / presentation.usage.limit) * 100));
  const paidPlans = presentation.availablePlans.filter(
    (row) => row.prices.length > 0,
  );
  const currentRow =
    presentation.availablePlans.find(
      (row) => row.plan.slug === presentation.currentPlan.slug,
    ) ?? null;
  const comparisonPrice =
    currentRow === null ? null : priceForInterval(currentRow, interval);
  const hasPaidSubscription =
    presentation.currentPrice !== null &&
    ['active', 'trial', 'past_due_with_access'].includes(
      presentation.entitlement.key,
    );

  return (
    <BillingPage
      eyebrow="Your plan"
      title="Subscription"
      description="Manage your plan, billing cycle, monthly capacity, and payment method."
    >
      <BillingCard className="billing-plan-overview">
        <div className="billing-current-plan">
          <BillingPrism />
          <div>
            <div className="billing-metric-label">Current plan</div>
            <div className="billing-plan-name">
              {presentation.currentPlan.displayName}{' '}
              <span className="billing-tag">Current plan</span>
            </div>
            <p className="billing-section-copy">
              {presentation.currentPlan.description}
            </p>
          </div>
        </div>
        <div>
          <div className="billing-metric-label">Included analyses</div>
          <div className="billing-metric-value">
            {presentation.usage.limit} <small>/ billing period</small>
          </div>
        </div>
        <div>
          <div className="billing-metric-label">Used analyses</div>
          <div className="billing-metric-value">{consumed}</div>
          <div className="billing-metric-note">
            {usagePercent}% of the cycle
          </div>
        </div>
        <div>
          <div className="billing-metric-label">Resets on</div>
          <div className="billing-metric-value billing-reset-value">
            <time dateTime={presentation.resetAt}>
              {presentation.resetAtLabel}
            </time>
          </div>
          <div className="billing-metric-note">
            {presentation.usage.remaining} analyses remaining
          </div>
        </div>
      </BillingCard>

      {presentation.scheduledChange !== null && (
        <div className="billing-scheduled-state" role="status">
          <BillingIcon name="plan" />
          <span>
            {presentation.scheduledChange.kind === 'cancellation'
              ? 'Cancellation is scheduled'
              : `${presentation.scheduledChange.plan?.displayName ?? 'A plan change'} is scheduled`}
            . It takes effect on{' '}
            <time dateTime={presentation.scheduledChange.effectiveAt}>
              {presentation.scheduledChange.effectiveAt.slice(0, 10)}
            </time>
            .
          </span>
        </div>
      )}

      <div className="billing-switch" aria-label="Billing period">
        <button
          type="button"
          className={cx(interval === 'month' && 'active')}
          aria-pressed={interval === 'month'}
          onClick={() => setInterval('month')}
        >
          Monthly billing
        </button>
        <button
          type="button"
          className={cx(interval === 'year' && 'active')}
          aria-pressed={interval === 'year'}
          onClick={() => setInterval('year')}
        >
          Yearly billing
        </button>
      </div>

      <div className="billing-subscription-layout">
        <div
          className="billing-plan-grid"
          role="list"
          aria-label="Available paid plans"
        >
          {paidPlans.map((row) => {
            const price = priceForInterval(row, interval);
            const current = row.plan.slug === presentation.currentPlan.slug;
            const available = row.action.enabled && price !== null;
            const actionLabel = current
              ? 'Manage plan'
              : hasPaidSubscription
                ? `Change to ${row.plan.displayName}`
                : `Choose ${row.plan.displayName}`;
            const href = hasPaidSubscription
              ? `/app/subscription/portal?plan=${encodeURIComponent(
                  row.plan.slug,
                )}&interval=${interval}`
              : `/app/subscription/checkout?plan=${encodeURIComponent(
                  row.plan.slug,
                )}&interval=${interval}`;

            return (
              <BillingCard
                as="article"
                className={cx('billing-plan-card', current && 'current')}
                key={row.plan.slug}
              >
                <div role="listitem">
                  <h2>{row.plan.displayName}</h2>
                  <p className="billing-section-copy">{row.plan.description}</p>
                  <div className="billing-price">
                    {price?.monthlyEquivalent.formattedAmount ?? 'Unavailable'}{' '}
                    {price !== null && <small>/ month</small>}
                  </div>
                  <div className="billing-feature-list">
                    {row.plan.features.map((feature) => (
                      <div key={feature}>{feature}</div>
                    ))}
                  </div>
                </div>
                {current ? (
                  <Link
                    className="billing-button billing-button-primary"
                    href="/app/subscription/portal"
                  >
                    {actionLabel}
                  </Link>
                ) : available ? (
                  <Link className="billing-button" href={href}>
                    {actionLabel}
                  </Link>
                ) : (
                  <button
                    className="billing-button"
                    type="button"
                    disabled
                    title={row.action.reason ?? 'This price is unavailable.'}
                    aria-label={`${row.plan.displayName} unavailable`}
                  >
                    Unavailable
                  </button>
                )}
              </BillingCard>
            );
          })}
        </div>

        <BillingCard as="aside" className="billing-summary">
          <div className="billing-summary-head">
            <div className="billing-metric-icon">
              <BillingIcon name="card" />
            </div>
            <div>
              <h2 className="billing-section-title">Billing summary</h2>
              <p className="billing-section-copy">Current payment details</p>
            </div>
          </div>
          <div className="billing-summary-row">
            <span>Payment method</span>
            <span className="billing-payment-method">
              <b>{presentation.paymentMethod.label}</b>
              {presentation.paymentMethod.expiryLabel !== null && (
                <small>{presentation.paymentMethod.expiryLabel}</small>
              )}
            </span>
          </div>
          <div className="billing-summary-row">
            <span>Next renewal</span>
            <b>{presentation.resetAtLabel}</b>
          </div>
          <div className="billing-summary-row">
            <span>Billing cycle</span>
            <b>{intervalLabel(interval)}</b>
          </div>
          <div className="billing-summary-row">
            <span>Amount</span>
            <b>
              {comparisonPrice?.formattedAmount ??
                presentation.currentPrice?.formattedAmount ??
                'No paid renewal'}
              {comparisonPrice !== null &&
                ` / ${comparisonPrice.interval === 'year' ? 'year' : 'month'}`}
            </b>
          </div>
          <div className="billing-summary-row">
            <span>Status</span>
            <BillingStatus variant={presentation.entitlement.variant}>
              {presentation.entitlement.label}
            </BillingStatus>
          </div>
          <div className="billing-summary-actions">
            <Link
              className="billing-button billing-button-primary"
              href="/app/subscription/portal"
            >
              Open billing portal
              <BillingIcon name="external" />
            </Link>
          </div>
          <p className="billing-metric-note">
            Secure payments are managed by Stripe.
          </p>
        </BillingCard>
      </div>
    </BillingPage>
  );
}
