'use client';

import Link from 'next/link';
import { useState } from 'react';

import type { BillingInterval } from '@/lib/billing/domain';
import type {
  PricePresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';
import { cx } from '@/lib/cx';
import { formatDate } from '@/lib/i18n/format';
import type { BillingMessages } from '@/lib/i18n/messages/billing';

import {
  resolveBillingCopySource,
  type BillingCopySource,
} from './billing-copy-source';
import { BillingIcon } from './billing-icons';
import {
  BillingCard,
  BillingPage,
  BillingPrism,
  BillingStatus,
} from './billing-page';
import {
  SubscriptionRecoveryCard,
  type SubscriptionRecoveryCardControls,
} from './subscription-recovery-card';

type PlanRow = SubscriptionPresentation['availablePlans'][number];

function priceForInterval(
  row: PlanRow,
  interval: BillingInterval,
): PricePresentation | null {
  return row.prices.find((price) => price.interval === interval) ?? null;
}

function intervalLabel(
  interval: BillingInterval,
  copy: BillingMessages,
): string {
  return copy.presentation.interval[interval];
}

export function SubscriptionScreen({
  presentation,
  initialInterval,
  copySource,
  recoveryControls,
}: Readonly<{
  presentation: SubscriptionPresentation | null;
  initialInterval: BillingInterval;
  copySource: BillingCopySource;
  recoveryControls?: SubscriptionRecoveryCardControls;
}>) {
  const { locale, copy } = resolveBillingCopySource(copySource);
  const [interval, setInterval] = useState(initialInterval);

  if (presentation === null) {
    return (
      <BillingPage
        locale={locale}
        eyebrow={copy.subscription.eyebrow}
        title={copy.subscription.title}
        description={copy.subscription.description}
      >
        <SubscriptionRecoveryCard
          copy={copy.subscription.error}
          locale={locale}
          {...recoveryControls}
        />
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
      locale={locale}
      eyebrow={copy.subscription.eyebrow}
      title={copy.subscription.title}
      description={copy.subscription.description}
    >
      <BillingCard className="billing-plan-overview">
        <div className="billing-current-plan">
          <BillingPrism />
          <div>
            <div className="billing-metric-label">
              {copy.subscription.currentPlan}
            </div>
            <div className="billing-plan-name">
              {presentation.currentPlan.displayName}{' '}
              <span className="billing-tag">
                {copy.subscription.currentPlan}
              </span>
            </div>
            <p className="billing-section-copy">
              {presentation.currentPlan.description}
            </p>
          </div>
        </div>
        <div>
          <div className="billing-metric-label">
            {copy.subscription.includedAnalyses}
          </div>
          <div className="billing-metric-value">
            {presentation.usage.limit}{' '}
            <small>{copy.subscription.perBillingPeriod}</small>
          </div>
        </div>
        <div>
          <div className="billing-metric-label">
            {copy.subscription.usedAnalyses}
          </div>
          <div className="billing-metric-value">{consumed}</div>
          <div className="billing-metric-note">
            {copy.subscription.cyclePercent(usagePercent)}
          </div>
        </div>
        <div>
          <div className="billing-metric-label">
            {copy.subscription.resetsOn}
          </div>
          <div className="billing-metric-value billing-reset-value">
            <time dateTime={presentation.resetAt}>
              {presentation.resetAtLabel}
            </time>
          </div>
          <div className="billing-metric-note">
            {copy.subscription.remaining(presentation.usage.remaining)}
          </div>
        </div>
      </BillingCard>

      {presentation.scheduledChange !== null && (
        <div className="billing-scheduled-state" role="status">
          <BillingIcon name="plan" />
          <span>
            {presentation.scheduledChange.kind === 'cancellation'
              ? copy.subscription.scheduled.cancellation
              : copy.subscription.scheduled.planChange(
                  presentation.scheduledChange.plan?.displayName ??
                    copy.subscription.currentPlan,
                )}
            .{' '}
            {copy.subscription.scheduled.effective(
              formatDate({
                value: presentation.scheduledChange.effectiveAt,
                locale,
                fallback: '—',
                options: { dateStyle: 'medium', timeZone: 'UTC' },
              }),
            )}
          </span>
        </div>
      )}

      <div
        className="billing-switch"
        aria-label={copy.subscription.billingPeriod}
      >
        <button
          type="button"
          className={cx(interval === 'month' && 'active')}
          aria-pressed={interval === 'month'}
          onClick={() => setInterval('month')}
        >
          {copy.subscription.monthlyBilling}
        </button>
        <button
          type="button"
          className={cx(interval === 'year' && 'active')}
          aria-pressed={interval === 'year'}
          onClick={() => setInterval('year')}
        >
          {copy.subscription.yearlyBilling}
        </button>
      </div>

      <div className="billing-subscription-layout">
        <div
          className="billing-plan-grid"
          role="list"
          aria-label={copy.subscription.availablePlans}
        >
          {paidPlans.map((row) => {
            const price = priceForInterval(row, interval);
            const current = row.plan.slug === presentation.currentPlan.slug;
            const available = row.action.enabled && price !== null;
            const actionLabel = current
              ? copy.subscription.actions.managePlan
              : hasPaidSubscription
                ? copy.subscription.actions.changeTo(row.plan.displayName)
                : copy.subscription.actions.choose(row.plan.displayName);
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
                {current && (
                  <span className="billing-current-ribbon">
                    {copy.subscription.currentPlan}
                  </span>
                )}
                <div role="listitem">
                  <h2>{row.plan.displayName}</h2>
                  <p className="billing-section-copy">{row.plan.description}</p>
                  <div className="billing-price">
                    {price?.monthlyEquivalent.formattedAmount ??
                      copy.subscription.unavailablePrice}{' '}
                    {price !== null && (
                      <small>{copy.subscription.perMonth}</small>
                    )}
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
                    title={
                      row.action.reason ??
                      copy.subscription.actions.priceUnavailable
                    }
                    aria-label={copy.subscription.actions.unavailableAria(
                      row.plan.displayName,
                    )}
                  >
                    {copy.subscription.actions.unavailable}
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
              <h2 className="billing-section-title">
                {copy.subscription.summary.title}
              </h2>
              <p className="billing-section-copy">
                {copy.subscription.summary.description}
              </p>
            </div>
          </div>
          <div className="billing-summary-row">
            <span>{copy.subscription.summary.paymentMethod}</span>
            <span className="billing-payment-method">
              <b>{presentation.paymentMethod.label}</b>
              {presentation.paymentMethod.expiryLabel !== null && (
                <small>{presentation.paymentMethod.expiryLabel}</small>
              )}
            </span>
          </div>
          <div className="billing-summary-row">
            <span>{copy.subscription.summary.nextRenewal}</span>
            <b>{presentation.resetAtLabel}</b>
          </div>
          <div className="billing-summary-row">
            <span>{copy.subscription.summary.billingCycle}</span>
            <b>{intervalLabel(interval, copy)}</b>
          </div>
          <div className="billing-summary-row">
            <span>{copy.subscription.summary.amount}</span>
            <b>
              {comparisonPrice?.formattedAmount ??
                presentation.currentPrice?.formattedAmount ??
                copy.subscription.summary.noPaidRenewal}
              {comparisonPrice !== null &&
                ` / ${copy.presentation.intervalUnit[comparisonPrice.interval]}`}
            </b>
          </div>
          <div className="billing-summary-row">
            <span>{copy.subscription.summary.status}</span>
            <BillingStatus variant={presentation.entitlement.variant}>
              {presentation.entitlement.label}
            </BillingStatus>
          </div>
          <div className="billing-summary-actions">
            <Link
              className="billing-button billing-button-primary"
              href="/app/subscription/portal"
            >
              {copy.subscription.summary.openPortal}
              <BillingIcon name="external" />
            </Link>
          </div>
          <p className="billing-metric-note">
            {copy.subscription.summary.secure}
          </p>
        </BillingCard>
      </div>
    </BillingPage>
  );
}
