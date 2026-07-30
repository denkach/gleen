'use client';

import {
  BillingAddressElement,
  CheckoutElementsProvider,
  PaymentElement,
  useCheckoutElements,
} from '@stripe/react-stripe-js/checkout';
import { loadStripe } from '@stripe/stripe-js/pure';
import { useEffect, useMemo, useState } from 'react';

import type {
  CheckoutPresentation,
  PricePresentation,
} from '@/lib/billing/presentation';

import {
  CheckoutScreen,
  pollForCheckoutConfirmation,
  type CheckoutOrderTotals,
  type CheckoutScreenState,
} from './checkout-screen';

type CheckoutActionResult =
  | Readonly<{ ok: true; clientSecret: string }>
  | Readonly<{ ok: false; code: string }>;
type ConfirmationActionResult =
  | Readonly<{ ok: true; confirmed: boolean }>
  | Readonly<{ ok: false; code: string }>;

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
        state={{ kind: 'error' }}
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
    if (!checkout.canConfirm || submitting) return;
    setSubmitting(true);
    setConfirmationError(false);
    const confirmation = await checkout.confirm();
    if (confirmation.type === 'error') {
      setSubmitting(false);
      setConfirmationError(true);
    }
  }

  return (
    <CheckoutScreen
      presentation={presentation}
      prices={prices}
      state={
        confirmationError
          ? { kind: 'error' }
          : submitting
            ? { kind: 'submitting' }
            : { kind: 'ready' }
      }
      stripeCheckout={
        <div className="billing-stripe-elements">
          <PaymentElement />
          <BillingAddressElement />
        </div>
      }
      totals={totals}
      canSubmit={checkout.canConfirm}
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
    }).then((result) => {
      if (!active) return;
      if (!result.ok) {
        setConfirmationState(
          result.code === 'session_expired'
            ? { kind: 'authentication-required' }
            : { kind: 'error' },
        );
        return;
      }
      setClientSecret(result.clientSecret);
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
    let active = true;
    void pollForCheckoutConfirmation(
      async () => {
        const result = await getConfirmation(sessionId);
        return { confirmed: result.ok && result.confirmed };
      },
      {
        attempts: confirmationAttempts,
        intervalMs: confirmationIntervalMs,
      },
    ).then((confirmed) => {
      if (!active) return;
      if (confirmed) {
        window.location.assign('/app/subscription');
      } else {
        setConfirmationState({ kind: 'error' });
      }
    });
    return () => {
      active = false;
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
    confirmationState.kind === 'error'
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
