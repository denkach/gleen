'use client';

import { CheckoutScreen } from '@/components/billing/checkout-screen';
import { InvoicesScreen } from '@/components/billing/invoices-screen';
import { LimitReachedScreen } from '@/components/billing/limit-reached-screen';
import { PortalScreen } from '@/components/billing/portal-screen';
import { SubscriptionScreen } from '@/components/billing/subscription-screen';
import { UsageScreen } from '@/components/billing/usage-screen';
import type { BillingFixture } from '@/lib/billing/fixtures';

const disabledExport = async () =>
  ({ ok: false, code: 'fixture-disabled' }) as const;
const disabledPortal = async () =>
  ({ ok: false, code: 'fixture-disabled' }) as const;

export function BillingFixtureScreen({
  fixture,
}: Readonly<{ fixture: BillingFixture }>) {
  switch (fixture.screen) {
    case 'subscription':
      return (
        <SubscriptionScreen
          presentation={fixture.presentation}
          initialInterval="month"
        />
      );
    case 'usage':
      return (
        <UsageScreen
          subscription={fixture.subscription}
          usage={fixture.usage}
          query={{
            search: '',
            eventType: null,
            range: 'current',
            cursor: null,
          }}
          periodBounds={{
            periodStart: '2025-07-01T00:00:00.000Z',
            periodEnd: '2025-08-01T00:00:00.000Z',
          }}
          pageSize={25}
          exportAction={disabledExport}
        />
      );
    case 'checkout':
      return (
        <CheckoutScreen
          presentation={fixture.presentation}
          prices={fixture.prices}
          state={{ kind: 'ready' }}
          stripeCheckout={
            <div className="billing-stripe-skeleton" role="status">
              Secure payment form is disabled in this visual fixture.
            </div>
          }
          totals={fixture.totals}
          canSubmit={false}
        />
      );
    case 'portal':
      return (
        <PortalScreen
          subscription={fixture.subscription}
          activity={fixture.activity}
          portalAction={disabledPortal}
        />
      );
    case 'invoices':
      return (
        <InvoicesScreen
          subscription={fixture.subscription}
          invoices={fixture.invoices}
          summary={fixture.summary}
          query={{ search: '', status: null, year: null, cursor: null }}
          pageSize={25}
          exportAction={disabledExport}
        />
      );
    case 'limit-reached':
      return (
        <LimitReachedScreen
          presentation={fixture.presentation}
          now={fixture.now}
        />
      );
  }
}
