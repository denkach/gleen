import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import {
  UsageScreen,
  type UsageScreenQuery,
} from '@/components/billing/usage-screen';
import { exportUsageCsv } from '@/lib/billing/actions';
import { usageEventTypeSchema } from '@/lib/billing/domain';
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
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'Usage ledger — Gleen',
};

const usageRouteQuerySchema = z
  .object({
    search: z.string().trim().max(200).default(''),
    eventType: usageEventTypeSchema.nullable().default(null),
    cursor: z
      .string()
      .regex(/^(0|[1-9]\d*)$/)
      .nullable()
      .default(null),
  })
  .strict();

type UsagePageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

function scalar(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseUsageQuery(
  raw: Record<string, string | string[] | undefined>,
): UsageScreenQuery {
  const eventType = scalar(raw.eventType);
  const result = usageRouteQuerySchema.safeParse({
    search: scalar(raw.search),
    eventType:
      eventType === undefined || eventType === 'all' ? null : eventType,
    cursor: scalar(raw.cursor) ?? null,
  });
  return result.success
    ? result.data
    : { search: '', eventType: null, cursor: null };
}

export default async function UsagePage({ searchParams }: UsagePageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const query = parseUsageQuery(await searchParams);
  const repository = createSupabaseBillingRepository(
    supabase as unknown as SupabaseBillingClient,
  );

  let subscription: Pick<
    SubscriptionPresentation,
    'usage' | 'resetAt' | 'resetAtLabel'
  > | null = null;
  let usage: UsagePresentation | null = null;
  try {
    const [snapshot, ledger] = await Promise.all([
      repository.getOwnedSnapshot(user.id),
      repository.listOwnedUsage(user.id, {
        ...query,
        limit: 25,
        periodStart: null,
        periodEnd: null,
      }),
    ]);
    const presentedSubscription = toSubscriptionPresentation(snapshot);
    subscription = {
      usage: presentedSubscription.usage,
      resetAt: presentedSubscription.resetAt,
      resetAtLabel: presentedSubscription.resetAtLabel,
    };
    usage = toUsagePresentation(ledger);
  } catch {
    // The screen keeps filters available and renders its explicit error state.
  }

  return (
    <UsageScreen
      subscription={subscription}
      usage={usage}
      query={query}
      exportAction={exportUsageCsv}
    />
  );
}
