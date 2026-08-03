import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import { FixtureHistory } from '@/components/app-shell/fixture-history';
import {
  historyFixtureActions,
  historyVisualCases,
  type HistoryFixtureAction,
  type HistoryVisualCase,
} from '@/components/app-shell/fixture-history-contract';
import { unavailableUsage } from '@/lib/app-shell';
import { localeSchema } from '@/lib/i18n/locales';
import { appMessages } from '@/lib/i18n/messages/app';
import { sharedMessages } from '@/lib/i18n/messages/shared';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { isUiPreviewEnabled } from '@/lib/ui-preview';

export const metadata: Metadata = {
  title: 'History fixture — Gleen',
};

const fixtureIdentity = {
  displayName: 'Alex Koval',
  email: 'alex@gleen.space',
  initials: 'AK',
} as const;

type FixtureHistoryPageProps = Readonly<{
  searchParams: Promise<
    Readonly<Record<string, string | readonly string[] | undefined>>
  >;
}>;

function isHistoryVisualCase(value: unknown): value is HistoryVisualCase {
  return (
    typeof value === 'string' &&
    historyVisualCases.includes(value as HistoryVisualCase)
  );
}

function isHistoryFixtureAction(value: unknown): value is HistoryFixtureAction {
  return (
    typeof value === 'string' &&
    historyFixtureActions.includes(value as HistoryFixtureAction)
  );
}

export default async function FixtureHistoryPage({
  searchParams,
}: FixtureHistoryPageProps) {
  if (
    !isUiPreviewEnabled({
      NODE_ENV: process.env.NODE_ENV,
      VERCEL_ENV: process.env.VERCEL_ENV,
    })
  ) {
    notFound();
  }

  const resolvedSearchParams = await searchParams;
  const {
    visualCase = 'default',
    fixtureAction = 'success',
    fixtureDuplicate,
    locale: localeInput,
  } = resolvedSearchParams;
  if (!isHistoryVisualCase(visualCase)) {
    notFound();
  }
  if (!isHistoryFixtureAction(fixtureAction)) {
    notFound();
  }
  if (fixtureDuplicate !== undefined && fixtureDuplicate !== 'true') {
    notFound();
  }
  const parsedLocale = localeSchema.safeParse(localeInput);
  const locale = parsedLocale.success
    ? parsedLocale.data
    : await getRequestLocale();

  return (
    <AppShell
      copy={appMessages[locale]}
      identity={fixtureIdentity}
      locale={locale}
      localeSwitcherCopy={sharedMessages[locale]}
      usage={unavailableUsage}
      pathnameOverride="/app/history"
    >
      <FixtureHistory
        visualCase={visualCase}
        fixtureAction={fixtureAction}
        fixtureDuplicate={fixtureDuplicate === 'true'}
        queryInput={resolvedSearchParams}
        locale={locale}
      />
    </AppShell>
  );
}
