'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

import type {
  CheckoutPresentation,
  PricePresentation,
} from '@/lib/billing/presentation';

import { BillingCard, BillingPage, BillingPrism } from './billing-page';

export type CheckoutScreenState =
  | Readonly<{ kind: 'ready' }>
  | Readonly<{ kind: 'loading' }>
  | Readonly<{ kind: 'submitting' }>
  | Readonly<{ kind: 'authentication-required' }>
  | Readonly<{ kind: 'confirming' }>
  | Readonly<{ kind: 'canceled' }>
  | Readonly<{ kind: 'error' }>;

export type CheckoutOrderTotals = Readonly<{
  subtotal: string;
  discount: string;
  tax: string;
  total: string;
  currency: string;
}>;

export async function pollForCheckoutConfirmation(
  check: () => Promise<Readonly<{ confirmed: boolean }>>,
  options: Readonly<{ attempts: number; intervalMs: number }>,
): Promise<boolean> {
  for (let attempt = 0; attempt < options.attempts; attempt += 1) {
    const result = await check();
    if (result.confirmed) return true;
    if (attempt + 1 < options.attempts) {
      await new Promise<void>((resolve) => {
        window.setTimeout(resolve, options.intervalMs);
      });
    }
  }
  return false;
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

function cycleLabel(interval: PricePresentation['interval']) {
  return interval === 'year' ? 'Yearly' : 'Monthly';
}

function stateMessage(state: CheckoutScreenState) {
  switch (state.kind) {
    case 'authentication-required':
      return 'Your session has expired.';
    case 'confirming':
      return 'Confirming your subscription';
    case 'canceled':
      return 'Checkout was canceled.';
    case 'error':
      return 'Checkout could not be loaded.';
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
}: Readonly<{
  presentation: CheckoutPresentation;
  prices: readonly PricePresentation[];
  state: CheckoutScreenState;
  stripeCheckout: ReactNode;
  totals: CheckoutOrderTotals | null;
  onRetry?: () => void;
  onSubmit?: () => void;
  canSubmit?: boolean;
}>) {
  const message = stateMessage(state);
  const disabled =
    state.kind === 'loading' ||
    state.kind === 'submitting' ||
    state.kind === 'confirming' ||
    state.kind === 'authentication-required';
  const submitLabel =
    state.kind === 'loading'
      ? 'Loading secure checkout…'
      : state.kind === 'submitting'
        ? 'Processing…'
        : `Start ${presentation.plan.displayName}`;

  return (
    <BillingPage
      eyebrow="Secure upgrade"
      title="Checkout"
      description="Upgrade your plan securely with a transparent order summary."
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
            <small>
              Access changes only after the verified payment update reaches
              Gleen.
            </small>
          )}
          {state.kind === 'error' && onRetry !== undefined && (
            <button className="billing-button" type="button" onClick={onRetry}>
              Try checkout again
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
                <span className="billing-tag">Selected plan</span>
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
                  {cycleLabel(price.interval)} billing
                  {price.savingsPercent !== null && (
                    <b>Save {price.savingsPercent}%</b>
                  )}
                </span>
                <small>
                  {price.monthlyEquivalent.formattedAmount} / month
                  {price.interval === 'year' ? ', billed yearly' : ''}
                </small>
              </Link>
            ))}
          </BillingCard>

          <BillingCard className="billing-included-card">
            <h2 className="billing-section-title">
              What’s included in {presentation.plan.displayName}
            </h2>
            <div className="billing-product-features">
              {presentation.plan.features.map((feature) => (
                <div key={feature}>{feature}</div>
              ))}
            </div>
          </BillingCard>

          <BillingCard as="section" className="billing-payment-card">
            <div className="billing-payment-head">
              <h2 className="billing-section-title">Payment details</h2>
              <span className="billing-metric-note">
                🔒 All transactions are secure
              </span>
            </div>
            {stripeCheckout}
          </BillingCard>
        </div>

        <BillingCard as="aside" className="billing-order-card">
          <h2 className="billing-section-title">Order summary</h2>
          <div className="billing-order-line">
            <span>Plan</span>
            <b>{presentation.plan.displayName}</b>
          </div>
          <div className="billing-order-line">
            <span>Billing cycle</span>
            <b>{cycleLabel(presentation.price.interval)}</b>
          </div>
          <hr />
          <div className="billing-order-line">
            <span>Subtotal</span>
            <b>{totals?.subtotal ?? 'Calculated securely by Stripe'}</b>
          </div>
          <div className="billing-order-line billing-order-discount">
            <span>Discount</span>
            <b>{totals?.discount ?? '—'}</b>
          </div>
          <div className="billing-order-line">
            <span>Tax</span>
            <b>{totals?.tax ?? 'Calculated after billing address'}</b>
          </div>
          <div className="billing-order-total">
            <span>Total</span>
            <div>
              <strong>{totals?.total ?? '—'}</strong>{' '}
              <small>{totals?.currency ?? ''}</small>
              <div className="billing-metric-note">
                Billed{' '}
                {presentation.price.interval === 'year' ? 'yearly' : 'monthly'}
              </div>
            </div>
          </div>
          <button
            className="billing-button billing-button-primary"
            type="button"
            disabled={disabled || totals === null || !canSubmit}
            onClick={onSubmit}
          >
            {submitLabel}
          </button>
          <div className="billing-secure">
            Secure payments powered by Stripe.
          </div>
          <Link className="billing-button" href="/app/subscription">
            ← Back to plans
          </Link>
        </BillingCard>
      </div>
    </BillingPage>
  );
}
