import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { ResultWorkspace } from '@/components/result-workspace/result-workspace';
import { resultCopy } from '@/lib/result-workspace/copy';
import { resultShareTokenSchema } from '@/lib/result-workspace/share';
import {
  loadPublicResultProjection,
  type SupabaseResultShareClient,
} from '@/lib/result-workspace/share-repository';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: resultCopy.en.publicViewTitle,
  description: resultCopy.en.publicViewShared,
  robots: { index: false, follow: false },
};

type PublicResultPageProps = Readonly<{
  params: Promise<{ token: string }>;
}>;

export default async function PublicResultPage({
  params,
}: PublicResultPageProps) {
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
      <p className="result-public-notice">{resultCopy.en.publicViewShared}</p>
      <ResultWorkspace mode="public" model={projection} copy={resultCopy.en} />
    </main>
  );
}
