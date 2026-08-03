import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { UsageScreen } from '@/components/billing/usage-screen';
import { exportUsageCsv } from '@/lib/billing/actions';
import {
  toSubscriptionPresentation,
  toUsagePresentation,
  type SubscriptionPresentation,
  type UsagePresentation,
} from '@/lib/billing/presentation';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import {
  parseUsageRouteQuery,
  usagePeriodBounds,
  type UsagePeriodBounds,
} from '@/lib/billing/usage-query';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { billingMessages } from '@/lib/i18n/messages/billing';
import { getRequestLocale } from '@/lib/i18n/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return { title: billingMessages[locale].metadata.usage };
}

type UsagePageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function UsagePage({ searchParams }: UsagePageProps) {
  const locale = await getRequestLocale();
  const copy = billingMessages[locale];
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const query = parseUsageRouteQuery(await searchParams);
  const repository = createSupabaseBillingRepository(
    supabase as unknown as SupabaseBillingClient,
  );

  let subscription: Pick<
    SubscriptionPresentation,
    'usage' | 'resetAt' | 'resetAtLabel'
  > | null = null;
  let usage: UsagePresentation | null = null;
  let periodBounds: UsagePeriodBounds = {
    periodStart: null,
    periodEnd: null,
  };
  try {
    const snapshot = await repository.getOwnedSnapshot(user.id);
    periodBounds = usagePeriodBounds(
      query.range,
      snapshot.period,
      new Date().toISOString(),
    );
    const ledger = await repository.listOwnedUsage(user.id, {
      cursor: query.cursor,
      search: query.search,
      eventType: query.eventType,
      limit: 25,
      ...periodBounds,
    });
    const presentedSubscription = toSubscriptionPresentation(snapshot, {
      locale,
      copy,
    });
    subscription = {
      usage: presentedSubscription.usage,
      resetAt: presentedSubscription.resetAt,
      resetAtLabel: presentedSubscription.resetAtLabel,
    };
    usage = toUsagePresentation(ledger, { locale, copy });
  } catch {
    // The screen keeps filters available and renders its explicit error state.
  }

  return (
    <UsageScreen
      subscription={subscription}
      usage={usage}
      query={query}
      periodBounds={periodBounds}
      pageSize={25}
      exportAction={exportUsageCsv}
      locale={locale}
      copy={copy}
    />
  );
}
