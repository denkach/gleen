import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import {
  getBillingFixture,
  isBillingFixtureSelection,
  type BillingFixtureScreen as BillingFixtureScreenName,
  type BillingFixtureState,
} from '@/lib/billing/fixtures';
import { isUiPreviewEnabled } from '@/lib/ui-preview';
import { appMessages } from '@/lib/i18n/messages/app';
import { sharedMessages } from '@/lib/i18n/messages/shared';

import { BillingFixtureScreen } from './fixture-screen';

const defaultState = {
  subscription: 'active',
  usage: 'active',
  checkout: 'active',
  portal: 'active',
  invoices: 'active',
  'limit-reached': 'limit-reached',
} as const satisfies Record<BillingFixtureScreenName, BillingFixtureState>;

const fixtureBoundaries = [
  'usage-actions',
  'checkout-action',
  'portal-upgrade',
  'portal-downgrade',
  'portal-cancel',
  'portal-error',
  'invoice-actions',
] as const;
type FixtureBoundary = (typeof fixtureBoundaries)[number];

type BillingFixturePageProps = Readonly<{
  params: Promise<{ screen: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function BillingFixturePage({
  params,
  searchParams,
}: BillingFixturePageProps) {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  const { screen } = await params;
  const query = await searchParams;
  const requestedState = query.state;
  const testBoundary =
    typeof query.testBoundary === 'string' &&
    fixtureBoundaries.includes(query.testBoundary as FixtureBoundary)
      ? (query.testBoundary as FixtureBoundary)
      : null;
  const fallbackState =
    screen in defaultState
      ? defaultState[screen as BillingFixtureScreenName]
      : undefined;
  const state =
    requestedState === undefined
      ? fallbackState
      : typeof requestedState === 'string'
        ? requestedState
        : undefined;

  if (!isBillingFixtureSelection(screen, state)) notFound();

  const fixture = getBillingFixture(screen, state);
  return (
    <AppShell
      copy={appMessages.en}
      identity={fixture.shell.identity}
      locale="en"
      localeSwitcherCopy={sharedMessages.en}
      usage={fixture.shell.usage}
      pathnameOverride="/app/subscription"
    >
      <BillingFixtureScreen
        fixture={fixture}
        testBoundary={testBoundary}
        routeQuery={{
          search: typeof query.search === 'string' ? query.search : '',
          eventType:
            typeof query.eventType === 'string' ? query.eventType : null,
          range: typeof query.range === 'string' ? query.range : 'current',
          status: typeof query.status === 'string' ? query.status : null,
          year: typeof query.year === 'string' ? query.year : null,
          cursor: typeof query.cursor === 'string' ? query.cursor : null,
        }}
      />
    </AppShell>
  );
}
