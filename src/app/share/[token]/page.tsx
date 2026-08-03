import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ResultWorkspace } from '@/components/result-workspace/result-workspace';
import { resultMessages } from '@/lib/i18n/messages/results';
import { getRequestLocale } from '@/lib/i18n/request-locale';
import { resultShareTokenSchema } from '@/lib/result-workspace/share';
import {
  loadPublicResultProjection,
  type SupabaseResultShareClient,
} from '@/lib/result-workspace/share-repository';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

type PublicResultPageProps = Readonly<{
  params: Promise<{ token: string }>;
}>;

async function getPublicResultMessages() {
  const locale = await getRequestLocale();
  return resultMessages[locale];
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = await getPublicResultMessages();
  return {
    title: copy.publicViewTitle,
    description: copy.publicViewShared,
    robots: { index: false, follow: false },
  };
}

export default async function PublicResultPage({
  params,
}: PublicResultPageProps) {
  const copy = await getPublicResultMessages();
  const { token } = await params;
  const parsedToken = resultShareTokenSchema.safeParse(token);
  if (!parsedToken.success) notFound();
  const projection = await loadPublicResultProjection(
    createAdminSupabaseClient() as unknown as SupabaseResultShareClient,
    parsedToken.data,
  );
  if (!projection) notFound();

  return (
    <main className="result-public-page">
      <p className="result-public-notice">{copy.publicViewShared}</p>
      <ResultWorkspace mode="public" model={projection} copy={copy} />
    </main>
  );
}
