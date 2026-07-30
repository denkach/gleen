import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type {
  InvoicePresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';

import { PortalScreen } from './portal-screen';

const subscription = {
  currentPlan: {
    id: 'prism-pro',
    slug: 'prism-pro',
    displayName: 'Prism Pro',
    description: 'Professional analysis.',
    analysisLimit: 25,
    features: ['25 analyses per month'],
    purchasable: true,
  },
  currentPrice: {
    amountMinor: 4900,
    currency: 'usd',
    formattedAmount: '$49.00',
    monthlyEquivalent: {
      amountMinor: 4900,
      currency: 'usd',
      formattedAmount: '$49.00',
    },
    interval: 'month',
    savingsPercent: null,
  },
  entitlement: { key: 'active', label: 'Active', variant: 'positive' },
  resetAt: '2026-08-01T00:00:00.000Z',
  resetAtLabel: 'Aug 1, 2026',
  paymentMethod: {
    status: 'available',
    label: 'Visa •••• 4242',
    expiryLabel: 'Expires 08/2028',
  },
  outstandingBalance: '$0.00',
} as const satisfies Pick<
  SubscriptionPresentation,
  | 'currentPlan'
  | 'currentPrice'
  | 'entitlement'
  | 'resetAt'
  | 'resetAtLabel'
  | 'paymentMethod'
> & { outstandingBalance: string };

const activity = {
  items: [
    {
      id: 'invoice-1',
      number: 'INV-2048',
      planSlug: 'prism-pro',
      planName: 'Prism Pro',
      interval: 'month',
      amountDue: {
        amountMinor: 4900,
        currency: 'usd',
        formattedAmount: '$49.00',
      },
      amountPaid: {
        amountMinor: 4900,
        currency: 'usd',
        formattedAmount: '$49.00',
      },
      refundedAmount: {
        amountMinor: 0,
        currency: 'usd',
        formattedAmount: '$0.00',
      },
      status: { key: 'paid', label: 'Paid', variant: 'positive' },
      createdAt: '2026-07-01T00:00:00.000Z',
      createdAtLabel: 'Jul 1, 2026',
      dueAt: null,
      dueAtLabel: null,
      paidAt: '2026-07-01T00:00:00.000Z',
      paidAtLabel: 'Jul 1, 2026',
      hostedUrl: 'https://invoice.stripe.com/i/acct_test/inv_1',
      pdfUrl: 'https://pay.stripe.com/invoice/acct_test/inv_1/pdf',
    },
  ],
  nextCursor: null,
  totalCount: 1,
} satisfies InvoicePresentation;

describe('PortalScreen', () => {
  it('renders the owned plan, masked payment method, renewal, balance, and billing activity', () => {
    render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('heading', { name: 'Billing portal' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Visa •••• 4242')).toBeInTheDocument();
    expect(screen.getByText('Aug 1, 2026')).toBeInTheDocument();
    expect(screen.getByText('$0.00')).toBeInTheDocument();
    expect(screen.getByText('Invoice INV-2048')).toBeInTheDocument();
  });

  it('creates a fresh authenticated Portal session for every supported action', async () => {
    const portalAction = vi.fn().mockResolvedValue({
      ok: true,
      url: 'https://billing.stripe.com/p/session_test',
    });
    const openPortal = vi.fn();
    render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={portalAction}
        openPortal={openPortal}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Update payment method' }),
    );
    await waitFor(() => expect(portalAction).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'Manage plan' }));
    await waitFor(() => expect(portalAction).toHaveBeenCalledTimes(2));
    fireEvent.click(
      screen.getByRole('button', { name: 'Edit billing details' }),
    );
    await waitFor(() => expect(portalAction).toHaveBeenCalledTimes(3));
    expect(openPortal).toHaveBeenCalledTimes(3);
  });

  it('keeps Team controls truly disabled and explained', () => {
    render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={vi.fn()}
      />,
    );
    const explanation = screen.getByText(
      'Team seat management is not available yet.',
    );
    for (const name of ['Invite member', 'Manage seats']) {
      const button = screen.getByRole('button', { name });
      expect(button).toBeDisabled();
      expect(button).toHaveAttribute('aria-describedby', explanation.id);
    }
  });

  it('renders an explicit recoverable error without fabricated billing data', () => {
    render(
      <PortalScreen
        subscription={null}
        activity={null}
        portalAction={vi.fn()}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Billing details are temporarily unavailable.',
    );
    expect(screen.queryByText(/4242/)).not.toBeInTheDocument();
  });
});
