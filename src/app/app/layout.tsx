import { redirect } from 'next/navigation';

import { AppShell } from '@/components/app-shell/app-shell';
import {
  deriveAppIdentity,
  unavailableUsage,
  type AppUsage,
} from '@/lib/app-shell';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';
import { appMessages } from '@/lib/i18n/messages/app';
import { sharedMessages } from '@/lib/i18n/messages/shared';
import { getRequestLocale } from '@/lib/i18n/request-locale';

function reportMissingTranslation(event: MissingTranslationEvent) {
  console.error(event);
}

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getRequestLocale();
  const copy = selectMessages(
    appMessages,
    locale,
    'app',
    reportMissingTranslation,
  );
  const sharedCopy = selectMessages(
    sharedMessages,
    locale,
    'shared',
    reportMissingTranslation,
  );
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/session-expired');

  let usage: AppUsage = unavailableUsage;
  try {
    const snapshot = await createSupabaseBillingRepository(
      supabase as unknown as SupabaseBillingClient,
    ).getOwnedSnapshot(user.id);
    usage = {
      status: 'available',
      planName: snapshot.currentPlan.displayName,
      used: snapshot.usage.used + snapshot.usage.reserved,
      remaining: snapshot.usage.remaining,
      limit: snapshot.usage.limit,
      resetAt: snapshot.period.endsAt,
    };
  } catch {
    // Billing availability must not prevent authenticated app navigation.
  }

  return (
    <AppShell
      copy={copy}
      identity={deriveAppIdentity(user)}
      locale={locale}
      localeSwitcherCopy={sharedCopy}
      usage={usage}
    >
      {children}
    </AppShell>
  );
}
