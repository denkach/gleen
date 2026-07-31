'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import type {
  InvoicePresentation,
  SubscriptionPresentation,
} from '@/lib/billing/presentation';
import type {
  CancelScheduledDowngradeResult,
  CheckoutActionInput,
  PlanChangeResult,
} from '@/lib/billing/actions';
import type { BillingPlanSlug } from '@/lib/billing/domain';

import { BillingIcon } from './billing-icons';
import {
  BillingCard,
  BillingPage,
  BillingPrism,
  BillingStatus,
} from './billing-page';

type PortalActionResult =
  Readonly<{ ok: true; url: string }> | Readonly<{ ok: false; code: string }>;
type PortalPlanCatalogEntry = Readonly<{
  slug: BillingPlanSlug;
  displayName: string;
}>;

export type PortalSubscription = Pick<
  SubscriptionPresentation,
  | 'currentPlan'
  | 'currentPrice'
  | 'entitlement'
  | 'resetAt'
  | 'resetAtLabel'
  | 'paymentMethod'
  | 'scheduledChange'
> &
  Readonly<{
    outstandingBalance: Readonly<{
      amountMinor: number;
      currency: string;
      formattedAmount: string;
    }>;
  }>;

function defaultOpenPortal(url: string) {
  window.location.assign(url);
}

const unavailablePlanChangeAction = async (): Promise<PlanChangeResult> => ({
  ok: false,
  code: 'billing_unavailable',
});

const unavailableCancelAction =
  async (): Promise<CancelScheduledDowngradeResult> => ({
    ok: false,
    code: 'billing_unavailable',
  });

const scheduledDateFormatter = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'UTC',
});
const emptyPlanCatalog: readonly PortalPlanCatalogEntry[] = [];

type LocalScheduledDowngrade = Readonly<{
  plan: BillingPlanSlug;
  effectiveAt: string;
}>;

function PortalActionButton({
  children,
  action,
  disabled,
}: Readonly<{
  children: React.ReactNode;
  action: () => void;
  disabled: boolean;
}>) {
  return (
    <button type="button" onClick={action} disabled={disabled}>
      <b>{children}</b>
      <span className="billing-action-arrow" aria-hidden="true">
        ›
      </span>
    </button>
  );
}

