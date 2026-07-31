import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CheckoutPresentation } from '@/lib/billing/presentation';

const useCheckoutElements = vi.hoisted(() => vi.fn());

vi.mock('@stripe/react-stripe-js/checkout', () => ({
  CheckoutElementsProvider: ({ children }: { children: ReactNode }) => children,
  PaymentElement: () => <div data-testid="payment-element" />,
  BillingAddressElement: () => <div data-testid="address-element" />,
  useCheckoutElements,
}));
vi.mock('@stripe/stripe-js/pure', () => ({
  loadStripe: vi.fn(() => Promise.resolve(null)),
}));

import { CheckoutExperience } from './checkout-experience';

const presentation: CheckoutPresentation = {
  plan: {
    id: 'starter',
    slug: 'starter',
    displayName: 'Starter',
    description: 'For individuals.',
    analysisLimit: 10,
    features: ['10 analyses per month'],
    purchasable: true,
  },
  price: {
    amountMinor: 1900,
    currency: 'usd',
    formattedAmount: '$19.00',
    monthlyEquivalent: {
      amountMinor: 1900,
      currency: 'usd',
      formattedAmount: '$19.00',
    },
    interval: 'month',
    savingsPercent: null,
  },
  action: { enabled: true, reason: null },
};

function installMatchMedia() {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  });
}

function readyCheckout(confirm: () => Promise<unknown>) {
  return {
    type: 'success',
    checkout: {
      canConfirm: true,
      currency: 'usd',
      total: {
        subtotal: { amount: '$19.00' },
        discount: { amount: '$0.00' },
        taxExclusive: { amount: '$0.00' },
        total: { amount: '$19.00' },
      },
      confirm,
    },
  };
}

