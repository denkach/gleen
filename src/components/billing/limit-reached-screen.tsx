import Link from 'next/link';

import type { SubscriptionPresentation } from '@/lib/billing/presentation';

import { BillingIcon } from './billing-icons';
import { BillingCard, BillingPage, BillingPrism } from './billing-page';

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function resetCopy(resetAt: string, now: string) {
  const days = Math.max(
    0,
    Math.ceil((Date.parse(resetAt) - Date.parse(now)) / dayInMilliseconds),
  );
  const date = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: '2-digit',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(resetAt));

  if (days === 0) return `Resets today on ${date}`;
  return `Resets in ${days} ${days === 1 ? 'day' : 'days'} on ${date}`;
}

function currentPriceLabel(price: SubscriptionPresentation['currentPrice']) {
  if (price === null) return 'Free';
  return (
    <>
      {price.formattedAmount}{' '}
      <small>/ {price.interval === 'month' ? 'month' : 'year'}</small>
    </>
  );
}

export function LimitReachedScreen({
  presentation,
  now,
}: Readonly<{
  presentation: SubscriptionPresentation;
  now: string;
}>) {
  const consumed = presentation.usage.used + presentation.usage.reserved;
  const usagePercent =
    presentation.usage.limit === 0
      ? 0
      : Math.min(100, Math.round((consumed / presentation.usage.limit) * 100));
  const upgrade =
    presentation.availablePlans.find(
      ({ plan, action }) =>
        plan.slug !== presentation.currentPlan.slug &&
        plan.analysisLimit > presentation.currentPlan.analysisLimit &&
        action.enabled,
    ) ?? null;
  const extraCreditsExplanationId = 'billing-extra-credits-unavailable';

  return (
    <BillingPage
      eyebrow="Limit reached"
      title="Analysis limit reached"
      description="You have used all analyses included in your current plan."
    >
      <div className="billing-locked-input" aria-disabled="true">
        <BillingIcon name="lock" />
        Ask anything or add a data source to analyze…
      </div>
      <div className="billing-locked-note">
        <BillingIcon name="lock" />
        New analyses are paused until the limit resets or you upgrade your plan.
      </div>

      <BillingCard className="billing-limit-hero">
        <div className="billing-limit-visual">
          <BillingPrism />
        </div>
        <div className="billing-limit-copy">
          <div className="billing-limit-usage">
            <b>
              {consumed} of {presentation.usage.limit} analyses used
            </b>
            <b>{usagePercent}%</b>
          </div>
          <div
            className="billing-limit-progress"
            role="progressbar"
            aria-label="Analysis usage"
            aria-valuemin={0}
            aria-valuemax={presentation.usage.limit}
            aria-valuenow={consumed}
          >
            <span style={{ width: `${usagePercent}%` }} />
          </div>
          <h2 className="billing-section-title billing-limit-reset">
            {resetCopy(presentation.resetAt, now)}
          </h2>
          <p className="billing-section-copy billing-limit-description">
            You’ve reached your plan’s monthly analysis limit. New analyses are
            blocked until the reset date or until you upgrade. Saved results
            remain available.
          </p>
          <div className="billing-limit-actions">
            {upgrade !== null && (
              <Link
                className="billing-button billing-button-primary"
                href="/app/subscription"
              >
                Upgrade to {upgrade.plan.displayName}
              </Link>
            )}
            <button
              className="billing-button"
              type="button"
              disabled
              aria-describedby={extraCreditsExplanationId}
            >
              Buy extra credits
            </button>
            <Link
              className="billing-limit-ledger-link"
              href="/app/subscription/usage"
            >
              Open usage ledger <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p
            className="billing-limit-disabled-explanation"
            id={extraCreditsExplanationId}
          >
            Extra-credit purchases are not available for the{' '}
            {presentation.currentPlan.displayName} plan.
          </p>
        </div>
      </BillingCard>

      <div className="billing-limit-lower">
        <BillingCard className="billing-plan-mini">
          <h2 className="billing-section-title">Your plan</h2>
          <div className="billing-plan-mini-inner">
            <BillingPrism />
            <div>
              <div className="billing-plan-name billing-limit-plan-name">
                {presentation.currentPlan.displayName}{' '}
                <span className="billing-tag">Current plan</span>
              </div>
              <div className="billing-price billing-limit-price">
                {currentPriceLabel(presentation.currentPrice)}
              </div>
            </div>
            <div>
              <div className="billing-summary-row">
                <span>Analyses</span>
                <b>
                  {consumed} of {presentation.usage.limit} used
                </b>
              </div>
              <div className="billing-summary-row">
                <span>Resets</span>
                <b>
                  <time dateTime={presentation.resetAt}>
                    {new Intl.DateTimeFormat('en-US', {
                      month: 'long',
                      day: '2-digit',
                      year: 'numeric',
                      timeZone: 'UTC',
                    }).format(new Date(presentation.resetAt))}
                  </time>
                </b>
              </div>
            </div>
          </div>
        </BillingCard>
        <BillingCard className="billing-upgrade-mini">
          <h2 className="billing-section-title">
            {upgrade === null
              ? 'Your plan includes'
              : `What changes with ${upgrade.plan.displayName}`}
          </h2>
          <div className="billing-compare-list">
            {(upgrade?.plan.features ?? presentation.currentPlan.features).map(
              (feature, index) => (
                <div
                  className={index % 2 === 1 ? 'billing-spark' : ''}
                  key={feature}
                >
                  {feature}
                </div>
              ),
            )}
          </div>
        </BillingCard>
      </div>
    </BillingPage>
  );
}
