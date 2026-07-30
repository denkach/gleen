import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { SubscriptionPresentation } from '@/lib/billing/presentation';

import { LimitReachedScreen } from './limit-reached-screen';

const presentation = {
  currentPlan: {
    id: 'starter',
    slug: 'starter',
    displayName: 'Starter',
    description: 'For focused learners.',
    analysisLimit: 25,
    features: ['25 analyses per month', 'Export & download'],
    purchasable: true,
  },
  currentPrice: {
    amountMinor: 1900,
    currency: 'eur',
    formattedAmount: '€19.00',
    interval: 'month',
    savingsPercent: null,
    monthlyEquivalent: {
      amountMinor: 1900,
      currency: 'eur',
      formattedAmount: '€19.00',
    },
  },
  entitlement: {
    key: 'active',
    label: 'Active',
    variant: 'positive',
  },
  usage: {
    used: 24,
    reserved: 1,
    remaining: 0,
    limit: 25,
    extraCredits: 0,
  },
  resetAt: '2025-08-01T00:00:00.000Z',
  resetAtLabel: 'Aug 1, 2025',
  scheduledChange: null,
  paymentMethod: {
    status: 'unavailable',
    label: 'Managed in billing portal',
    expiryLabel: null,
  },
  availablePlans: [
    {
      plan: {
        id: 'starter',
        slug: 'starter',
        displayName: 'Starter',
        description: 'For focused learners.',
        analysisLimit: 25,
        features: ['25 analyses per month', 'Export & download'],
        purchasable: true,
      },
      prices: [],
      action: { enabled: true, reason: null },
    },
    {
      plan: {
        id: 'prism-pro',
        slug: 'prism-pro',
        displayName: 'Prism Pro',
        description: 'For deeper learning.',
        analysisLimit: 500,
        features: [
          '500 analyses per month',
          'Advanced insights & takeaways',
          'Export, share & automate',
          'Priority support',
        ],
        purchasable: true,
      },
      prices: [],
      action: { enabled: true, reason: null },
    },
  ],
} as const satisfies SubscriptionPresentation;

describe('LimitReachedScreen', () => {
  it('renders owner usage and catalog values with the approved blocked state', () => {
    render(
      <LimitReachedScreen
        presentation={presentation}
        now="2025-07-29T00:00:00.000Z"
      />,
    );

    expect(screen.getByText('25 of 25 analyses used')).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();
    expect(screen.getByText(/Saved results remain available/)).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Open usage ledger/ }),
    ).toHaveAttribute('href', '/app/subscription/usage');
    expect(
      screen.getByRole('link', { name: 'Upgrade to Prism Pro' }),
    ).toHaveAttribute('href', '/app/subscription');
    expect(screen.getByText('500 analyses per month')).toBeVisible();
    expect(
      screen.getByText('Resets in 3 days on August 01, 2025'),
    ).toBeVisible();
  });

  it('keeps extra-credit purchase disabled with a visible explanation', () => {
    render(
      <LimitReachedScreen
        presentation={presentation}
        now="2025-07-29T00:00:00.000Z"
      />,
    );

    const button = screen.getByRole('button', {
      name: /Buy extra credits/,
    });
    const explanation = screen.getByText(
      'Extra-credit purchases are not available for the Starter plan.',
    );
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-describedby', explanation.id);
    expect(explanation).toBeVisible();
  });
});
