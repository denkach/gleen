import Link from 'next/link';

import type {
  LimitReachedPresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';
import { formatDate } from '@/lib/i18n/format';
import type { Locale } from '@/lib/i18n/locales';
import type { BillingMessages } from '@/lib/i18n/messages/billing';

import { BillingIcon } from './billing-icons';
import { BillingCard, BillingPage } from './billing-page';

const dayInMilliseconds = 24 * 60 * 60 * 1000;

function resetCopy(
  resetAt: string,
  now: string,
  locale: Locale,
  copy: BillingMessages,
) {
  const days = Math.max(
    0,
    Math.ceil((Date.parse(resetAt) - Date.parse(now)) / dayInMilliseconds),
  );
  const date = formatDate({
    value: resetAt,
    locale,
    fallback: '—',
    options: { dateStyle: 'long', timeZone: 'UTC' },
  });

  if (days === 0) return copy.limitReached.resetToday(date);
  return copy.limitReached.resetIn(days, date);
}

function currentPriceLabel(
  price: SubscriptionPresentation['currentPrice'],
  copy: BillingMessages,
) {
  if (price === null) return copy.limitReached.free;
  return (
    <>
      {price.formattedAmount}{' '}
      <small>
        {price.interval === 'month'
          ? copy.limitReached.perMonth
          : copy.limitReached.perYear}
      </small>
    </>
  );
}

function LimitHeroPrism() {
  return (
    <div
      className="billing-prism billing-limit-prism"
      data-limit-prism="hero"
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 120">
        <path
          d="M50 5 91 105H10L50 5Z"
          fill="rgba(124,89,202,.15)"
          stroke="#a792ec"
          strokeWidth="1.7"
        />
        <path
          d="M50 5v100M10 105l57-62 24 62M10 105l40-38 41 38"
          fill="none"
          stroke="rgba(255,255,255,.37)"
        />
      </svg>
    </div>
  );
}

function LimitMiniPrism() {
  return (
    <div
      className="billing-prism billing-limit-prism"
      data-limit-prism="mini"
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 120">
        <path
          d="M50 5 91 105H10L50 5Z"
          fill="rgba(124,89,202,.14)"
          stroke="#9d82e3"
          strokeWidth="2"
        />
      </svg>
    </div>
  );
}

export function LimitReachedScreen({
  presentation,
  now,
  locale,
  copy,
}: Readonly<{
  presentation: LimitReachedPresentation;
  now: string;
  locale: Locale;
  copy: BillingMessages;
}>) {
  const consumed = presentation.usage.used + presentation.usage.reserved;
  const usagePercent =
    presentation.usage.limit === 0
      ? 0
      : Math.min(100, Math.round((consumed / presentation.usage.limit) * 100));
  const upgrade = presentation.limitUpgrade;
  const extraCreditsExplanationId = 'billing-extra-credits-unavailable';

  return (
    <BillingPage
      eyebrow={copy.limitReached.eyebrow}
      title={copy.limitReached.title}
      description={copy.limitReached.description}
      copy={copy}
    >
      <div className="billing-locked-input" aria-disabled="true">
        <BillingIcon name="lock" />
        {copy.limitReached.lockedInput}
      </div>
      <div className="billing-locked-note">
        <BillingIcon name="lock" />
        {copy.limitReached.lockedNote}
      </div>

      <BillingCard className="billing-limit-hero">
        <div className="billing-limit-visual">
          <LimitHeroPrism />
        </div>
        <div className="billing-limit-copy">
          <div className="billing-limit-usage">
            <b>{copy.limitReached.used(consumed, presentation.usage.limit)}</b>
            <b>{usagePercent}%</b>
          </div>
          <div
            className="billing-limit-progress"
            role="progressbar"
            aria-label={copy.limitReached.usageLabel}
            aria-valuemin={0}
            aria-valuemax={presentation.usage.limit}
            aria-valuenow={consumed}
          >
            <span style={{ width: `${usagePercent}%` }} />
          </div>
          <h2 className="billing-section-title billing-limit-reset">
            {resetCopy(presentation.resetAt, now, locale, copy)}
          </h2>
          <p className="billing-section-copy billing-limit-description">
            {copy.limitReached.detail}
          </p>
          <div className="billing-limit-actions">
            {upgrade !== null && (
              <Link
                className="billing-button billing-button-primary"
                href="/app/subscription"
              >
                {copy.limitReached.actions.upgrade(upgrade.plan.displayName)}
              </Link>
            )}
            <button
              className="billing-button"
              type="button"
              disabled
              aria-describedby={extraCreditsExplanationId}
            >
              {copy.limitReached.actions.buyCredits}
            </button>
            <Link
              className="billing-limit-ledger-link"
              href="/app/subscription/usage"
            >
              {copy.limitReached.actions.openLedger}{' '}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p
            className="billing-limit-disabled-explanation"
            id={extraCreditsExplanationId}
          >
            {copy.limitReached.creditsUnavailable(
              presentation.currentPlan.displayName,
            )}
          </p>
        </div>
      </BillingCard>

      <div className="billing-limit-lower">
        <BillingCard className="billing-plan-mini">
          <h2 className="billing-section-title">
            {copy.limitReached.yourPlan}
          </h2>
          <div className="billing-plan-mini-inner">
            <LimitMiniPrism />
            <div>
              <div className="billing-plan-name billing-limit-plan-name">
                {presentation.currentPlan.displayName}{' '}
                <span className="billing-tag">
                  {copy.limitReached.currentPlan}
                </span>
              </div>
              <div className="billing-price billing-limit-price">
                {currentPriceLabel(presentation.currentPrice, copy)}
              </div>
            </div>
            <div>
              <div className="billing-summary-row">
                <span>{copy.limitReached.analyses}</span>
                <b>
                  {copy.limitReached.usedShort(
                    consumed,
                    presentation.usage.limit,
                  )}
                </b>
              </div>
              <div className="billing-summary-row">
                <span>{copy.limitReached.resets}</span>
                <b>
                  <time dateTime={presentation.resetAt}>
                    {formatDate({
                      value: presentation.resetAt,
                      locale,
                      fallback: '—',
                      options: { dateStyle: 'long', timeZone: 'UTC' },
                    })}
                  </time>
                </b>
              </div>
            </div>
          </div>
        </BillingCard>
        <BillingCard className="billing-upgrade-mini">
          <h2 className="billing-section-title">
            {upgrade === null
              ? copy.limitReached.includes
              : copy.limitReached.changes(upgrade.plan.displayName)}
          </h2>
          <div className="billing-compare-list">
            {upgrade === null
              ? presentation.currentPlan.features.map((feature, index) => (
                  <div
                    className="billing-compare-row"
                    key={`${index}:${feature}`}
                  >
                    <div className="billing-compare-baseline billing-compare-current-only">
                      {feature}
                    </div>
                  </div>
                ))
              : upgrade.rows.map((row) => (
                  <div className="billing-compare-row" key={row.id}>
                    <div className="billing-compare-baseline">
                      {row.baseline}
                    </div>
                    <div className="billing-spark">{row.benefit}</div>
                  </div>
                ))}
          </div>
        </BillingCard>
      </div>
    </BillingPage>
  );
}
