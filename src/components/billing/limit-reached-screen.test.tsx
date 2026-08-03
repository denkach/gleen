import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { BillingSnapshot } from '@/lib/billing/domain';
import {
  toLimitReachedPresentation,
  type LimitReachedPresentation,
} from '@/lib/billing/presentation';
import { billingFixtureCatalog } from '@/lib/billing/fixtures';

import { LimitReachedScreen } from './limit-reached-screen';

const presentation = {
  currentPlan: {
    id: 'starter',
    slug: 'starter',
    displayName: 'Starter',
    description: 'For focused learners.',
    analysisLimit: 10,
    features: [
      '10 analyses per month',
      'Basic insights & summaries',
      'Standard templates',
      'Export results',
      'Email support',
    ],
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
    used: 9,
    reserved: 1,
    remaining: 0,
    limit: 10,
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
        analysisLimit: 10,
        features: [
          '10 analyses per month',
          'Basic insights & summaries',
          'Standard templates',
          'Export results',
          'Email support',
        ],
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
      prices: [],
      action: { enabled: true, reason: null },
    },
  ],
  limitUpgrade: {
    plan: {
      id: 'prism-pro',
      slug: 'prism-pro',
      displayName: 'Prism Pro',
      description: 'For deeper learning.',
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
    rows: [
      {
        id: 'starter-to-prism-pro-0',
        baseline: '10 analyses per month',
        benefit: '25 analyses per month',
      },
      {
        id: 'starter-to-prism-pro-1',
        baseline: 'Basic insights & summaries',
        benefit: 'Advanced insights & takeaways',
      },
      {
        id: 'starter-to-prism-pro-2',
        baseline: 'Standard templates',
        benefit: 'All premium templates',
      },
      {
        id: 'starter-to-prism-pro-3',
        baseline: 'Export results',
        benefit: 'Export & download',
      },
      {
        id: 'starter-to-prism-pro-4',
        baseline: 'Email support',
        benefit: 'Priority support',
      },
    ],
  },
} as const satisfies LimitReachedPresentation;

describe('LimitReachedScreen', () => {
  it('renders owner usage and catalog values with the approved blocked state', () => {
    render(
      <LimitReachedScreen
        presentation={presentation}
        now="2025-07-29T00:00:00.000Z"
      />,
    );

    expect(screen.getByText('10 of 10 analyses used')).toBeVisible();
    expect(screen.getByText('100%')).toBeVisible();
    expect(screen.getByText(/Saved results remain available/)).toBeVisible();
    expect(
      screen.getByRole('link', { name: /Open usage ledger/ }),
    ).toHaveAttribute('href', '/app/subscription/usage');
    expect(
      screen.getByRole('link', { name: 'Upgrade to Prism Pro' }),
    ).toHaveAttribute('href', '/app/subscription');
    expect(screen.getByText('25 analyses per month')).toBeVisible();
    expect(
      screen.getByText('Resets in 3 days on August 01, 2025'),
    ).toBeVisible();
  });

  it('uses the two distinct locked Screen 06 prism geometries', () => {
    const { container } = render(
      <LimitReachedScreen
        presentation={presentation}
        now="2025-07-29T00:00:00.000Z"
      />,
    );

    const hero = container.querySelector('[data-limit-prism="hero"]');
    const mini = container.querySelector('[data-limit-prism="mini"]');
    expect(hero).not.toBeNull();
    expect(mini).not.toBeNull();
    expect(hero?.querySelectorAll('path')).toHaveLength(2);
    expect(hero?.querySelector('path:first-child')).toHaveAttribute(
      'stroke',
      '#a792ec',
    );
    expect(hero?.querySelector('path:first-child')).toHaveAttribute(
      'stroke-width',
      '1.7',
    );
    expect(hero?.querySelector('path:last-child')).toHaveAttribute(
      'd',
      'M50 5v100M10 105l57-62 24 62M10 105l40-38 41 38',
    );
    expect(mini?.querySelectorAll('path')).toHaveLength(1);
    expect(mini?.querySelector('path')).toHaveAttribute('stroke', '#9d82e3');
    expect(mini?.querySelector('path')).toHaveAttribute('stroke-width', '2');
  });

  it('renders stable baseline and benefit pairs without parity mapping', () => {
    const { container } = render(
      <LimitReachedScreen
        presentation={presentation}
        now="2025-07-29T00:00:00.000Z"
      />,
    );

    const rows = Array.from(
      container.querySelectorAll('.billing-compare-row'),
    ).map((row) =>
      Array.from(row.children).map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['10 analyses per month', '25 analyses per month'],
      ['Basic insights & summaries', 'Advanced insights & takeaways'],
      ['Standard templates', 'All premium templates'],
      ['Export results', 'Export & download'],
      ['Email support', 'Priority support'],
    ]);
    expect(
      container.querySelectorAll('.billing-compare-baseline'),
    ).toHaveLength(5);
    expect(container.querySelectorAll('.billing-spark')).toHaveLength(5);
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

  it('renders canonical Free to Starter rows in order without duplicate key warnings', () => {
    const free = billingFixtureCatalog.find(({ plan }) => plan.slug === 'free');
    const starter = billingFixtureCatalog.find(
      ({ plan }) => plan.slug === 'starter',
    );
    if (free === undefined || starter === undefined) {
      throw new Error('Canonical Free and Starter plans are required');
    }
    const freeLimitSnapshot: BillingSnapshot = {
      currentPlan: free.plan,
      currentPrice: null,
      period: {
        startsAt: '2025-07-01T00:00:00.000Z',
        endsAt: '2025-08-01T00:00:00.000Z',
      },
      usage: {
        used: 3,
        reserved: 0,
        remaining: 0,
        limit: 3,
        extraCredits: 0,
      },
      scheduledChange: null,
      paymentSummary: {
        subscriptionStatus: null,
        paidThrough: null,
        outstandingAmountMinor: 0,
        currency: 'usd',
      },
      recentActivity: [],
      availablePlans: billingFixtureCatalog,
    };
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    try {
      const { container } = render(
        <LimitReachedScreen
          presentation={toLimitReachedPresentation(freeLimitSnapshot, {
            now: '2025-07-29T00:00:00.000Z',
            locale: 'en-US',
            timeZone: 'UTC',
          })}
          now="2025-07-29T00:00:00.000Z"
        />,
      );

      expect(
        Array.from(container.querySelectorAll('.billing-compare-row')).map(
          (row) =>
            Array.from(row.children).map((cell) => cell.textContent?.trim()),
        ),
      ).toEqual([
        ['3 analyses per month', '10 analyses per month'],
        ['Saved history', 'Basic insights & summaries'],
        ['Not included in the current plan', 'Standard templates'],
        ['Not included in the current plan', 'Export results'],
        ['Not included in the current plan', 'Email support'],
      ]);
      expect(error).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
    } finally {
      error.mockRestore();
      warn.mockRestore();
    }
  });
});
