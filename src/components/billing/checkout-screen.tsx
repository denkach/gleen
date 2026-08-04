'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import type {
  CheckoutPresentation,
  PricePresentation,
} from '@/lib/billing/presentation';
import type { Locale } from '@/lib/i18n/locales';
import type { BillingMessages } from '@/lib/i18n/messages/billing';

import { BillingCard, BillingPage, BillingPrism } from './billing-page';

export type CheckoutScreenState =
  | Readonly<{ kind: 'ready' }>
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'submitting' }>
  | Readonly<{ kind: 'authentication-required' }>
  | Readonly<{ kind: 'confirming' }>
  | Readonly<{ kind: 'canceled' }>
  | Readonly<{ kind: 'retryable-error'; message?: string }>;

export type CheckoutConfirmationState =
  | 'pending'
  | 'confirmed'
  | 'authentication-required'
  | 'canceled'
  | 'invalid-request'
  | 'retryable-error';
export type CheckoutPollResult = CheckoutConfirmationState | 'aborted';

export type CheckoutOrderTotals = Readonly<{
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  currency: string;
}>;

export async function pollForCheckoutConfirmation(
  check: () => Promise<CheckoutConfirmationState>,
  options: Readonly<{
    attempts: number;
    intervalMs: number;
    signal: AbortSignal;
  }>,
): Promise<CheckoutPollResult> {
  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    if (options.signal.aborted) return 'aborted';
    let result: CheckoutConfirmationState;
    try {
      result = await check();
    } catch {
      return options.signal.aborted ? 'aborted' : 'retryable-error';
    }
    if (options.signal.aborted) return 'aborted';
    if (result !== 'pending') return result;
    if (attempt + 1 < options.attempts) {
      const completed = await new Promise<boolean>((resolve) => {
        const timeout = window.setTimeout(() => {
          options.signal.removeEventListener('abort', abort);
          resolve(true);
        }, options.intervalMs);
        const abort = () => {
          window.clearTimeout(timeout);
          resolve(false);
        };
        options.signal.addEventListener('abort', abort, { once: true });
      });
      if (!completed) return 'aborted';
    }
  }
  return 'pending';
}

function cycleHref(
  presentation: CheckoutPresentation,
  interval: PricePresentation['interval'],
) {
  const query = new URLSearchParams({
    plan: presentation.plan.slug,
    interval,
  });
  return `/app/subscription/checkout?${query.toString()}`;
}

function cycleLabel(
  interval: PricePresentation['interval'],
  copy: BillingMessages,
): string {
  return copy.presentation.interval[interval];
}

function stateMessage(state: CheckoutScreenState, copy: BillingMessages) {
  switch (state.kind) {
    case 'authentication-required':
      return copy.checkout.states.authenticationRequired;
    case 'confirming':
      return copy.checkout.states.confirming;
    case 'canceled':
      return copy.checkout.states.canceled;
    case 'retryable-error':
      return state.message === undefined ||
        state.message === copy.checkout.states.retryableError
        ? copy.checkout.states.retryableError
        : `${copy.checkout.states.retryableError} ${state.message}`;
    default:
      return null;
  }
}

