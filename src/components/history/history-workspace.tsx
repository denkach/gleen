'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { HistoryFilters } from '@/components/history/history-filters';
import { HistoryList } from '@/components/history/history-list';
import { HistoryToolbar } from '@/components/history/history-toolbar';
import type { HistoryActionResult } from '@/lib/history/actions';
import {
  serializeHistoryQuery,
  type HistoryQuery,
  type HistorySort,
} from '@/lib/history/query';
import type {
  HistoryFacets,
  HistoryItem,
  HistoryPage,
} from '@/lib/history/repository';

export type HistoryFilterDraft = Readonly<
  Pick<HistoryQuery, 'status' | 'language' | 'source' | 'date' | 'favorite'>
>;

export type HistoryWorkspaceActions = Readonly<{
  toggleHistoryFavorite(input: unknown): Promise<HistoryActionResult>;
  renameHistoryItem(
    input: unknown,
  ): Promise<HistoryActionResult<Readonly<{ updatedAt: string }>>>;
  deleteHistoryItem(input: unknown): Promise<HistoryActionResult>;
  reanalyzeHistoryDuplicate(
    input: unknown,
  ): Promise<HistoryActionResult<Readonly<{ redirectTo: string }>>>;
  markHistoryItemOpened(input: unknown): Promise<HistoryActionResult>;
  loadMoreHistory(input: unknown): Promise<HistoryActionResult<HistoryPage>>;
}>;

export type HistoryWorkspaceProps = Readonly<{
  initialPage: HistoryPage;
  query: HistoryQuery;
  facets: HistoryFacets;
  verifiedDuplicate?: HistoryItem | null;
  actions: HistoryWorkspaceActions;
}>;

function filterDraftFromQuery(query: HistoryQuery): HistoryFilterDraft {
  return {
    status: query.status,
    language: query.language,
    source: query.source,
    date: query.date,
    favorite: query.favorite,
  };
}

const emptyFilterDraft: HistoryFilterDraft = {
  status: [],
  language: null,
  source: null,
  date: 'all',
  favorite: false,
};

function appliedFilterCount(query: HistoryQuery): number {
  return (
    query.status.length +
    Number(query.language !== null) +
    Number(query.source !== null) +
    Number(query.date !== 'all') +
    Number(query.favorite)
  );
}

function historyUrl(query: HistoryQuery): string {
  const parameters = serializeHistoryQuery(query).toString();
  return parameters ? `/app/history?${parameters}` : '/app/history';
}

function resultAnnouncement(count: number): string {
  if (count === 0) return 'No saved analyses';
  if (count === 1) return '1 saved analysis';
  return `${count} saved analyses`;
}

export function HistoryWorkspace({
  initialPage,
  query,
  facets,
  actions,
}: HistoryWorkspaceProps) {
  return (
    <HistoryWorkspaceState
      key={serializeHistoryQuery(query).toString()}
      initialPage={initialPage}
      query={query}
      facets={facets}
      actions={actions}
    />
  );
}

type HistoryWorkspaceStateProps = Pick<
  HistoryWorkspaceProps,
  'initialPage' | 'query' | 'facets' | 'actions'
>;

function HistoryWorkspaceState({
  initialPage,
  query,
  facets,
  actions,
}: HistoryWorkspaceStateProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => filterDraftFromQuery(query));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [announcement, setAnnouncement] = useState(() =>
    resultAnnouncement(initialPage.items.length),
  );

  function navigate(nextQuery: HistoryQuery) {
    router.push(historyUrl(nextQuery));
  }

  function search(value: string) {
    navigate({ ...query, q: value, cursor: null });
  }

  function changeSort(sort: HistorySort) {
    navigate({ ...query, sort, cursor: null });
  }

  function applyFilters() {
    navigate({ ...query, ...draft, cursor: null });
    setFiltersOpen(false);
  }

  function resetFilters() {
    setDraft(emptyFilterDraft);
  }

  function clearAllFilters() {
    setDraft(emptyFilterDraft);
    navigate({ ...query, ...emptyFilterDraft, cursor: null });
    setFiltersOpen(false);
  }

  function clearSearch() {
    navigate({ ...query, q: '', cursor: null });
  }

  return (
    <section
      className="history-workspace history-bottom-nav-clearance"
      aria-label="History"
    >
      <HistoryToolbar
        query={query}
        onSearch={search}
        onSortChange={changeSort}
        filterControl={
          <HistoryFilters
            draft={draft}
            appliedCount={appliedFilterCount(query)}
            facets={facets}
            open={filtersOpen}
            onOpenChange={setFiltersOpen}
            onChange={setDraft}
            onApply={applyFilters}
            onReset={resetFilters}
            onClearAll={clearAllFilters}
          />
        }
      />

      <div
        className="history-workspace__announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {announcement}
      </div>

      <HistoryList
        initialPage={initialPage}
        query={query}
        actions={actions}
        onClearSearch={clearSearch}
        onClearFilters={clearAllFilters}
        onAnnouncement={setAnnouncement}
      />
    </section>
  );
}
