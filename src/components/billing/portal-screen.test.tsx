import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import type { ComponentProps } from 'react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  usePathname: () => '/app/subscription/portal',
}));

import type {
  InvoicePresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';
import { billingMessages } from '@/lib/i18n/messages/billing';

import { PortalScreen as ProductionPortalScreen } from './portal-screen';

type PortalScreenProps = ComponentProps<typeof ProductionPortalScreen>;
function PortalScreen({
  locale = 'en',
  copy = billingMessages.en,
  ...props
}: Omit<PortalScreenProps, 'locale' | 'copy'> &
  Partial<Pick<PortalScreenProps, 'locale' | 'copy'>>) {
  return <ProductionPortalScreen {...props} locale={locale} copy={copy} />;
}

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
  outstandingBalance: {
    amountMinor: 0,
    currency: 'jpy',
    formattedAmount: '¥0',
  },
  scheduledChange: null,
  availablePlans: [
    {
      plan: {
        id: 'starter',
        slug: 'starter',
        displayName: 'Starter',
        description: 'For individuals getting started.',
        analysisLimit: 10,
        features: ['10 analyses per month'],
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
        description: 'Professional analysis.',
        analysisLimit: 25,
        features: ['25 analyses per month'],
        purchasable: true,
      },
      prices: [],
      action: { enabled: true, reason: null },
    },
  ],
} as const satisfies Pick<
  SubscriptionPresentation,
  | 'currentPlan'
  | 'currentPrice'
  | 'entitlement'
  | 'resetAt'
  | 'resetAtLabel'
  | 'paymentMethod'
  | 'scheduledChange'
  | 'availablePlans'
> & {
  outstandingBalance: {
    amountMinor: number;
    currency: string;
    formattedAmount: string;
  };
};

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

const freePlan = {
  ...subscription.availablePlans[0].plan,
  id: 'free',
  slug: 'free',
  displayName: 'Free',
  description: 'For exploring Gleen.',
  analysisLimit: 3,
  features: ['3 analyses per month'],
  purchasable: false,
} as const;
const scheduleRevisionOne = '9e107d9d372bb6826bd81d3542a419d6';
const scheduleRevisionTwo = 'e4d909c290d0fb1ca068ffaddf22cbd0';