export function CheckoutScreen({
  presentation,
  prices,
  state,
  stripeCheckout,
  totals,
  onRetry,
  onSubmit,
  canSubmit = true,
  promotionPreview,
  locale,
  copy,
}: Readonly<{
  presentation: CheckoutPresentation;
  prices: readonly PricePresentation[];
  state: CheckoutScreenState;
  stripeCheckout: ReactNode;
  totals: CheckoutOrderTotals | null;
  onRetry?: () => void;
  onSubmit?: () => void;
  canSubmit?: boolean;
  promotionPreview?: ReactNode;
  locale: Locale;
  copy: BillingMessages;
}>) {
  const message = stateMessage(state, copy);
  const disabled =
    state.kind === 'loading' ||
    state.kind === 'submitting' ||
    state.kind === 'confirming' ||
    state.kind === 'authentication-required';
  const submitLabel =
    state.kind === 'loading'
      ? copy.checkout.actions.loading
      : state.kind === 'submitting'
        ? copy.checkout.actions.processing
        : copy.checkout.actions.submit(presentation.plan.displayName);

  return (
    <BillingPage
      locale={locale}
      eyebrow={copy.checkout.eyebrow}
      title={copy.checkout.title}
      description={copy.checkout.description}
    >
      {message !== null && (
        <BillingCard className="billing-checkout-state">
          <p
            role={
              state.kind === 'confirming' || state.kind === 'canceled'
                ? 'status'
                : 'alert'
            }
            aria-live="polite"
          >
            {message}
          </p>
          {state.kind === 'confirming' && (
            <small>{copy.checkout.states.confirmingDetail}</small>
          )}
          {state.kind === 'retryable-error' && onRetry !== undefined && (
            <button className="billing-button" type="button" onClick={onRetry}>
              {copy.checkout.actions.retry}
            </button>
          )}
        </BillingCard>
      )}

      <div className="billing-checkout-grid">
        <div className="billing-checkout-left">
          <BillingCard className="billing-product-card">
            <BillingPrism />
            <div>
              <div className="billing-product-name">
                <span className="billing-plan-name">
                  {presentation.plan.displayName}
                </span>
                <span className="billing-tag">
                  {copy.checkout.selectedPlan}
                </span>
              </div>
              <p className="billing-section-copy">
                {presentation.plan.description}
              </p>
            </div>
            <div className="billing-product-features">
              {presentation.plan.features.slice(0, 3).map((feature) => (
                <div key={feature}>{feature}</div>
              ))}
            </div>
          </BillingCard>

          <BillingCard className="billing-checkout-cycle">
            {prices.map((price) => (
              <Link
                className={
                  price.interval === presentation.price.interval ? 'active' : ''
                }
                href={cycleHref(presentation, price.interval)}
                key={price.interval}
                aria-current={
                  price.interval === presentation.price.interval
                    ? 'page'
                    : undefined
                }
              >
                <span>
                  {copy.checkout.billing(cycleLabel(price.interval, copy))}
                  {price.savingsPercent !== null && (
                    <b>{copy.checkout.save(price.savingsPercent)}</b>
                  )}
                </span>
                <small>
                  {copy.checkout.monthlyEquivalent(
                    price.monthlyEquivalent.formattedAmount,
                  )}
                  {price.interval === 'year'
                    ? `, ${copy.checkout.billedYearly}`
                    : ''}
                </small>
              </Link>
            ))}
          </BillingCard>

          <BillingCard className="billing-included-card">
            <h2 className="billing-section-title">
              {copy.checkout.included(presentation.plan.displayName)}
            </h2>
            <div className="billing-product-features">
              {presentation.plan.features.map((feature) => (
                <div key={feature}>{feature}</div>
              ))}
            </div>
          </BillingCard>

          <BillingCard as="section" className="billing-payment-card">
            <div className="billing-payment-head">
              <h2 className="billing-section-title">
                {copy.checkout.paymentDetails}
              </h2>
              <span className="billing-metric-note">
                🔒 {copy.checkout.transactionsSecure}
              </span>
            </div>
            {stripeCheckout}
          </BillingCard>
        </div>

        <BillingCard as="aside" className="billing-order-card">
          <h2 className="billing-section-title">{copy.checkout.order.title}</h2>
          <div className="billing-order-line">
            <span>{copy.checkout.order.plan}</span>
            <b>{presentation.plan.displayName}</b>
          </div>
          <div className="billing-order-line">
            <span>{copy.checkout.order.billingCycle}</span>
            <b>{cycleLabel(presentation.price.interval, copy)}</b>
          </div>
          <hr />
          <div className="billing-order-line">
            <span>{copy.checkout.order.subtotal}</span>
            <b>{totals?.subtotal ?? copy.checkout.order.calculatedByStripe}</b>
          </div>
          <div className="billing-order-line billing-order-discount">
            <span>{copy.checkout.order.discount}</span>
            <b>{totals?.discount ?? '—'}</b>
          </div>
          <div className="billing-order-line">
            <span>{copy.checkout.order.tax}</span>
            <b>{totals?.tax ?? copy.checkout.order.calculatedAfterAddress}</b>
          </div>
          <div className="billing-order-total">
            <span>{copy.checkout.order.total}</span>
            <div>
              <strong>{totals?.total ?? '—'}</strong>{' '}
              <small>{totals?.currency ?? ''}</small>
              <div className="billing-metric-note">
                {copy.checkout.order.billed(
                  copy.presentation.intervalAdverb[presentation.price.interval],
                )}
              </div>
            </div>
          </div>
          {promotionPreview}
          <button
            className="billing-button billing-button-primary"
            type="button"
            disabled={disabled || totals === null || !canSubmit}
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
          <div className="billing-secure">{copy.checkout.securePayments}</div>
          <Link className="billing-button" href="/app/subscription">
            {copy.checkout.actions.back}
          </Link>
        </BillingCard>
      </div>
    </BillingPage>
  );
}