export function PortalScreen({
  subscription,
  activity,
  portalAction,
  planChangeAction = unavailablePlanChangeAction,
  cancelScheduledDowngradeAction = unavailableCancelAction,
  planChange = null,
  planCatalog = emptyPlanCatalog,
  openPortal = defaultOpenPortal,
}: Readonly<{
  subscription: PortalSubscription | null;
  activity: InvoicePresentation | null;
  portalAction: () => Promise<PortalActionResult>;
  planChangeAction?: (input: CheckoutActionInput) => Promise<PlanChangeResult>;
  cancelScheduledDowngradeAction?: () => Promise<CancelScheduledDowngradeResult>;
  planChange?: CheckoutActionInput | null;
  planCatalog?: readonly PortalPlanCatalogEntry[];
  openPortal?: (url: string) => void;
}>) {
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [localScheduledDowngrade, setLocalScheduledDowngrade] =
    useState<LocalScheduledDowngrade | null>(null);
  const [scheduledDowngradeCanceled, setScheduledDowngradeCanceled] =
    useState(false);
  const [cancellationStatus, setCancellationStatus] = useState(false);
  const mounted = useRef(true);
  const pending = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function launchPortal(action = portalAction) {
    if (pending.current) return;
    pending.current = true;
    setOpening(true);
    setActionError(false);
    try {
      const result = await action();
      if (!mounted.current) return;
      if (!result.ok) {
        setActionError(true);
        return;
      }
      openPortal(result.url);
    } catch {
      if (mounted.current) setActionError(true);
    } finally {
      pending.current = false;
      if (mounted.current) setOpening(false);
    }
  }

  async function submitPlanChange() {
    if (planChange === null || pending.current) return;
    pending.current = true;
    setOpening(true);
    setActionError(false);
    setCancellationStatus(false);
    try {
      const result = await planChangeAction(planChange);
      if (!mounted.current) return;
      if (!result.ok) {
        setActionError(true);
        return;
      }
      if (result.kind === 'upgrade') {
        openPortal(result.url);
        return;
      }
      setLocalScheduledDowngrade({
        plan: result.plan,
        effectiveAt: result.effectiveAt,
      });
      setScheduledDowngradeCanceled(false);
      router.refresh();
    } catch {
      if (mounted.current) setActionError(true);
    } finally {
      pending.current = false;
      if (mounted.current) setOpening(false);
    }
  }

  async function cancelScheduledDowngrade() {
    if (pending.current) return;
    pending.current = true;
    setOpening(true);
    setActionError(false);
    try {
      const result = await cancelScheduledDowngradeAction();
      if (!mounted.current) return;
      if (!result.ok) {
        setActionError(true);
        return;
      }
      setScheduledDowngradeCanceled(true);
      setLocalScheduledDowngrade(null);
      setCancellationStatus(true);
      router.refresh();
    } catch {
      if (mounted.current) setActionError(true);
    } finally {
      pending.current = false;
      if (mounted.current) setOpening(false);
    }
  }

  if (subscription === null || activity === null) {
    return (
      <BillingPage
        eyebrow="Account billing"
        title="Billing portal"
        description="Manage payment methods, plan changes, seats, and billing information."
      >
        <BillingCard className="billing-state-card">
          <div className="billing-state-icon">
            <BillingIcon name="alert" />
          </div>
          <div role="alert">
            <h2>Billing details are temporarily unavailable.</h2>
            <p>Please try again. No billing settings have been changed.</p>
          </div>
          <Link className="billing-button" href="/app/subscription/portal">
            Try billing again
          </Link>
        </BillingCard>
      </BillingPage>
    );
  }

  const teamExplanationId = 'billing-team-seats-unavailable';
  const projectedDowngrade =
    subscription.scheduledChange?.kind === 'downgrade'
      ? subscription.scheduledChange
      : null;
  const scheduledDowngrade = scheduledDowngradeCanceled
    ? null
    : (localScheduledDowngrade ?? projectedDowngrade);
  const scheduledPlan =
    scheduledDowngrade === null
      ? null
      : typeof scheduledDowngrade.plan === 'string'
        ? (planCatalog.find(({ slug }) => slug === scheduledDowngrade.plan) ??
          null)
        : scheduledDowngrade.plan;
  const scheduledStatus =
    scheduledDowngrade !== null && scheduledPlan !== null
      ? `${scheduledPlan.displayName} is scheduled for ${scheduledDateFormatter.format(
          new Date(scheduledDowngrade.effectiveAt),
        )}. Your ${subscription.currentPlan.displayName} access remains active until then.`
      : null;

  return (
    <BillingPage
      eyebrow="Account billing"
      title="Billing portal"
      description="Manage payment methods, plan changes, seats, and billing information."
      ariaBusy={opening}
    >
      {actionError && (
        <p className="billing-inline-error" role="alert">
          We couldn’t update your billing settings. Please try again.
        </p>
      )}
      {(cancellationStatus || scheduledStatus !== null) && (
        <div className="billing-scheduled-state" role="status">
          <BillingIcon name="plan" />
          <span>
            {cancellationStatus
              ? 'Scheduled downgrade canceled. Your current plan remains active.'
              : scheduledStatus}
          </span>
        </div>
      )}
      <BillingCard className="billing-portal-summary">
        <div className="billing-portal-plan">
          <BillingPrism />
          <div>
            <div className="billing-metric-label">Current plan</div>
            <div className="billing-plan-name">
              {subscription.currentPlan.displayName}{' '}
              <BillingStatus variant={subscription.entitlement.variant}>
                {subscription.entitlement.label}
              </BillingStatus>
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-label">Renewal</div>
          <div className="billing-metric-value billing-reset-value">
            <time dateTime={subscription.resetAt}>
              {subscription.resetAtLabel}
            </time>
          </div>
          <div className="billing-metric-note">
            {subscription.currentPrice === null
              ? 'No paid renewal'
              : `${subscription.currentPrice.formattedAmount} / ${subscription.currentPrice.interval}`}
          </div>
        </div>
        <div>
          <div className="billing-metric-label">Active seats</div>
          <div className="billing-metric-value">Not available</div>
          <div className="billing-metric-note">
            Team accounts are coming later
          </div>
        </div>
        <div>
          <div className="billing-metric-label">Outstanding balance</div>
          <div className="billing-metric-value">
            {subscription.outstandingBalance.formattedAmount}
          </div>
          <div className="billing-metric-note billing-positive">
            {subscription.outstandingBalance.amountMinor === 0
              ? 'All caught up'
              : 'Review in Stripe'}
          </div>
        </div>
      </BillingCard>

      <div className="billing-portal-grid">
        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="card" />
            </div>
            <div>
              <h2 className="billing-section-title">Payment methods</h2>
              <p className="billing-section-copy">Manage saved cards.</p>
            </div>
          </div>
          <div className="billing-action-list">
            <PortalActionButton
              action={() => launchPortal()}
              disabled={opening}
            >
              Update payment method
            </PortalActionButton>
            <div className="billing-owned-payment">
              <b>{subscription.paymentMethod.label}</b>
              {subscription.paymentMethod.expiryLabel !== null && (
                <small>{subscription.paymentMethod.expiryLabel}</small>
              )}
            </div>
          </div>
          <div className="billing-foot-note">
            🔒 Payment details are managed securely by Stripe.
          </div>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="external" />
            </div>
            <div>
              <h2 className="billing-section-title">Plan management</h2>
              <p className="billing-section-copy">
                Update your plan or billing preferences.
              </p>
            </div>
          </div>
          <div className="billing-action-list">
            <PortalActionButton
              action={
                planChange === null ? () => launchPortal() : submitPlanChange
              }
              disabled={opening}
            >
              {planChange === null ? 'Manage plan' : 'Confirm plan change'}
            </PortalActionButton>
            {scheduledDowngrade !== null && (
              <PortalActionButton
                action={cancelScheduledDowngrade}
                disabled={opening}
              >
                Cancel scheduled downgrade
              </PortalActionButton>
            )}
            <PortalActionButton
              action={() => launchPortal()}
              disabled={opening}
            >
              Manage cancellation
            </PortalActionButton>
          </div>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="document" />
            </div>
            <div>
              <h2 className="billing-section-title">Billing details</h2>
              <p className="billing-section-copy">
                View and update billing information.
              </p>
            </div>
          </div>
          <div className="billing-action-list">
            <PortalActionButton
              action={() => launchPortal()}
              disabled={opening}
            >
              Edit billing details
            </PortalActionButton>
          </div>
          <div className="billing-foot-note">
            Billing identity and tax details remain in Stripe.
          </div>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="users" />
            </div>
            <div>
              <h2 className="billing-section-title">Team seats</h2>
              <p className="billing-section-copy">
                Invite members and manage seats.
              </p>
            </div>
          </div>
          <p className="billing-team-explanation" id={teamExplanationId}>
            Team seat management is not available yet.
          </p>
          <div className="billing-team-actions">
            <button
              className="billing-button billing-button-primary"
              type="button"
              disabled
              aria-describedby={teamExplanationId}
            >
              Invite member
            </button>
            <button
              className="billing-button"
              type="button"
              disabled
              aria-describedby={teamExplanationId}
            >
              Manage seats
            </button>
          </div>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="history" />
            </div>
            <div>
              <h2 className="billing-section-title">Billing activity</h2>
              <p className="billing-section-copy">Recent account activity.</p>
            </div>
          </div>
          <div className="billing-action-list">
            {activity.items.slice(0, 3).map((invoice) => (
              <div className="billing-activity-item" key={invoice.id}>
                <span>
                  <b>Invoice {invoice.number ?? 'pending'}</b>
                  <small>{invoice.createdAtLabel}</small>
                </span>
                <BillingStatus variant={invoice.status.variant}>
                  {invoice.status.label}
                </BillingStatus>
              </div>
            ))}
          </div>
          <Link
            className="billing-button billing-portal-full-button"
            href="/app/subscription/invoices"
          >
            View all activity
          </Link>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon billing-help-icon">?</div>
            <div>
              <h2 className="billing-section-title">Need help?</h2>
              <p className="billing-section-copy">
                We’re here for billing questions.
              </p>
            </div>
          </div>
          <p className="billing-foot-note">
            Open the Stripe portal for payment and subscription support.
          </p>
          <button
            className="billing-button billing-portal-full-button"
            type="button"
            onClick={() => launchPortal()}
            disabled={opening}
          >
            Open secure billing portal
          </button>
        </BillingCard>
      </div>
    </BillingPage>
  );
}
