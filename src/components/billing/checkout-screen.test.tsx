import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { CheckoutPresentation } from '@/lib/billing/presentation';
import { billingMessages } from '@/lib/i18n/messages/billing';

import {
  CheckoutScreen as ProductionCheckoutScreen,
  pollForCheckoutConfirmation,
} from './checkout-screen';

type CheckoutScreenProps = ComponentProps<typeof ProductionCheckoutScreen>;
function CheckoutScreen({
  locale = 'en',
  copy = billingMessages.en,
  ...props
}: Omit<CheckoutScreenProps, 'locale' | 'copy'> &
  Partial<Pick<CheckoutScreenProps, 'locale' | 'copy'>>) {
  return <ProductionCheckoutScreen {...props} locale={locale} copy={copy} />;
}

const presentation: CheckoutPresentation = {
  plan: {
    id: 'prism-pro',
    slug: 'prism-pro',
    displayName: 'Prism Pro',
    description:
      'For professionals who need deeper insights and more capacity.',
    analysisLimit: 25,
    features: [
      '25 analyses per month',
      'Advanced insights & takeaways',
      'All premium templates',
      'Export & download',
      'Priority support',
    ],
    purchasable: true,
  },
  price: {
    amountMinor: 46800,
    currency: 'usd',
    formattedAmount: '$468.00',
    monthlyEquivalent: {
      amountMinor: 3900,
      currency: 'usd',
      formattedAmount: '$39.00',
    },
    interval: 'year',
    savingsPercent: 20,
  },
  action: { enabled: true, reason: null },
};

const prices = [
  presentation.price,
  {
    ...presentation.price,
    amountMinor: 4900,
    formattedAmount: '$49.00',
    monthlyEquivalent: {
      amountMinor: 4900,
      currency: 'usd',
      formattedAmount: '$49.00',
    },
    interval: 'month' as const,
    savingsPercent: null,
  },
];

describe('CheckoutScreen', () => {
  it('renders Spanish checkout headings, actions, payment states, and navigation', () => {
    render(
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind: 'retryable-error' }}
        stripeCheckout={null}
        totals={null}
        locale="es"
        copy={billingMessages.es}
        onRetry={() => undefined}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Pago' })).toBeInTheDocument();
    expect(
      screen.getByText('No se ha podido cargar el pago.'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Volver a intentar el pago' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', {
        name: 'Navegación móvil de facturación',
      }),
    ).toBeInTheDocument();
  });
  it('renders the selected server model, cycle choices, Stripe mount, and authoritative totals without raw card fields', () => {
    render(
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind: 'ready' }}
        stripeCheckout={<div data-testid="stripe-checkout-elements" />}
        totals={{
          subtotal: '$468.00',
          discount: '$0.00',
          tax: '$37.44',
          total: '$505.44',
          currency: 'USD',
        }}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Checkout' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Prism Pro').length).toBeGreaterThan(0);
    expect(screen.getByText('Selected plan')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /yearly billing/i }),
    ).toHaveAttribute('href', expect.stringContaining('interval=year'));
    expect(
      screen.getByRole('link', { name: /monthly billing/i }),
    ).toHaveAttribute('href', expect.stringContaining('interval=month'));
    expect(screen.getByTestId('stripe-checkout-elements')).toBeInTheDocument();
    expect(screen.getByText('$505.44')).toBeInTheDocument();
    expect(screen.getByText('USD')).toBeInTheDocument();
    expect(screen.queryByLabelText(/card number/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^cvc$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/expiry/i)).not.toBeInTheDocument();
  });

  it.each([
    ['authentication-required', 'Your session has expired.'],
    ['confirming', 'Confirming your subscription'],
    ['canceled', 'Checkout was canceled.'],
    ['retryable-error', 'Checkout could not be loaded.'],
  ] as const)('renders the %s state', (kind, copy) => {
    render(
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind }}
        stripeCheckout={null}
        totals={null}
      />,
    );
    expect(screen.getByText(copy)).toBeInTheDocument();
  });

  it('keeps the submit disabled while Stripe is loading or submitting', () => {
    const { rerender } = render(
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind: 'loading' }}
        stripeCheckout={null}
        totals={null}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'Loading secure checkout…' }),
    ).toBeDisabled();

    rerender(
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind: 'submitting' }}
        stripeCheckout={<div data-testid="stripe-checkout-elements" />}
        totals={null}
      />,
    );
    expect(screen.getByRole('button', { name: 'Processing…' })).toBeDisabled();
  });

  it('retries a retryable checkout error through the supplied safe callback', () => {
    const retry = vi.fn();
    render(
      <CheckoutScreen
        presentation={presentation}
        prices={prices}
        state={{ kind: 'retryable-error' }}
        stripeCheckout={null}
        totals={null}
        onRetry={retry}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Try checkout again' }));
    expect(retry).toHaveBeenCalledOnce();
  });
});

describe('pollForCheckoutConfirmation', () => {
  it('stops after a bounded number of server checks and never confirms locally', async () => {
    vi.useFakeTimers();
    const check = vi.fn().mockResolvedValue('pending');
    const pending = pollForCheckoutConfirmation(check, {
      attempts: 3,
      intervalMs: 100,
      signal: new AbortController().signal,
    });
    await vi.advanceTimersByTimeAsync(500);
    await expect(pending).resolves.toBe('pending');
    expect(check).toHaveBeenCalledTimes(3);
    vi.useRealTimers();
  });

  it('returns only after the authenticated server snapshot confirms', async () => {
    const check = vi
      .fn()
      .mockResolvedValueOnce('pending')
      .mockResolvedValueOnce('confirmed');
    await expect(
      pollForCheckoutConfirmation(check, {
        attempts: 3,
        intervalMs: 0,
        signal: new AbortController().signal,
      }),
    ).resolves.toBe('confirmed');
    await waitFor(() => expect(check).toHaveBeenCalledTimes(2));
  });

  it.each(['authentication-required', 'canceled', 'retryable-error'] as const)(
    'stops immediately on %s confirmation',
    async (terminal) => {
      const check = vi.fn().mockResolvedValue(terminal);
      await expect(
        pollForCheckoutConfirmation(check, {
          attempts: 8,
          intervalMs: 100,
          signal: new AbortController().signal,
        }),
      ).resolves.toBe(terminal);
      expect(check).toHaveBeenCalledOnce();
    },
  );

  it('clears the active timeout and makes no further calls after abort', async () => {
    vi.useFakeTimers();
    const controller = new AbortController();
    const check = vi.fn().mockResolvedValue('pending');
    const pending = pollForCheckoutConfirmation(check, {
      attempts: 8,
      intervalMs: 100,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);
    expect(check).toHaveBeenCalledOnce();
    controller.abort();
    await vi.advanceTimersByTimeAsync(1000);
    await expect(pending).resolves.toBe('aborted');
    expect(check).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('maps a rejected server check to a retryable terminal state', async () => {
    await expect(
      pollForCheckoutConfirmation(
        vi.fn().mockRejectedValue(new Error('network')),
        {
          attempts: 8,
          intervalMs: 100,
          signal: new AbortController().signal,
        },
      ),
    ).resolves.toBe('retryable-error');
  });
});
