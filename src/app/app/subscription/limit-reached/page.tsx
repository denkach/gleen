import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { LimitReachedScreen } from '@/components/billing/limit-reached-screen';
import { toLimitReachedPresentation } from '@/lib/billing/presentation';
import {
  createSupabaseBillingRepository,
  type SupabaseBillingClient,
} from '@/lib/billing/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { billingMessages } from '@/lib/i18n/messages/billing';
import { getRequestLocale } from '@/lib/i18n/request-locale';

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return { title: billingMessages[locale].metadata.limitReached };
}

export default async function LimitReachedPage() {
  const locale = await getRequestLocale();
  const copy = billingMessages[locale];
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const snapshot = await createSupabaseBillingRepository(
    supabase as unknown as SupabaseBillingClient,
  ).getOwnedSnapshot(user.id);
  const now = new Date().toISOString();
  const presentation = toLimitReachedPresentation(snapshot, {
    now,
    locale,
    copy,
  });
  const consumed = presentation.usage.used + presentation.usage.reserved;
  if (
    presentation.usage.limit <= 0 ||
    presentation.usage.remaining !== 0 ||
    consumed < presentation.usage.limit
  ) {
    redirect('/app/subscription');
  }

  return (
    <LimitReachedScreen
      presentation={presentation}
      now={now}
      locale={locale}
      copy={copy}
    />
  );
}
