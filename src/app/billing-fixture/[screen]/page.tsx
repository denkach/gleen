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
import { materializeLocaleSwitcherCopy } from '@/lib/i18n/locale-switcher-copy';
import { localeSchema } from '@/lib/i18n/locales';
import { getRequestLocale } from '@/lib/i18n/request-locale';

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
  'subscription-retry',
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
  const parsedLocale = localeSchema.safeParse(query.locale);
  const locale = parsedLocale.success
    ? parsedLocale.data
    : await getRequestLocale();
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

  const fixture = getBillingFixture(screen, state, locale);
  const accountReference =
    screen === 'subscription' &&
    state === 'error' &&
    query.accountReference === '1';
  return (
    <AppShell
      accountReferenceOverride={accountReference}
      copy={appMessages[locale]}
      identity={
        accountReference
          ? {
              displayName: 'Denys Cherneha',
              email: 'denkach2211@gmail.com',
              initials: 'DC',
            }
          : fixture.shell.identity
      }
      locale={locale}
      localeSwitcherCopy={materializeLocaleSwitcherCopy(sharedMessages[locale])}
      usage={
        accountReference
          ? {
              status: 'available',
              planName: 'Prism',
              used: 1,
              remaining: 24,
              limit: 25,
              resetAt: '2026-09-01T00:00:00.000Z',
            }
          : fixture.shell.usage
      }
      pathnameOverride="/app/subscription"
    >
      <BillingFixtureScreen
        fixture={fixture}
        locale={locale}
        accountReference={accountReference}
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
