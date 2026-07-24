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

export type HistoryToolbarProps = Readonly<{
  query: HistoryQuery;
  onSearch(value: string): void;
  onSortChange(sort: HistorySort): void;
  filterControl: ReactNode;
}>;

export function HistoryToolbar({ query, ...props }: HistoryToolbarProps) {
  return <HistoryToolbarState key={query.q} query={query} {...props} />;
}

function HistoryToolbarState({
  query,
  onSearch,
  onSortChange,
  filterControl,
}: HistoryToolbarProps) {
  const [search, setSearch] = useState(query.q);
  const searchRef = useRef<HTMLInputElement>(null);
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
    <div className="history-toolbar">
      <form
        className="history-toolbar__search"
        role="search"
        onSubmit={submitSearch}
      >
        <label className="app-visually-hidden" htmlFor="history-search">
          Search history
        </label>
        <input
          className="history-toolbar__search-input"
          ref={searchRef}
          id="history-search"
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </form>

      <div className="history-toolbar__controls">
        {filterControl}

        <DropdownMenu>
          <DropdownMenuTrigger
            className="history-toolbar__sort"
            aria-label={`Sort history: ${currentSort}`}
          >
            Sort: {currentSort}
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="history-toolbar__sort-menu"
            align="end"
            aria-label="Sort history"
          >
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

        <div
          className="history-toolbar__view"
          role="group"
          aria-label="History view"
        >
          <button
            type="button"
            className="history-toolbar__view-button history-toolbar__view-button--active"
            aria-label="List view"
            aria-pressed="true"
          >
            List
          </button>
          <button
            type="button"
            className="history-toolbar__view-button"
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
