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
import { formatDate } from '@/lib/i18n/format';
import {
  resolveBillingCopySource,
  type BillingCopySource,
} from './billing-copy-source';
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

const emptyPlanCatalog: readonly PortalPlanCatalogEntry[] = [];

type LocalScheduledDowngrade = Readonly<{
  plan: BillingPlanSlug;
  effectiveAt: string;
}>;

type OptimisticScheduledChange =
  | Readonly<{
      kind: 'scheduled';
      baselineProjectionKey: string | null;
      downgrade: LocalScheduledDowngrade;
    }>
  | Readonly<{
      kind: 'canceled';
      baselineProjectionKey: string | null;
    }>;

function scheduledDowngradeKey(
  downgrade: NonNullable<PortalSubscription['scheduledChange']> | null,
) {
  if (
    downgrade === null ||
    downgrade.kind === 'cancellation' ||
    downgrade.plan === null ||
    downgrade.revision === null
  ) {
    return null;
  }
  return `${downgrade.revision}:${downgrade.plan.slug}:${downgrade.effectiveAt}`;
}

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
  copySource,
}: Readonly<{
  subscription: PortalSubscription | null;
  activity: InvoicePresentation | null;
  portalAction: () => Promise<PortalActionResult>;
  planChangeAction?: (input: CheckoutActionInput) => Promise<PlanChangeResult>;
  cancelScheduledDowngradeAction?: () => Promise<CancelScheduledDowngradeResult>;
  planChange?: CheckoutActionInput | null;
  planCatalog?: readonly PortalPlanCatalogEntry[];
  openPortal?: (url: string) => void;
  copySource: BillingCopySource;
}>) {
  const { locale, copy } = resolveBillingCopySource(copySource);
  const router = useRouter();
  const [opening, setOpening] = useState(false);
  const [actionError, setActionError] = useState(false);
  const [optimisticScheduledChange, setOptimisticScheduledChange] =
    useState<OptimisticScheduledChange | null>(null);
  const mounted = useRef(true);
  const pending = useRef(false);
  const scheduledStatusRef = useRef<HTMLDivElement>(null);

  const projectedDowngrade =
    subscription?.scheduledChange?.kind === 'downgrade'
      ? subscription.scheduledChange
      : null;
  const projectionKey = scheduledDowngradeKey(projectedDowngrade);
  const projectionStillAtOptimisticBaseline =
    optimisticScheduledChange?.baselineProjectionKey === projectionKey;
  if (
    optimisticScheduledChange !== null &&
    !projectionStillAtOptimisticBaseline
  ) {
    setOptimisticScheduledChange(null);
  }
  const activeOptimisticChange = projectionStillAtOptimisticBaseline
    ? optimisticScheduledChange
    : null;
  const cancellationStatus = activeOptimisticChange?.kind === 'canceled';

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (cancellationStatus) scheduledStatusRef.current?.focus();
  }, [cancellationStatus]);

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
      setOptimisticScheduledChange({
        kind: 'scheduled',
        baselineProjectionKey: projectionKey,
        downgrade: {
          plan: result.plan,
          effectiveAt: result.effectiveAt,
        },
      });
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
      setOptimisticScheduledChange({
        kind: 'canceled',
        baselineProjectionKey: projectionKey,
      });
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
        locale={locale}
        eyebrow={copy.portal.eyebrow}
        title={copy.portal.title}
        description={copy.portal.description}
      >
        <BillingCard className="billing-state-card">
          <div className="billing-state-icon">
            <BillingIcon name="alert" />
          </div>
          <div role="alert">
            <h2>{copy.portal.error.title}</h2>
            <p>{copy.portal.error.description}</p>
          </div>
          <Link className="billing-button" href="/app/subscription/portal">
            {copy.portal.error.retry}
          </Link>
        </BillingCard>
      </BillingPage>
    );
  }

  const teamExplanationId = 'billing-team-seats-unavailable';
  const scheduledDowngrade =
    activeOptimisticChange?.kind === 'scheduled'
      ? activeOptimisticChange.downgrade
      : cancellationStatus
        ? null
        : projectedDowngrade;
  const scheduledPlan =
    scheduledDowngrade === null
      ? null
      : typeof scheduledDowngrade.plan === 'string'
        ? (planCatalog.find(({ slug }) => slug === scheduledDowngrade.plan) ??
          null)
        : scheduledDowngrade.plan;
  const scheduledStatus =
    scheduledDowngrade !== null && scheduledPlan !== null
      ? copy.portal.scheduled.downgrade(
          scheduledPlan.displayName,
          formatDate({
            value: scheduledDowngrade.effectiveAt,
            locale,
            fallback: '—',
            options: { dateStyle: 'medium', timeZone: 'UTC' },
          }),
          subscription.currentPlan.displayName,
        )
      : null;

  return (
    <BillingPage
      locale={locale}
      eyebrow={copy.portal.eyebrow}
      title={copy.portal.title}
      description={copy.portal.description}
      ariaBusy={opening}
    >
      {actionError && (
        <p className="billing-inline-error" role="alert">
          {copy.portal.error.action}
        </p>
      )}
      {(cancellationStatus || scheduledStatus !== null) && (
        <div
          className="billing-scheduled-state"
          role="status"
          tabIndex={-1}
          ref={scheduledStatusRef}
        >
          <BillingIcon name="plan" />
          <span>
            {cancellationStatus
              ? copy.portal.scheduled.canceled
              : scheduledStatus}
          </span>
        </div>
      )}
      <BillingCard className="billing-portal-summary">
        <div className="billing-portal-plan">
          <BillingPrism />
          <div>
            <div className="billing-metric-label">
              {copy.portal.summary.currentPlan}
            </div>
            <div className="billing-plan-name">
              {subscription.currentPlan.displayName}{' '}
              <BillingStatus variant={subscription.entitlement.variant}>
                {subscription.entitlement.label}
              </BillingStatus>
            </div>
          </div>
        </div>
        <div>
          <div className="billing-metric-label">
            {copy.portal.summary.renewal}
          </div>
          <div className="billing-metric-value billing-reset-value">
            <time dateTime={subscription.resetAt}>
              {subscription.resetAtLabel}
            </time>
          </div>
          <div className="billing-metric-note">
            {subscription.currentPrice === null
              ? copy.portal.summary.noPaidRenewal
              : `${subscription.currentPrice.formattedAmount} / ${
                  copy.presentation.intervalUnit[
                    subscription.currentPrice.interval
                  ]
                }`}
          </div>
        </div>
        <div>
          <div className="billing-metric-label">
            {copy.portal.summary.activeSeats}
          </div>
          <div className="billing-metric-value">
            {copy.portal.summary.notAvailable}
          </div>
          <div className="billing-metric-note">
            {copy.portal.summary.teamLater}
          </div>
        </div>
        <div>
          <div className="billing-metric-label">
            {copy.portal.summary.outstanding}
          </div>
          <div className="billing-metric-value">
            {subscription.outstandingBalance.formattedAmount}
          </div>
          <div className="billing-metric-note billing-positive">
            {subscription.outstandingBalance.amountMinor === 0
              ? copy.portal.summary.caughtUp
              : copy.portal.summary.reviewStripe}
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
              <h2 className="billing-section-title">
                {copy.portal.cards.paymentTitle}
              </h2>
              <p className="billing-section-copy">
                {copy.portal.cards.paymentDescription}
              </p>
            </div>
          </div>
          <div className="billing-action-list">
            <PortalActionButton
              action={() => launchPortal()}
              disabled={opening}
            >
              {copy.portal.actions.updatePayment}
            </PortalActionButton>
            <div className="billing-owned-payment">
              <b>{subscription.paymentMethod.label}</b>
              {subscription.paymentMethod.expiryLabel !== null && (
                <small>{subscription.paymentMethod.expiryLabel}</small>
              )}
            </div>
          </div>
          <div className="billing-foot-note">
            🔒 {copy.portal.cards.paymentFootnote}
          </div>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="external" />
            </div>
            <div>
              <h2 className="billing-section-title">
                {copy.portal.cards.planTitle}
              </h2>
              <p className="billing-section-copy">
                {copy.portal.cards.planDescription}
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
              {planChange === null
                ? copy.portal.actions.managePlan
                : copy.portal.actions.confirmPlanChange}
            </PortalActionButton>
            {scheduledDowngrade !== null && (
              <PortalActionButton
                action={cancelScheduledDowngrade}
                disabled={opening}
              >
                {copy.portal.actions.cancelDowngrade}
              </PortalActionButton>
            )}
            <PortalActionButton
              action={() => launchPortal()}
              disabled={opening}
            >
              {copy.portal.actions.manageCancellation}
            </PortalActionButton>
          </div>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="document" />
            </div>
            <div>
              <h2 className="billing-section-title">
                {copy.portal.cards.detailsTitle}
              </h2>
              <p className="billing-section-copy">
                {copy.portal.cards.detailsDescription}
              </p>
            </div>
          </div>
          <div className="billing-action-list">
            <PortalActionButton
              action={() => launchPortal()}
              disabled={opening}
            >
              {copy.portal.actions.editDetails}
            </PortalActionButton>
          </div>
          <div className="billing-foot-note">
            {copy.portal.cards.detailsFootnote}
          </div>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="users" />
            </div>
            <div>
              <h2 className="billing-section-title">
                {copy.portal.cards.teamTitle}
              </h2>
              <p className="billing-section-copy">
                {copy.portal.cards.teamDescription}
              </p>
            </div>
          </div>
          <p className="billing-team-explanation" id={teamExplanationId}>
            {copy.portal.cards.teamUnavailable}
          </p>
          <div className="billing-team-actions">
            <button
              className="billing-button billing-button-primary"
              type="button"
              disabled
              aria-describedby={teamExplanationId}
            >
              {copy.portal.actions.inviteMember}
            </button>
            <button
              className="billing-button"
              type="button"
              disabled
              aria-describedby={teamExplanationId}
            >
              {copy.portal.actions.manageSeats}
            </button>
          </div>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon">
              <BillingIcon name="history" />
            </div>
            <div>
              <h2 className="billing-section-title">
                {copy.portal.cards.activityTitle}
              </h2>
              <p className="billing-section-copy">
                {copy.portal.cards.activityDescription}
              </p>
            </div>
          </div>
          <div className="billing-action-list">
            {activity.items.slice(0, 3).map((invoice) => (
              <div className="billing-activity-item" key={invoice.id}>
                <span>
                  <b>
                    {copy.portal.cards.invoice(
                      invoice.number ?? copy.portal.cards.pending,
                    )}
                  </b>
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
            {copy.portal.actions.viewActivity}
          </Link>
        </BillingCard>

        <BillingCard as="article" className="billing-portal-card">
          <div className="billing-portal-card-head">
            <div className="billing-metric-icon billing-help-icon">?</div>
            <div>
              <h2 className="billing-section-title">
                {copy.portal.cards.helpTitle}
              </h2>
              <p className="billing-section-copy">
                {copy.portal.cards.helpDescription}
              </p>
            </div>
          </div>
          <p className="billing-foot-note">{copy.portal.cards.helpFootnote}</p>
          <button
            className="billing-button billing-portal-full-button"
            type="button"
            onClick={() => launchPortal()}
            disabled={opening}
          >
            {copy.portal.actions.openPortal}
          </button>
        </BillingCard>
      </div>
    </BillingPage>
  );
}
