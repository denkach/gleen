import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { HistoryWorkspace } from '@/components/history/history-workspace';
import {
  deleteHistoryItem,
  loadMoreHistory,
  markHistoryItemOpened,
  reanalyzeHistoryDuplicate,
  renameHistoryItem,
  toggleHistoryFavorite,
} from '@/lib/history/actions';
import { parseHistoryQuery } from '@/lib/history/query';
import type {
  HistoryFacets,
  HistoryItem,
  HistoryPage as HistoryPageData,
} from '@/lib/history/repository';
import {
  createSupabaseHistoryRepository,
  type SupabaseHistoryClient,
} from '@/lib/history/supabase-repository';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  title: 'History — Gleen',
};

const historyActions = {
  toggleHistoryFavorite,
  renameHistoryItem,
  deleteHistoryItem,
  reanalyzeHistoryDuplicate,
  markHistoryItemOpened,
  loadMoreHistory,
};

type HistoryPageProps = Readonly<{
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}>;

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/session-expired');

  const rawSearchParams = await searchParams;
  const query = parseHistoryQuery(rawSearchParams);
  const duplicateCandidateResult =
    typeof rawSearchParams.duplicate === 'string' &&
    rawSearchParams.duplicate.length > 0
      ? z.uuid().safeParse(rawSearchParams.duplicate)
      : null;
  const duplicateCandidate = duplicateCandidateResult?.success
    ? duplicateCandidateResult.data
    : null;
  const repository = createSupabaseHistoryRepository(
    supabase as unknown as SupabaseHistoryClient,
  );

  let historyData:
    readonly [HistoryPageData, HistoryFacets, HistoryItem | null] | null = null;
  try {
    historyData = await Promise.all([
      repository.listOwned(user.id, query, 20),
      repository.listFacets(user.id),
      duplicateCandidate
        ? repository.findOwnedReusableDuplicate(user.id, duplicateCandidate)
        : Promise.resolve(null),
    ]);
  } catch {
    historyData = null;
  }

  if (!historyData) {
    return (
      <HistoryWorkspace
        initialPage={{ items: [], nextCursor: null }}
        query={query}
        facets={{ languages: [], sources: [] }}
        loadError
        actions={historyActions}
      />
    );
  }

  const [initialPage, facets, verifiedDuplicate] = historyData;
  return (
    <HistoryWorkspace
      initialPage={initialPage}
      query={query}
      facets={facets}
      verifiedDuplicate={verifiedDuplicate}
      actions={historyActions}
    />
  );
}