describe('CheckoutExperience rejection and cleanup', () => {
  beforeEach(() => {
    installMatchMedia();
    useCheckoutElements.mockReset();
  });

  it('aborts confirmation polling on unmount and makes no later server calls', async () => {
    vi.useFakeTimers();
    const getConfirmation = vi.fn().mockResolvedValue({ state: 'pending' });
    const view = render(
      <CheckoutExperience
        presentation={presentation}
        prices={[presentation.price]}
        publishableKey="pk_test_checkout"
        customerEmail="billing-owner@example.test"
        sessionId="cs_test_owned"
        createCheckout={vi.fn()}
        getConfirmation={getConfirmation}
      />,
    );
    await vi.advanceTimersByTimeAsync(0);
    expect(getConfirmation).toHaveBeenCalledOnce();
    view.unmount();
    await vi.advanceTimersByTimeAsync(30_000);
    expect(getConfirmation).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
    vi.useRealTimers();
  });

  it('renders a retryable state when session creation rejects', async () => {
    render(
      <CheckoutExperience
        presentation={presentation}
        prices={[presentation.price]}
        publishableKey="pk_test_checkout"
        customerEmail="billing-owner@example.test"
        sessionId={null}
        createCheckout={vi.fn().mockRejectedValue(new Error('network'))}
        getConfirmation={vi.fn()}
      />,
    );
    expect(
      await screen.findByText('Checkout could not be loaded.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Loading secure checkout…' }),
    ).not.toBeInTheDocument();
  });

  it('resets submitting and shows the Stripe error when confirm rejects', async () => {
    const confirm = vi
      .fn()
      .mockRejectedValue(
        new Error('Complete the required Stripe checkout fields.'),
      );
    useCheckoutElements.mockReturnValue(readyCheckout(confirm));
    render(
      <CheckoutExperience
        presentation={presentation}
        prices={[presentation.price]}
        publishableKey="pk_test_checkout"
        customerEmail="billing-owner@example.test"
        sessionId={null}
        createCheckout={vi.fn().mockResolvedValue({
          ok: true,
          clientSecret: 'cs_test_secret',
        })}
        getConfirmation={vi.fn()}
      />,
    );
    const submit = await screen.findByRole('button', {
      name: 'Start Starter',
    });
    fireEvent.click(submit);
    await waitFor(() =>
      expect(
        screen.getByText('Complete the required Stripe checkout fields.'),
      ).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: 'Start Starter' })).toBeEnabled();
  });

  it('shows the user-facing Stripe confirmation error instead of hiding it', async () => {
    const confirm = vi.fn().mockResolvedValue({
      type: 'error',
      error: {
        code: 'payment_intent_unexpected_state',
        message: 'Your payment could not be completed. Try again.',
      },
    });
    useCheckoutElements.mockReturnValue(readyCheckout(confirm));
    render(
      <CheckoutExperience
        presentation={presentation}
        prices={[presentation.price]}
        publishableKey="pk_test_checkout"
        customerEmail="billing-owner@example.test"
        sessionId={null}
        createCheckout={vi.fn().mockResolvedValue({
          ok: true,
          clientSecret: 'cs_test_secret',
        })}
        getConfirmation={vi.fn()}
      />,
    );

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start Starter' }),
    );

    expect(
      await screen.findByText(
        'Your payment could not be completed. Try again.',
      ),
    ).toHaveAttribute('role', 'alert');
  });

  it('lets Stripe confirm validate the elements when canConfirm is stale', async () => {
    const confirm = vi.fn().mockResolvedValue({ type: 'error' });
    useCheckoutElements.mockReturnValue({
      ...readyCheckout(confirm),
      checkout: {
        ...readyCheckout(confirm).checkout,
        canConfirm: false,
      },
    });
    render(
      <CheckoutExperience
        presentation={presentation}
        prices={[presentation.price]}
        publishableKey="pk_test_checkout"
        customerEmail="billing-owner@example.test"
        sessionId={null}
        createCheckout={vi.fn().mockResolvedValue({
          ok: true,
          clientSecret: 'cs_test_secret',
        })}
        getConfirmation={vi.fn()}
      />,
    );

    const submit = await screen.findByRole('button', {
      name: 'Start Starter',
    });
    expect(submit).toBeEnabled();
    fireEvent.click(submit);
    await waitFor(() =>
      expect(confirm).toHaveBeenCalledWith({
        email: 'billing-owner@example.test',
      }),
    );
  });

  it('mounts the billing address before payment so Stripe does not collect it twice', async () => {
    useCheckoutElements.mockReturnValue(
      readyCheckout(vi.fn().mockResolvedValue({ type: 'success' })),
    );
    render(
      <CheckoutExperience
        presentation={presentation}
        prices={[presentation.price]}
        publishableKey="pk_test_checkout"
        customerEmail="billing-owner@example.test"
        sessionId={null}
        createCheckout={vi.fn().mockResolvedValue({
          ok: true,
          clientSecret: 'cs_test_secret',
        })}
        getConfirmation={vi.fn()}
      />,
    );

    const address = await screen.findByTestId('address-element');
    const payment = screen.getByTestId('payment-element');

    expect(
      address.compareDocumentPosition(payment) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
  });

  it('suppresses Stripe confirmation side effects after unmount', async () => {
    let rejectConfirm!: (reason: Error) => void;
    const confirm = vi.fn(
      () =>
        new Promise<never>((_resolve, reject) => {
          rejectConfirm = reject;
        }),
    );
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    useCheckoutElements.mockReturnValue(readyCheckout(confirm));
    const view = render(
      <CheckoutExperience
        presentation={presentation}
        prices={[presentation.price]}
        publishableKey="pk_test_checkout"
        customerEmail="billing-owner@example.test"
        sessionId={null}
        createCheckout={vi.fn().mockResolvedValue({
          ok: true,
          clientSecret: 'cs_test_secret',
        })}
        getConfirmation={vi.fn()}
      />,
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start Starter' }),
    );
    view.unmount();
    await act(async () => {
      rejectConfirm(new Error('late Stripe failure'));
      await Promise.resolve();
    });

    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });
});
