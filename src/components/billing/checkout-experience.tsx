'use client';

import {
  BillingAddressElement,
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from '@stripe/react-stripe-js/checkout';
import { loadStripe } from '@stripe/stripe-js/pure';
import { useEffect, useMemo, useRef, useState } from 'react';

import type {
  CheckoutPresentation,
  PricePresentation,
} from '@/lib/billing/presentation';

import {
  CheckoutScreen,
  pollForCheckoutConfirmation,
  type CheckoutOrderTotals,
  type CheckoutConfirmationState,
  type CheckoutScreenState,
} from './checkout-screen';

type CheckoutActionResult =
  | Readonly<{ ok: true; clientSecret: string }>
  | Readonly<{ ok: false; code: string }>;
type ConfirmationActionResult = Readonly<{
  state: CheckoutConfirmationState | 'invalid-request';
}>;

const confirmationAttempts = 8;
const confirmationIntervalMs = 1_500;

function CheckoutElements({
  presentation,
  prices,
}: Readonly<{
  presentation: CheckoutPresentation;
  prices: readonly PricePresentation[];
}>) {
  const result = useCheckoutElements();
  const [submitting, setSubmitting] = useState(false);
  const [confirmationError, setConfirmationError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  if (result.type === 'loading') {
    return (
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind: 'loading' }}
        stripeCheckout={<div className="billing-stripe-skeleton" />}
        totals={null}
      />
    );
  }
  if (result.type === 'error') {
    return (
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind: 'retryable-error' }}
        stripeCheckout={null}
        totals={null}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const { checkout } = result;
  const totals: CheckoutOrderTotals = {
    subtotal: checkout.total.subtotal.amount,
    discount: checkout.total.discount.amount,
    tax: checkout.total.taxExclusive.amount,
    total: checkout.total.total.amount,
    currency: checkout.currency.toUpperCase(),
  };

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    setConfirmationError(false);
    try {
      const confirmation = await checkout.confirm();
      if (mounted.current && confirmation.type === 'error') {
        setConfirmationError(true);
      }
    } catch {
      if (mounted.current) setConfirmationError(true);
    } finally {
      if (mounted.current) setSubmitting(false);
    }
  }

  return (
    <CheckoutScreen
      presentation={presentation}
      prices={prices}
      state={
        confirmationError
          ? { kind: 'retryable-error' }
          : submitting
            ? { kind: 'submitting' }
            : { kind: 'ready' }
      }
      stripeCheckout={
        <div className="billing-stripe-elements">
          <BillingAddressElement />
          <PaymentElement />
        </div>
      }
      totals={totals}
      onSubmit={confirm}
      onRetry={() => {
        setConfirmationError(false);
      }}
    />
  );
}

export function CheckoutExperience({
  presentation,
  prices,
  publishableKey,
  sessionId,
  createCheckout,
  getConfirmation,
}: Readonly<{
  presentation: CheckoutPresentation;
  prices: readonly PricePresentation[];
  publishableKey: string;
  sessionId: string | null;
  createCheckout: (input: {
    plan: CheckoutPresentation['plan']['slug'];
    interval: PricePresentation['interval'];
  }) => Promise<CheckoutActionResult>;
  getConfirmation: (sessionId: string) => Promise<ConfirmationActionResult>;
}>) {
  const [confirmationState, setConfirmationState] =
    useState<CheckoutScreenState>(
      sessionId === null ? { kind: 'loading' } : { kind: 'confirming' },
    );
  const stripe = useMemo(() => loadStripe(publishableKey), [publishableKey]);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (sessionId !== null) return;
    let active = true;
    void createCheckout({
      plan: presentation.plan.slug,
      interval: presentation.price.interval,
    })
      .then((result) => {
        if (!active) return;
        if (!result.ok) {
          setConfirmationState(
            result.code === 'session_expired'
              ? { kind: 'authentication-required' }
              : { kind: 'retryable-error' },
          );
          return;
        }
        setClientSecret(result.clientSecret);
      })
      .catch(() => {
        if (active) setConfirmationState({ kind: 'retryable-error' });
      });
    return () => {
      active = false;
    };
  }, [
    createCheckout,
    presentation.plan.slug,
    presentation.price.interval,
    sessionId,
  ]);

  useEffect(() => {
    if (sessionId === null) return;
    const controller = new AbortController();
    void pollForCheckoutConfirmation(
      async () => (await getConfirmation(sessionId)).state,
      {
        attempts: confirmationAttempts,
        intervalMs: confirmationIntervalMs,
        signal: controller.signal,
      },
    )
      .then((result) => {
        if (result === 'aborted') return;
        if (result === 'confirmed') {
          window.location.assign('/app/subscription');
        } else if (result === 'authentication-required') {
          setConfirmationState({ kind: 'authentication-required' });
        } else if (result === 'canceled') {
          setConfirmationState({ kind: 'canceled' });
        } else if (result !== 'pending') {
          setConfirmationState({ kind: 'retryable-error' });
        } else {
          setConfirmationState({ kind: 'retryable-error' });
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setConfirmationState({ kind: 'retryable-error' });
        }
      });
    return () => {
      controller.abort();
    };
  }, [getConfirmation, sessionId]);

  if (sessionId !== null) {
    return (
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={confirmationState}
        stripeCheckout={null}
        totals={null}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (
    confirmationState.kind === 'authentication-required' ||
    confirmationState.kind === 'retryable-error'
  ) {
    return (
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={confirmationState}
        stripeCheckout={null}
        totals={null}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (clientSecret === null) {
    return (
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind: 'loading' }}
        stripeCheckout={<div className="billing-stripe-skeleton" />}
        totals={null}
      />
    );
  }

  return (
    <CheckoutElementsProvider
      stripe={stripe}
      options={{
        clientSecret,
        elementsOptions: {
          appearance: {
            theme: 'night',
            inputs: 'spaced',
            labels: 'above',
            disableAnimations: reducedMotion,
            variables: {
              colorPrimary: '#ad83ff',
              colorBackground: '#0d1119',
              colorText: '#f5f4f8',
              colorDanger: '#ff6d78',
              fontFamily: 'Inter, system-ui, sans-serif',
              borderRadius: '10px',
            },
          },
        },
      }}
    >
      <CheckoutElements presentation={presentation} prices={prices} />
    </CheckoutElementsProvider>
  );
}
