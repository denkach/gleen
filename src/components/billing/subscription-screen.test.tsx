import { fireEvent, render, screen, within } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it } from 'vitest';

import {
  billingMessages,
  type BillingMessages,
} from '@/lib/i18n/messages/billing';
import type { Locale } from '@/lib/i18n/locales';

import type { SubscriptionPresentation } from '@/lib/billing/presentation';

import { SubscriptionScreen as ProductionSubscriptionScreen } from './subscription-screen';

type SubscriptionScreenProps = ComponentProps<
  typeof ProductionSubscriptionScreen
>;
function SubscriptionScreen({
  locale = 'en',
  copy = billingMessages.en,
  ...props
}: Omit<SubscriptionScreenProps, 'copySource'> &
  Readonly<{ locale?: Locale; copy?: BillingMessages }>) {
  return (
    <ProductionSubscriptionScreen
      {...props}
      copySource={{ kind: 'injected', locale, copy }}
    />
  );
}

const presentation: SubscriptionPresentation = {
  currentPlan: {
    id: 'prism-pro',
    slug: 'prism-pro',
    displayName: 'Prism Pro',
    description: 'For professionals who analyze more and need deeper insights.',
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
  entitlement: {
    key: 'active',
    label: 'Active',
    variant: 'positive',
  },
  usage: {
    used: 17,
    reserved: 1,
    remaining: 7,
    limit: 25,
    extraCredits: 4,
  },
  resetAt: '2026-08-01T00:00:00.000Z',
  resetAtLabel: 'Aug 1, 2026',
  scheduledChange: {
    kind: 'downgrade',
    plan: {
      id: 'starter',
      slug: 'starter',
      displayName: 'Starter',
      description: 'For individuals getting started with AI analysis.',
      analysisLimit: 10,
      features: ['10 analyses per month', 'Basic insights & summaries'],
      purchasable: true,
    },
    effectiveAt: '2026-08-01T00:00:00.000Z',
    revision: '9e107d9d372bb6826bd81d3542a419d6',
  },
  paymentMethod: {
    status: 'available',
    label: 'Visa •••• 4242',
    expiryLabel: 'Expires 08/2028',
  },
  availablePlans: [
    {
      plan: {
        id: 'free',
        slug: 'free',
        displayName: 'Free',
        description: 'For trying Gleen.',
        analysisLimit: 3,
        features: ['3 analyses per month'],
        purchasable: false,
      },
      prices: [],
      action: {
        enabled: false,
        reason: 'This plan is not available for purchase.',
      },
    },
    {
      plan: {
        id: 'starter',
        slug: 'starter',
        displayName: 'Starter',
        description: 'For individuals getting started with AI analysis.',
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
      prices: [
        {
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
        {
          amountMinor: 18000,
          currency: 'usd',
          formattedAmount: '$180.00',
          monthlyEquivalent: {
            amountMinor: 1500,
            currency: 'usd',
            formattedAmount: '$15.00',
          },
          interval: 'year',
          savingsPercent: 20,
        },
      ],
      action: { enabled: true, reason: null },
    },
    {
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
      prices: [
        {
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
        {
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
      ],
      action: { enabled: true, reason: null },
    },
    {
      plan: {
        id: 'team',
        slug: 'team',
        displayName: 'Team',
        description: 'For teams collaborating and scaling their impact.',
        analysisLimit: 100,
        features: [
          '100 analyses per month',
          'Team workspace',
          'Collaboration & sharing',
          'Admin controls & roles',
          'Priority onboarding',
        ],
        purchasable: false,
      },
      prices: [
        {
          amountMinor: 12900,
          currency: 'usd',
          formattedAmount: '$129.00',
          monthlyEquivalent: {
            amountMinor: 12900,
            currency: 'usd',
            formattedAmount: '$129.00',
          },
          interval: 'month',
          savingsPercent: null,
        },
        {
          amountMinor: 123600,
          currency: 'usd',
          formattedAmount: '$1,236.00',
          monthlyEquivalent: {
            amountMinor: 10300,
            currency: 'usd',
            formattedAmount: '$103.00',
          },
          interval: 'year',
          savingsPercent: 20,
        },
      ],
      action: {
        enabled: false,
        reason: 'This plan is not available for purchase.',
      },
    },
  ],
};

describe('SubscriptionScreen', () => {
  it('renders German subscription headings, actions, states, and mobile navigation', () => {
    const { container } = render(
      <SubscriptionScreen
        presentation={{
          ...presentation,
          entitlement: {
            ...presentation.entitlement,
            label: billingMessages.de.presentation.entitlement.active,
          },
        }}
        initialInterval="month"
        locale="de"
        copy={billingMessages.de}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Abonnement' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Monatliche Abrechnung' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Aktiv')).toBeInTheDocument();
    expect(
      container.querySelector('.billing-current-ribbon'),
    ).toHaveTextContent('Aktueller Tarif');
    expect(
      screen.getByRole('navigation', {
        name: 'Mobile Abrechnungsnavigation',
      }),
    ).toBeInTheDocument();
  });
  it('renders the current plan, real usage, reset, scheduled state, and three paid cards', () => {
    render(
      <SubscriptionScreen
        presentation={presentation}
        initialInterval="month"
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Subscription' }),
    ).toBeInTheDocument();
    expect(screen.getAllByText('Prism Pro').length).toBeGreaterThan(0);
    expect(screen.getByText('18')).toBeInTheDocument();
    expect(screen.getByText('72% of the cycle')).toBeInTheDocument();
    expect(screen.getAllByText('Aug 1, 2026')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      'Starter is scheduled',
    );

    const grid = screen.getByRole('list', { name: 'Available paid plans' });
    expect(within(grid).getAllByRole('listitem')).toHaveLength(3);
    expect(
      within(grid).getByRole('heading', { name: 'Starter' }),
    ).toBeInTheDocument();
    expect(
      within(grid).getByRole('heading', { name: 'Prism Pro' }),
    ).toBeInTheDocument();
    expect(
      within(grid).getByRole('heading', { name: 'Team' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open billing portal' }),
    ).toHaveAttribute('href', '/app/subscription/portal');
    expect(
      screen.getByRole('button', { name: /team unavailable/i }),
    ).toBeDisabled();
  });

  it('switches between server-provided monthly and yearly price rows', () => {
    render(
      <SubscriptionScreen
        presentation={presentation}
        initialInterval="month"
      />,
    );

    expect(screen.getByText('$19.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Yearly billing' }));
    expect(screen.getByText('$15.00')).toBeInTheDocument();
    expect(screen.getByText('$468.00 / year')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Yearly billing' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('routes paid alternatives to Portal confirmation and Free alternatives to Checkout', () => {
    const { rerender } = render(
      <SubscriptionScreen
        presentation={presentation}
        initialInterval="month"
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Change to Starter' }),
    ).toHaveAttribute(
      'href',
      '/app/subscription/portal?plan=starter&interval=month',
    );

    rerender(
      <SubscriptionScreen
        presentation={{
          ...presentation,
          currentPlan: presentation.availablePlans[0]!.plan,
          currentPrice: null,
          entitlement: {
            key: 'free',
            label: 'Free',
            variant: 'neutral',
          },
        }}
        initialInterval="month"
      />,
    );

    expect(
      screen.getByRole('link', { name: 'Choose Starter' }),
    ).toHaveAttribute(
      'href',
      '/app/subscription/checkout?plan=starter&interval=month',
    );
  });

  it('renders a truthful unavailable state', () => {
    render(<SubscriptionScreen presentation={null} initialInterval="month" />);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Billing details are temporarily unavailable.',
    );
    expect(
      screen.getByRole('link', { name: 'Try subscription again' }),
    ).toHaveAttribute('href', '/app/subscription');
  });
});
