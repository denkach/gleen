'use client';

import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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

export type HistoryFilterControlsProps = Readonly<{
  draft: HistoryFilterDraft;
  facets: HistoryFacets;
  open: boolean;
  onOpenChange(open: boolean): void;
  onChange(draft: HistoryFilterDraft): void;
  onApply(): void;
  onReset(): void;
  onClearAll(): void;
}>;

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
}>;

export type HistoryWorkspaceProps = Readonly<{
  initialPage: HistoryPage;
  query: HistoryQuery;
  facets: HistoryFacets;
  verifiedDuplicate?: HistoryItem | null;
  actions: HistoryWorkspaceActions;
  renderFilters?: (props: HistoryFilterControlsProps) => ReactNode;
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
  renderFilters,
}: HistoryWorkspaceProps) {
  return (
    <HistoryWorkspaceState
      key={serializeHistoryQuery(query).toString()}
      initialPage={initialPage}
      query={query}
      facets={facets}
      renderFilters={renderFilters}
    />
  );
}

type HistoryWorkspaceStateProps = Pick<
  HistoryWorkspaceProps,
  'initialPage' | 'query' | 'facets' | 'renderFilters'
>;

function HistoryWorkspaceState({
  initialPage,
  query,
  facets,
  renderFilters,
}: HistoryWorkspaceStateProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => filterDraftFromQuery(query));
  const [filtersOpen, setFiltersOpen] = useState(false);

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

  const filterControls =
    renderFilters?.({
      draft,
      facets,
      open: filtersOpen,
      onOpenChange: setFiltersOpen,
      onChange: setDraft,
      onApply: applyFilters,
      onReset: resetFilters,
      onClearAll: clearAllFilters,
    }) ?? null;

  return (
    <section aria-label="History">
      <HistoryToolbar
        query={query}
        onSearch={search}
        onSortChange={changeSort}
        filterControls={filterControls}
        filtersOpen={filtersOpen}
        onFiltersOpenChange={setFiltersOpen}
      />

      <div role="status" aria-live="polite" aria-atomic="true">
        {resultAnnouncement(initialPage.items.length)}
      </div>
    </section>
  );
}
