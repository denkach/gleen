'use client';

import { CheckoutScreen } from '@/components/billing/checkout-screen';
import { InvoicesScreen } from '@/components/billing/invoices-screen';
import { LimitReachedScreen } from '@/components/billing/limit-reached-screen';
import { PortalScreen } from '@/components/billing/portal-screen';
import { SubscriptionScreen } from '@/components/billing/subscription-screen';
import { UsageScreen } from '@/components/billing/usage-screen';
import type { BillingFixture } from '@/lib/billing/fixtures';
import type { UsageEventType } from '@/lib/billing/domain';
import type { CheckoutActionInput } from '@/lib/billing/actions';
import { useState, useSyncExternalStore } from 'react';

const disabledExport = async () =>
  ({ ok: false, code: 'fixture-disabled' }) as const;
const disabledPortal = async () =>
  ({ ok: false, code: 'fixture-disabled' }) as const;
const subscribeHydration = () => () => undefined;
const fixturePlanChange = {
  plan: 'prism-pro',
  interval: 'year',
} as const satisfies CheckoutActionInput;

export function BillingFixtureScreen({
  fixture,
  testBoundary,
  routeQuery,
}: Readonly<{
  fixture: BillingFixture;
  testBoundary:
    | 'usage-actions'
    | 'checkout-action'
    | 'portal-actions'
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
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [payload, setPayload] = useState('');
  const [portalCount, setPortalCount] = useState(0);
  const [openedPortal, setOpenedPortal] = useState('');
  const portalAction =
    testBoundary === 'portal-actions' || testBoundary === 'portal-error'
      ? async () => {
          const count = portalCount + 1;
          setPortalCount(count);
          await new Promise((resolve) => window.setTimeout(resolve, 80));
          return testBoundary === 'portal-error'
            ? ({ ok: false, code: 'fixture-error' } as const)
            : ({
                ok: true,
                url: `https://billing.stripe.test/session/${count}`,
              } as const);
        }
      : disabledPortal;
  const planChangeAction =
    testBoundary === 'portal-actions'
      ? async (input: CheckoutActionInput) => {
          setPayload(JSON.stringify(input));
          return portalAction();
        }
      : disabledPortal;

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
                aria-label="Secure Stripe payment preview"
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
                <span>◇ Have a promo code?</span>
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
          />
          {boundaryEvidence}
        </>
      );
    case 'portal':
      return (
        <>
          <PortalScreen
            subscription={fixture.subscription}
            activity={fixture.activity}
            portalAction={portalAction}
            planChangeAction={planChangeAction}
            planChange={
              testBoundary === 'portal-actions' ? fixturePlanChange : null
            }
            openPortal={
              testBoundary === 'portal-actions'
                ? (url) => setOpenedPortal(url)
                : undefined
            }
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
          />
          {boundaryEvidence}
        </>
      );
  }
}
