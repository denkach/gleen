'use client';

import { CheckoutScreen } from '@/components/billing/checkout-screen';
import { InvoicesScreen } from '@/components/billing/invoices-screen';
import { LimitReachedScreen } from '@/components/billing/limit-reached-screen';
import { PortalScreen } from '@/components/billing/portal-screen';
import { SubscriptionScreen } from '@/components/billing/subscription-screen';
import { UsageScreen } from '@/components/billing/usage-screen';
import {
  billingFixtureCatalog,
  type BillingFixture,
} from '@/lib/billing/fixtures';
import type { UsageEventType } from '@/lib/billing/domain';
import type {
  CheckoutActionInput,
  PlanChangeResult,
} from '@/lib/billing/actions';
import { useState, useSyncExternalStore } from 'react';
import { billingMessages } from '@/lib/i18n/messages/billing';
import type { Locale } from '@/lib/i18n/locales';

const disabledExport = async () =>
  ({ ok: false, code: 'fixture-disabled' }) as const;
const disabledPortal = async () =>
  ({ ok: false, code: 'fixture-disabled' }) as const;
const subscribeHydration = () => () => undefined;
const fixtureUpgrade = {
  plan: 'prism-pro',
  interval: 'year',
} as const satisfies CheckoutActionInput;
const fixtureDowngrade = {
  plan: 'starter',
  interval: 'month',
} as const satisfies CheckoutActionInput;
const fixtureEffectiveAt = '2026-08-01T00:00:00.000Z';
const fixtureScheduleRevision = '9e107d9d372bb6826bd81d3542a419d6';
const fixturePlanCatalog = billingFixtureCatalog.map(({ plan }) => plan);
const fixtureStarterPlan = billingFixtureCatalog.find(
  ({ plan }) => plan.slug === 'starter',
)!.plan;
const fixturePrismProPlan = billingFixtureCatalog.find(
  ({ plan }) => plan.slug === 'prism-pro',
)!.plan;
export function BillingFixtureScreen({
  fixture,
  testBoundary,
  routeQuery,
  locale,
}: Readonly<{
  fixture: BillingFixture;
  locale: Locale;
  testBoundary:
    | 'usage-actions'
    | 'checkout-action'
    | 'portal-upgrade'
    | 'portal-downgrade'
    | 'portal-cancel'
    | 'portal-error'
    | 'invoice-actions'
    | null;
  routeQuery: Readonly<{
    search: string;
    eventType: string | null;
    range: string;
    status: string | null;
    year: string | null;
    cursor: string | null;
  }>;
}>) {
  const fixtureCopy = billingMessages[locale];
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [payload, setPayload] = useState('');
  const [portalCount, setPortalCount] = useState(0);
  const [openedPortal, setOpenedPortal] = useState('');
  const portalAction = disabledPortal;
  const planChangeAction =
    testBoundary === 'portal-upgrade' ||
    testBoundary === 'portal-downgrade' ||
    testBoundary === 'portal-error'
      ? async (input: CheckoutActionInput) => {
          setPayload(JSON.stringify(input));
          setPortalCount((count) => count + 1);
          await new Promise((resolve) => window.setTimeout(resolve, 80));
          if (testBoundary === 'portal-error') {
            return {
              ok: false,
              code: 'fixture-error',
            } as unknown as PlanChangeResult;
          }
          if (testBoundary === 'portal-downgrade') {
            return {
              ok: true,
              kind: 'downgrade',
              plan: 'starter',
              interval: 'month',
              effectiveAt: fixtureEffectiveAt,
            } as const;
          }
          return {
            ok: true,
            kind: 'upgrade',
            url: 'https://billing.stripe.test/session/1',
          } as const;
        }
      : undefined;
  const cancelScheduledDowngradeAction =
    testBoundary === 'portal-cancel'
      ? async (...args: readonly unknown[]) => {
          setPayload(args.length === 0 ? '[]' : '[redacted]');
          setPortalCount((count) => count + 1);
          await new Promise((resolve) => window.setTimeout(resolve, 80));
          return { ok: true } as const;
        }
      : undefined;

  const boundaryEvidence = (
    <>
      <output
        className="app-visually-hidden"
        data-testid="billing-fixture-hydrated"
      >
        {hydrated ? 'true' : 'false'}
      </output>
      {testBoundary !== null && (
        <span className="app-visually-hidden" aria-hidden="true">
          <output data-testid="billing-boundary-payload">{payload}</output>
          <output data-testid="billing-boundary-count">{portalCount}</output>
          <output data-testid="billing-boundary-opened">{openedPortal}</output>
        </span>
      )}
    </>
  );

  switch (fixture.screen) {
    case 'subscription':
      return (
        <>
          <SubscriptionScreen
            presentation={fixture.presentation}
            initialInterval="month"
            locale={locale}
            copy={fixtureCopy}
          />
          {boundaryEvidence}
        </>
      );
    case 'usage': {
      const range = ['current', 'last90', 'all'].includes(routeQuery.range)
        ? (routeQuery.range as 'current' | 'last90' | 'all')
        : 'current';
      const eventType = [
        'reservation',
        'settlement',
        'release',
        'period_renewal',
        'manual_adjustment',
        'refund',
        'technical_retry',
      ].includes(routeQuery.eventType ?? '')
        ? (routeQuery.eventType as UsageEventType)
        : null;
      const usage =
        testBoundary === 'usage-actions'
          ? { ...fixture.usage, nextCursor: '25', totalCount: 27 }
          : fixture.usage;
      const periodBounds =
        range === 'last90'
          ? {
              periodStart: '2025-05-01T00:00:00.000Z',
              periodEnd: '2025-08-01T00:00:00.000Z',
            }
          : {
              periodStart: range === 'all' ? null : '2025-07-01T00:00:00.000Z',
              periodEnd: range === 'all' ? null : '2025-08-01T00:00:00.000Z',
            };
      return (
        <>
          <UsageScreen
            subscription={fixture.subscription}
            usage={usage}
            query={{
              search: routeQuery.search,
              eventType,
              range,
              cursor: routeQuery.cursor,
            }}
            periodBounds={periodBounds}
            pageSize={25}
            exportAction={
              testBoundary === 'usage-actions'
                ? async (filters) => {
                    setPayload(JSON.stringify(filters));
                    return {
                      ok: true,
                      filename: 'gleen-usage.csv',
                      contentType: 'text/csv;charset=utf-8',
                      content:
                        '\uFEFF"Event","Source"\r\n"\'=SUM(A1:A2)","fixture"\r\n',
                    } as const;
                  }
                : disabledExport
            }
            locale={locale}
            copy={fixtureCopy}
          />
          {boundaryEvidence}
        </>
      );
    }
    case 'checkout':
      return (
        <>
          <CheckoutScreen
            presentation={fixture.presentation}
            prices={fixture.prices}
            state={{ kind: 'ready' }}
            stripeCheckout={
              <div
                className="billing-stripe-preview"
                role="group"
                aria-label={fixtureCopy.checkout.fixture.securePaymentPreview}
              >
                <div className="billing-stripe-preview-field billing-stripe-preview-wide">
                  <span>Email</span>
                  <b>you@example.com</b>
                </div>
                <div className="billing-stripe-preview-field billing-stripe-preview-wide">
                  <span>Card number</span>
                  <b>1234 1234 1234 1234</b>
                </div>
                <div className="billing-stripe-preview-field">
                  <span>Expiry</span>
                  <b>MM / YY</b>
                </div>
                <div className="billing-stripe-preview-field">
                  <span>CVC</span>
                  <b>CVC</b>
                </div>
                <div className="billing-stripe-preview-field">
                  <span>Country</span>
                  <b>United States</b>
                </div>
                <div className="billing-stripe-preview-field">
                  <span>
                    VAT ID <small>optional</small>
                  </span>
                  <b>e.g. EU123456789</b>
                </div>
                <div className="billing-stripe-preview-toggles">
                  <span>● Save payment method</span>
                  <span>● Email invoice receipt</span>
                </div>
              </div>
            }
            totals={fixture.totals}
            canSubmit={testBoundary === 'checkout-action'}
            promotionPreview={
              <div className="billing-promotion-preview">
                <span>{fixtureCopy.checkout.fixture.promotionCode}</span>
                <span aria-hidden="true">›</span>
              </div>
            }
            onSubmit={
              testBoundary === 'checkout-action'
                ? () =>
                    setPayload(
                      JSON.stringify({
                        plan: fixture.presentation.plan.slug,
                        interval: fixture.presentation.price.interval,
                      }),
                    )
                : undefined
            }
            locale={locale}
            copy={fixtureCopy}
          />
          {boundaryEvidence}
        </>
      );
    case 'portal':
      const downgradeBoundary =
        testBoundary === 'portal-downgrade' ||
        testBoundary === 'portal-cancel' ||
        testBoundary === 'portal-error';
      return (
        <>
          <PortalScreen
            subscription={{
              ...fixture.subscription,
              currentPlan: downgradeBoundary
                ? fixturePrismProPlan
                : fixture.subscription.currentPlan,
              scheduledChange:
                testBoundary === 'portal-cancel'
                  ? {
                      kind: 'downgrade',
                      plan: fixtureStarterPlan,
                      effectiveAt: fixtureEffectiveAt,
                      revision: fixtureScheduleRevision,
                    }
                  : null,
            }}
            activity={fixture.activity}
            portalAction={portalAction}
            planChangeAction={planChangeAction}
            cancelScheduledDowngradeAction={cancelScheduledDowngradeAction}
            planChange={
              testBoundary === 'portal-upgrade'
                ? fixtureUpgrade
                : testBoundary === 'portal-downgrade' ||
                    testBoundary === 'portal-error'
                  ? fixtureDowngrade
                  : null
            }
            planCatalog={fixturePlanCatalog}
            openPortal={
              testBoundary === 'portal-upgrade'
                ? (url) => setOpenedPortal(url)
                : undefined
            }
            locale={locale}
            copy={fixtureCopy}
          />
          {boundaryEvidence}
        </>
      );
    case 'invoices': {
      const status = [
        'draft',
        'open',
        'paid',
        'uncollectible',
        'void',
        'failed',
        'refunded',
      ].includes(routeQuery.status ?? '')
        ? (routeQuery.status as
            | 'draft'
            | 'open'
            | 'paid'
            | 'uncollectible'
            | 'void'
            | 'failed'
            | 'refunded')
        : null;
      return (
        <>
          <InvoicesScreen
            subscription={fixture.subscription}
            invoices={
              testBoundary === 'invoice-actions'
                ? {
                    ...fixture.invoices,
                    nextCursor: '25',
                    totalCount: 26,
                  }
                : fixture.invoices
            }
            summary={fixture.summary}
            query={{
              search: routeQuery.search,
              status,
              year:
                routeQuery.year !== null && /^\d{4}$/.test(routeQuery.year)
                  ? Number(routeQuery.year)
                  : null,
              cursor: routeQuery.cursor,
            }}
            pageSize={25}
            exportAction={disabledExport}
            locale={locale}
            copy={fixtureCopy}
          />
          {boundaryEvidence}
        </>
      );
    }
    case 'limit-reached':
      return (
        <>
          <LimitReachedScreen
            presentation={fixture.presentation}
            now={fixture.now}
            locale={locale}
            copy={fixtureCopy}
          />
          {boundaryEvidence}
        </>
      );
  }
}