describe('PortalScreen', () => {
  beforeEach(() => refresh.mockClear());

  it('renders the complete English portal surface with localized navigation', () => {
    render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={vi.fn()}
        locale="en"
        copy={billingMessages.en}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Billing portal' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Update payment method' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Mobile billing navigation' }),
    ).toBeInTheDocument();
  });

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
    expect(screen.getByText('¥0')).toBeInTheDocument();
    expect(screen.getByText('All caught up')).toBeInTheDocument();
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

  it('opens Stripe only for an upgrade result and shows no scheduled notice', async () => {
    const planChangeAction = vi.fn().mockResolvedValue({
      ok: true,
      kind: 'upgrade',
      url: 'https://billing.stripe.com/p/session_plan_change',
    });
    const openPortal = vi.fn();
    render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={vi.fn()}
        planChangeAction={planChangeAction}
        planChange={{ plan: 'prism-pro', interval: 'month' }}
        openPortal={openPortal}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm plan change' }),
    );

    await waitFor(() =>
      expect(planChangeAction).toHaveBeenCalledWith({
        plan: 'prism-pro',
        interval: 'month',
      }),
    );
    expect(openPortal).toHaveBeenCalledWith(
      'https://billing.stripe.com/p/session_plan_change',
    );
    expect(openPortal).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/is scheduled for/i)).not.toBeInTheDocument();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('announces a downgrade locally without opening Stripe and refreshes the projection', async () => {
    const planChangeAction = vi.fn().mockResolvedValue({
      ok: true,
      kind: 'downgrade',
      plan: 'starter',
      interval: 'month',
      effectiveAt: '2026-08-01T00:00:00.000Z',
    });
    const openPortal = vi.fn();
    render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={vi.fn()}
        planChangeAction={planChangeAction}
        cancelScheduledDowngradeAction={vi.fn()}
        planChange={{ plan: 'starter', interval: 'month' }}
        planCatalog={subscription.availablePlans.map(({ plan }) => plan)}
        openPortal={openPortal}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm plan change' }),
    );

    expect(await screen.findByRole('status')).toHaveTextContent(
      'Starter is scheduled for 1 Aug 2026. Your Prism Pro access remains active until then.',
    );
    expect(openPortal).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('button', { name: 'Cancel scheduled downgrade' }),
    ).toBeEnabled();
  });

  it('reconciles an optimistic downgrade when the authoritative projection changes or clears', async () => {
    const planChangeAction = vi.fn().mockResolvedValue({
      ok: true,
      kind: 'downgrade',
      plan: 'starter',
      interval: 'month',
      effectiveAt: '2026-08-01T00:00:00.000Z',
    });
    const commonProps = {
      activity,
      portalAction: vi.fn(),
      planChangeAction,
      cancelScheduledDowngradeAction: vi.fn(),
      planChange: { plan: 'starter', interval: 'month' } as const,
      planCatalog: subscription.availablePlans.map(({ plan }) => plan),
      openPortal: vi.fn(),
    };
    const view = render(
      <PortalScreen subscription={subscription} {...commonProps} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Confirm plan change' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Starter is scheduled for 1 Aug 2026.',
    );

    view.rerender(
      <PortalScreen
        subscription={{
          ...subscription,
          scheduledChange: {
            kind: 'downgrade',
            plan: freePlan,
            effectiveAt: '2026-09-01T00:00:00.000Z',
            revision: scheduleRevisionTwo,
          },
        }}
        {...commonProps}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Free is scheduled for 1 Sept 2026.',
    );

    view.rerender(
      <PortalScreen subscription={subscription} {...commonProps} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Cancel scheduled downgrade' }),
    ).not.toBeInTheDocument();
  });

  it('renders a projected downgrade with its effective date and cancellation control', () => {
    render(
      <PortalScreen
        subscription={{
          ...subscription,
          scheduledChange: {
            kind: 'downgrade',
            plan: subscription.availablePlans[0].plan,
            effectiveAt: '2026-08-01T00:00:00.000Z',
            revision: scheduleRevisionOne,
          },
        }}
        activity={activity}
        portalAction={vi.fn()}
        cancelScheduledDowngradeAction={vi.fn()}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Starter is scheduled for 1 Aug 2026. Your Prism Pro access remains active until then.',
    );
    expect(
      screen.getByRole('button', { name: 'Cancel scheduled downgrade' }),
    ).toBeEnabled();
  });

  it('announces and focuses a successful scheduled-downgrade cancellation without opening Stripe', async () => {
    const user = userEvent.setup();
    const cancelScheduledDowngradeAction = vi
      .fn()
      .mockResolvedValue({ ok: true });
    const openPortal = vi.fn();
    render(
      <PortalScreen
        subscription={{
          ...subscription,
          scheduledChange: {
            kind: 'downgrade',
            plan: subscription.availablePlans[0].plan,
            effectiveAt: '2026-08-01T00:00:00.000Z',
            revision: scheduleRevisionOne,
          },
        }}
        activity={activity}
        portalAction={vi.fn()}
        cancelScheduledDowngradeAction={cancelScheduledDowngradeAction}
        openPortal={openPortal}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Cancel scheduled downgrade' }),
    );

    const status = await screen.findByRole('status');
    expect(status).toHaveTextContent(
      'Scheduled downgrade canceled. Your current plan remains active.',
    );
    expect(status).toHaveFocus();
    expect(
      screen.queryByRole('button', { name: 'Cancel scheduled downgrade' }),
    ).not.toBeInTheDocument();
    expect(cancelScheduledDowngradeAction).toHaveBeenCalledWith();
    expect(openPortal).not.toHaveBeenCalled();
    expect(refresh).toHaveBeenCalledTimes(1);

    await user.tab();
    expect(
      screen.getByRole('button', { name: 'Update payment method' }),
    ).toHaveFocus();
  });

  it('hides a canceled baseline only until authoritative props reconcile, then shows a future projection', async () => {
    const cancelScheduledDowngradeAction = vi
      .fn()
      .mockResolvedValue({ ok: true });
    const commonProps = {
      activity,
      portalAction: vi.fn(),
      cancelScheduledDowngradeAction,
      openPortal: vi.fn(),
    };
    const projectedSubscription = {
      ...subscription,
      scheduledChange: {
        kind: 'downgrade' as const,
        plan: subscription.availablePlans[0].plan,
        effectiveAt: '2026-08-01T00:00:00.000Z',
        revision: scheduleRevisionOne,
      },
    };
    const view = render(
      <PortalScreen subscription={projectedSubscription} {...commonProps} />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel scheduled downgrade' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Scheduled downgrade canceled.',
    );

    view.rerender(
      <PortalScreen
        subscription={{ ...projectedSubscription }}
        {...commonProps}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Scheduled downgrade canceled.',
    );
    expect(
      screen.queryByRole('button', { name: 'Cancel scheduled downgrade' }),
    ).not.toBeInTheDocument();

    view.rerender(
      <PortalScreen subscription={subscription} {...commonProps} />,
    );
    expect(screen.queryByRole('status')).not.toBeInTheDocument();

    view.rerender(
      <PortalScreen
        subscription={{
          ...subscription,
          scheduledChange: {
            kind: 'downgrade',
            plan: freePlan,
            effectiveAt: '2026-09-01T00:00:00.000Z',
            revision: scheduleRevisionTwo,
          },
        }}
        {...commonProps}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Free is scheduled for 1 Sept 2026.',
    );
    expect(
      screen.getByRole('button', { name: 'Cancel scheduled downgrade' }),
    ).toBeEnabled();
  });

  it('shows a new schedule generation with the same plan and date after canceling the previous generation', async () => {
    const cancelScheduledDowngradeAction = vi
      .fn()
      .mockResolvedValue({ ok: true });
    const baseline = {
      kind: 'downgrade' as const,
      plan: subscription.availablePlans[0].plan,
      effectiveAt: '2026-08-01T00:00:00.000Z',
      revision: scheduleRevisionOne,
    };
    const commonProps = {
      activity,
      portalAction: vi.fn(),
      cancelScheduledDowngradeAction,
      openPortal: vi.fn(),
    };
    const view = render(
      <PortalScreen
        subscription={{ ...subscription, scheduledChange: baseline }}
        {...commonProps}
      />,
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel scheduled downgrade' }),
    );
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Scheduled downgrade canceled.',
    );

    view.rerender(
      <PortalScreen
        subscription={{
          ...subscription,
          scheduledChange: {
            ...baseline,
            revision: scheduleRevisionTwo,
          },
        }}
        {...commonProps}
      />,
    );

    expect(screen.getByRole('status')).toHaveTextContent(
      'Starter is scheduled for 1 Aug 2026.',
    );
    expect(
      screen.getByRole('button', { name: 'Cancel scheduled downgrade' }),
    ).toBeEnabled();
  });

  it.each(['change', 'cancel'] as const)(
    'renders one generic retryable alert and clears busy state after a failed %s action',
    async (intent) => {
      const internalMessage =
        'Stripe subscription schedule sub_sched_secret is incompatible';
      const planChangeAction = vi
        .fn()
        .mockRejectedValue(new Error(internalMessage));
      const cancelScheduledDowngradeAction = vi
        .fn()
        .mockRejectedValue(new Error(internalMessage));
      render(
        <PortalScreen
          subscription={{
            ...subscription,
            scheduledChange:
              intent === 'cancel'
                ? {
                    kind: 'downgrade',
                    plan: subscription.availablePlans[0].plan,
                    effectiveAt: '2026-08-01T00:00:00.000Z',
                    revision: scheduleRevisionOne,
                  }
                : null,
          }}
          activity={activity}
          portalAction={vi.fn()}
          planChangeAction={planChangeAction}
          cancelScheduledDowngradeAction={cancelScheduledDowngradeAction}
          planChange={
            intent === 'change' ? { plan: 'starter', interval: 'month' } : null
          }
          openPortal={vi.fn()}
        />,
      );

      fireEvent.click(
        screen.getByRole('button', {
          name:
            intent === 'change'
              ? 'Confirm plan change'
              : 'Cancel scheduled downgrade',
        }),
      );

      const alert = await screen.findByRole('alert');
      expect(alert).toHaveTextContent(
        'We couldn’t update your billing settings. Please try again.',
      );
      expect(screen.getAllByRole('alert')).toHaveLength(1);
      expect(alert).not.toHaveTextContent(internalMessage);
      expect(
        screen.getByRole('region', { name: 'Billing portal' }),
      ).toHaveAttribute('aria-busy', 'false');
    },
  );

  it.each(['change', 'cancel'] as const)(
    'invokes the %s Server Action once for rapid repeated activation',
    async (intent) => {
      let resolveAction!: (result: {
        ok: false;
        code: 'billing_unavailable';
      }) => void;
      const action = vi.fn(
        () =>
          new Promise<{ ok: false; code: 'billing_unavailable' }>((resolve) => {
            resolveAction = resolve;
          }),
      );
      render(
        <PortalScreen
          subscription={{
            ...subscription,
            scheduledChange:
              intent === 'cancel'
                ? {
                    kind: 'downgrade',
                    plan: subscription.availablePlans[0].plan,
                    effectiveAt: '2026-08-01T00:00:00.000Z',
                    revision: scheduleRevisionOne,
                  }
                : null,
          }}
          activity={activity}
          portalAction={vi.fn()}
          planChangeAction={intent === 'change' ? action : undefined}
          cancelScheduledDowngradeAction={
            intent === 'cancel' ? action : undefined
          }
          planChange={
            intent === 'change' ? { plan: 'starter', interval: 'month' } : null
          }
          openPortal={vi.fn()}
        />,
      );
      const button = screen.getByRole('button', {
        name:
          intent === 'change'
            ? 'Confirm plan change'
            : 'Cancel scheduled downgrade',
      });

      fireEvent.click(button);
      fireEvent.click(button);
      expect(action).toHaveBeenCalledTimes(1);

      await act(async () => {
        resolveAction({ ok: false, code: 'billing_unavailable' });
        await Promise.resolve();
      });
    },
  );

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

  it('uses authoritative minor units for a nonzero outstanding balance', () => {
    render(
      <PortalScreen
        subscription={{
          ...subscription,
          outstandingBalance: {
            amountMinor: 1,
            currency: 'jpy',
            formattedAmount: '¥1',
          },
        }}
        activity={activity}
        portalAction={vi.fn()}
      />,
    );
    expect(screen.getByText('¥1')).toBeInTheDocument();
    expect(screen.getByText('Review in Stripe')).toBeInTheDocument();
  });

  it('disables every Portal action while one fresh session is pending', async () => {
    let resolvePortal!: (result: { ok: true; url: string }) => void;
    const portalAction = vi.fn(
      () =>
        new Promise<{ ok: true; url: string }>((resolve) => {
          resolvePortal = resolve;
        }),
    );
    render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={portalAction}
        openPortal={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Manage plan' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Update payment method' }),
    );
    expect(portalAction).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole('region', { name: 'Billing portal' }),
    ).toHaveAttribute('aria-busy', 'true');
    for (const name of [
      'Update payment method',
      'Manage plan',
      'Manage cancellation',
      'Edit billing details',
      'Open secure billing portal',
    ]) {
      expect(screen.getByRole('button', { name })).toBeDisabled();
    }
    resolvePortal({
      ok: true,
      url: 'https://billing.stripe.com/p/session_test',
    });
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Manage plan' })).toBeEnabled(),
    );
  });

  it('resets all Portal controls and announces a rejected action', async () => {
    render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={vi.fn().mockRejectedValue(new Error('network'))}
        openPortal={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Manage plan' }));
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Manage plan' })).toBeEnabled(),
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'We couldn’t update your billing settings. Please try again.',
    );
  });

  it('suppresses every Portal side effect when the action settles after unmount', async () => {
    let resolvePortal!: (result: { ok: true; url: string }) => void;
    const portalAction = vi.fn(
      () =>
        new Promise<{ ok: true; url: string }>((resolve) => {
          resolvePortal = resolve;
        }),
    );
    const openPortal = vi.fn();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const view = render(
      <PortalScreen
        subscription={subscription}
        activity={activity}
        portalAction={portalAction}
        openPortal={openPortal}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Manage plan' }));
    view.unmount();
    await act(async () => {
      resolvePortal({
        ok: true,
        url: 'https://billing.stripe.com/p/session_late',
      });
      await Promise.resolve();
    });

    expect(openPortal).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    consoleError.mockRestore();
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
