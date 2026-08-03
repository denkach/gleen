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
import type { HistoryMessages } from '@/lib/i18n/messages/history';

import {
  HistoryGridIcon,
  HistoryListIcon,
  HistorySortIcon,
} from './history-toolbar-icons';

const sortOptions = [
  'newest',
  'oldest',
  'recent',
  'title-asc',
  'title-desc',
] as const satisfies readonly HistorySort[];

export type HistoryToolbarProps = Readonly<{
  query: HistoryQuery;
  copy: HistoryMessages;
  initialSortOpen?: boolean;
  onSearch(value: string): void;
  onSortChange(sort: HistorySort): void;
  filterControl: ReactNode;
}>;

export function HistoryToolbar({ query, ...props }: HistoryToolbarProps) {
  return <HistoryToolbarState key={query.q} query={query} {...props} />;
}

function HistoryToolbarState({
  query,
  copy,
  initialSortOpen = false,
  onSearch,
  onSortChange,
  filterControl,
}: HistoryToolbarProps) {
  const [search, setSearch] = useState(query.q);
  const searchRef = useRef<HTMLInputElement>(null);
  const currentSort = copy.toolbar.sorts[query.sort];

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
          {copy.toolbar.searchLabel}
        </label>
        <input
          className="history-toolbar__search-input"
          ref={searchRef}
          id="history-search"
          type="search"
          placeholder={copy.toolbar.searchPlaceholder}
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
        />
      </form>

      <div className="history-toolbar__controls">
        {filterControl}

        <DropdownMenu defaultOpen={initialSortOpen}>
          <DropdownMenuTrigger
            className="history-toolbar__sort"
            aria-label={copy.toolbar.sortTrigger(currentSort)}
          >
            <span className="history-toolbar__sort-label">
              {copy.toolbar.sortPrefix}: {currentSort}
            </span>
            <HistorySortIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="history-toolbar__sort-menu"
            align="end"
            aria-label={copy.toolbar.sortMenuLabel}
          >
            {sortOptions.map((value) => (
              <DropdownMenuItem
                key={value}
                aria-current={query.sort === value ? 'true' : undefined}
                onSelect={() => onSortChange(value)}
              >
                {copy.toolbar.sorts[value]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div
          className="history-toolbar__view"
          role="group"
          aria-label={copy.toolbar.historyView}
        >
          <button
            type="button"
            className="history-toolbar__view-button history-toolbar__view-button--active"
            aria-label={copy.toolbar.views.listLabel}
            aria-pressed="true"
          >
            <HistoryListIcon />
            {copy.toolbar.views.list}
          </button>
          <button
            type="button"
            className="history-toolbar__view-button"
            aria-label={copy.toolbar.views.gridUnavailable}
            aria-disabled="true"
            disabled
          >
            <HistoryGridIcon />
            {copy.toolbar.views.grid}
          </button>
        </div>
      </div>
    </div>
  );
}
