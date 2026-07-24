'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState, useSyncExternalStore, type FormEvent } from 'react';

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
  loadError?: boolean;
  initialOverlay?: 'filters' | 'sort' | 'rename' | 'delete' | null;
  navigationPath?: string;
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

function resultAnnouncement(count: number): string {
  if (count === 0) return 'No saved analyses';
  if (count === 1) return '1 saved analysis';
  return `${count} saved analyses`;
}

function duplicateReassurance(item: HistoryItem): string {
  const details = [item.language, item.summaryPresetLabel].filter(
    (value): value is string => value !== null,
  );
  const version = details.length > 0 ? ` ${details.join(' · ')}` : '';
  return `Open the saved${version} version. No credits will be used.`;
}

function subscribeToHydrationSignal() {
  return () => undefined;
}

function clientHydrationSnapshot() {
  return true;
}

function serverHydrationSnapshot() {
  return false;
}

export function HistoryWorkspace({
  initialPage,
  query,
  facets,
  verifiedDuplicate = null,
  loadError = false,
  initialOverlay = null,
  navigationPath = '/app/history',
  actions,
}: HistoryWorkspaceProps) {
  return (
    <HistoryWorkspaceState
      key={serializeHistoryQuery(query).toString()}
      initialPage={initialPage}
      query={query}
      facets={facets}
      verifiedDuplicate={verifiedDuplicate}
      loadError={loadError}
      initialOverlay={initialOverlay}
      navigationPath={navigationPath}
      actions={actions}
    />
  );
}

type HistoryWorkspaceStateProps = Pick<
  HistoryWorkspaceProps,
  | 'initialPage'
  | 'query'
  | 'facets'
  | 'verifiedDuplicate'
  | 'loadError'
  | 'initialOverlay'
  | 'actions'
> &
  Readonly<{ navigationPath: string }>;

function HistoryWorkspaceState({
  initialPage,
  query,
  facets,
  verifiedDuplicate,
  loadError,
  initialOverlay,
  navigationPath,
  actions,
}: HistoryWorkspaceStateProps) {
  const router = useRouter();
  const [draft, setDraft] = useState(() => filterDraftFromQuery(query));
  const [filtersOpen, setFiltersOpen] = useState(initialOverlay === 'filters');
  const [reanalyzing, setReanalyzing] = useState(false);
  const reanalysisPendingRef = useRef(false);
  const [announcement, setAnnouncement] = useState(() =>
    resultAnnouncement(initialPage.items.length),
  );
  const hydrated = useSyncExternalStore(
    subscribeToHydrationSignal,
    clientHydrationSnapshot,
    serverHydrationSnapshot,
  );

  function navigate(nextQuery: HistoryQuery) {
    const serialized = serializeHistoryQuery(nextQuery).toString();
    const separator = navigationPath.includes('?') ? '&' : '?';
    router.push(
      serialized
        ? `${navigationPath}${separator}${serialized}`
        : navigationPath,
    );
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

  async function analyzeAnotherVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!verifiedDuplicate || reanalysisPendingRef.current) return;

    const failureMessage = 'We could not start another analysis. Try again.';
    reanalysisPendingRef.current = true;
    setReanalyzing(true);
    let navigationStarted = false;
    try {
      const result = await actions.reanalyzeHistoryDuplicate({
        analysisId: verifiedDuplicate.id,
      });
      if (!result.ok) {
        setAnnouncement(result.message);
        return;
      }

      if (
        !/^\/app\/video\/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
          result.data.redirectTo,
        )
      ) {
        setAnnouncement(failureMessage);
        return;
      }
      router.push(result.data.redirectTo);
      navigationStarted = true;
    } catch {
      setAnnouncement(failureMessage);
    } finally {
      if (!navigationStarted) {
        reanalysisPendingRef.current = false;
        setReanalyzing(false);
      }
    }
  }

  return (
    <section
      className="history-workspace history-bottom-nav-clearance"
      aria-label="History"
      data-history-hydrated={hydrated ? 'true' : 'false'}
    >
      <header className="history-page-head">
        <div className="history-page-head__copy">
          <span className="history-page-head__eyebrow">Your library</span>
          <h1>History</h1>
          <p>Open a saved result without spending another analysis.</p>
        </div>
        <div className="history-page-head__actions">
          <Link className="history-new-analysis" href="/app">
            <span aria-hidden="true">✦</span>
            New analysis
          </Link>
        </div>
      </header>

      {verifiedDuplicate ? (
        <aside
          className="history-duplicate-banner"
          aria-label="Saved analysis available"
        >
          <span className="history-duplicate-banner__play" aria-hidden="true" />
          <div className="history-duplicate-banner__copy">
            <strong>You already analyzed this video</strong>
            <p>{duplicateReassurance(verifiedDuplicate)}</p>
          </div>
          <div className="history-duplicate-banner__actions">
            <Link
              className="history-duplicate-banner__primary"
              href={verifiedDuplicate.href}
            >
              Open saved result
            </Link>
            <form onSubmit={analyzeAnotherVersion}>
              <button
                className="history-duplicate-banner__secondary"
                type="submit"
                disabled={reanalyzing}
              >
                {reanalyzing
                  ? 'Starting another analysis…'
                  : 'Analyze another version'}
              </button>
            </form>
          </div>
        </aside>
      ) : null}

      {loadError ? (
        <>
          <div
            className="history-workspace__announcer"
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            History is temporarily unavailable.
          </div>
          <section className="history-empty history-empty--initial">
            <h2>History is unavailable</h2>
            <p>We could not load your saved analyses.</p>
            <Link href="/app/history">Try again</Link>
          </section>
        </>
      ) : (
        <>
          <HistoryToolbar
            query={query}
            initialSortOpen={initialOverlay === 'sort'}
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
            initialItemDialog={
              initialOverlay === 'rename' || initialOverlay === 'delete'
                ? initialOverlay
                : null
            }
            onClearSearch={clearSearch}
            onClearFilters={clearAllFilters}
            onAnnouncement={setAnnouncement}
          />
        </>
      )}
    </section>
  );
}
