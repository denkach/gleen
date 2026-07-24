'use client';

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from 'react';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { HistoryQuery, HistorySort } from '@/lib/history/query';

const sortOptions = [
  ['newest', 'Newest'],
  ['oldest', 'Oldest'],
  ['recent', 'Recently opened'],
  ['title-asc', 'A–Z'],
  ['title-desc', 'Z–A'],
] as const satisfies readonly (readonly [HistorySort, string])[];

function appliedFilterCount(query: HistoryQuery): number {
  return (
    query.status.length +
    Number(query.language !== null) +
    Number(query.source !== null) +
    Number(query.date !== 'all') +
    Number(query.favorite)
  );
}

export type HistoryToolbarProps = Readonly<{
  query: HistoryQuery;
  onSearch(value: string): void;
  onSortChange(sort: HistorySort): void;
  filterControls: ReactNode;
  filtersOpen?: boolean;
  onFiltersOpenChange?(open: boolean): void;
}>;

export function HistoryToolbar({ query, ...props }: HistoryToolbarProps) {
  return <HistoryToolbarState key={query.q} query={query} {...props} />;
}

function HistoryToolbarState({
  query,
  onSearch,
  onSortChange,
  filterControls,
  filtersOpen = false,
  onFiltersOpenChange,
}: HistoryToolbarProps) {
  const [search, setSearch] = useState(query.q);
  const searchRef = useRef<HTMLInputElement>(null);
  const count = appliedFilterCount(query);
  const currentSort =
    sortOptions.find(([value]) => value === query.sort)?.[1] ?? 'Newest';

  useEffect(() => {
    function focusSearch(event: KeyboardEvent) {
      if (event.key.toLowerCase() === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }

    window.addEventListener('keydown', focusSearch);
    return () => window.removeEventListener('keydown', focusSearch);
  }, []);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(search.trim());
  }

  return (
    <div>
      <form role="search" onSubmit={submitSearch}>
        <label htmlFor="history-search">Search history</label>
        <input
          ref={searchRef}
          id="history-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </form>

      <div>
        <button
          type="button"
          aria-label={
            count === 0 ? 'Filters, none applied' : `Filters, ${count} applied`
          }
          aria-expanded={filtersOpen}
          onClick={() => onFiltersOpenChange?.(!filtersOpen)}
        >
          Filters
          {count > 0 ? <span aria-hidden="true">{count}</span> : null}
        </button>
        {filterControls}

        <DropdownMenu>
          <DropdownMenuTrigger aria-label={`Sort history: ${currentSort}`}>
            Sort: {currentSort}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" aria-label="Sort history">
            {sortOptions.map(([value, label]) => (
              <DropdownMenuItem
                key={value}
                aria-current={query.sort === value ? 'true' : undefined}
                onSelect={() => onSortChange(value)}
              >
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div role="group" aria-label="History view">
          <button type="button" aria-label="List view" aria-pressed="true">
            List
          </button>
          <button
            type="button"
            aria-label="Grid view unavailable"
            aria-disabled="true"
            disabled
          >
            Grid
          </button>
        </div>
      </div>
    </div>
  );
}
