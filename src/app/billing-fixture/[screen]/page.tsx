import { notFound } from 'next/navigation';

import {
  getBillingFixture,
  isBillingFixtureSelection,
  type BillingFixtureScreen as BillingFixtureScreenName,
  type BillingFixtureState,
} from '@/lib/billing/fixtures';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

import { BillingFixtureScreen } from './fixture-screen';

const defaultState = {
  subscription: 'active',
  usage: 'active',
  checkout: 'active',
  portal: 'active',
  invoices: 'active',
  'limit-reached': 'limit-reached',
} as const satisfies Record<BillingFixtureScreenName, BillingFixtureState>;

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

  return <BillingFixtureScreen fixture={getBillingFixture(screen, state)} />;
}
