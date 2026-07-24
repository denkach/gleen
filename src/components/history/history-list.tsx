'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import type { HistoryActionResult } from '@/lib/history/actions';
import { serializeHistoryQuery, type HistoryQuery } from '@/lib/history/query';
import type { HistoryItem, HistoryPage } from '@/lib/history/repository';

import { HistoryItemActions } from './history-item-actions';

const mobileHistoryQuery = '(max-width: 720px)';
const rejectedLoadMoreMessage =
  'We could not load more saved analyses. Try again.';

export type HistoryListActions = Readonly<{
  toggleHistoryFavorite(input: unknown): Promise<HistoryActionResult>;
  renameHistoryItem(
    input: unknown,
  ): Promise<HistoryActionResult<Readonly<{ updatedAt: string }>>>;
  deleteHistoryItem(input: unknown): Promise<HistoryActionResult>;
  markHistoryItemOpened(input: unknown): Promise<HistoryActionResult>;
  loadMoreHistory(input: unknown): Promise<HistoryActionResult<HistoryPage>>;
}>;

export type HistoryListProps = Readonly<{
  initialPage: HistoryPage;
  query: HistoryQuery;
  actions: HistoryListActions;
  onClearSearch(): void;
  onClearFilters(): void;
  onAnnouncement(message: string): void;
}>;

function hasFilters(query: HistoryQuery): boolean {
  return (
    query.status.length > 0 ||
    query.language !== null ||
    query.source !== null ||
    query.date !== 'all' ||
    query.favorite
  );
}

function useMobileHistoryLayout(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const media = window.matchMedia(mobileHistoryQuery);
    const update = () => setMobile(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return mobile;
}

function Media({ item }: Readonly<{ item: HistoryItem }>) {
  const [failed, setFailed] = useState(false);
  const showImage = item.thumbnailUrl !== null && !failed;

  return (
    <div className="history-item-media">
      {showImage ? (
        <Image
          className="history-item-media__image"
          src={item.thumbnailUrl ?? ''}
          alt={`Thumbnail for ${item.title}`}
          width={320}
          height={180}
          sizes="(max-width: 720px) 112px, 144px"
          unoptimized
          onError={() => setFailed(true)}
        />
      ) : (
        <span
          className="history-item-media__fallback"
          data-testid={`history-thumbnail-fallback-${item.id}`}
          aria-label={`Thumbnail unavailable for ${item.title}`}
        />
      )}
      <Link
        className="history-item-media__play"
        href={item.href}
        aria-label={`Play ${item.title}`}
      >
        <span aria-hidden="true">▶</span>
      </Link>
      {item.durationLabel ? (
        <span className="history-item-media__duration">
          {item.durationLabel}
        </span>
      ) : null}
    </div>
  );
}

function Status({ item }: Readonly<{ item: HistoryItem }>) {
  return (
    <span
      className={`history-item-status history-item-status--${item.status.key}`}
      data-status={item.status.key}
    >
      <span className="history-item-status__dot" aria-hidden="true" />
      {item.status.label}
    </span>
  );
}

type ItemViewProps = Readonly<{
  item: HistoryItem;
  actions: HistoryListActions;
  onChange(change: Partial<HistoryItem>): void;
  onDelete(): void;
  onAnnouncement(message: string): void;
}>;

function ItemActions(props: ItemViewProps) {
  return (
    <HistoryItemActions
      item={props.item}
      toggleFavorite={props.actions.toggleHistoryFavorite}
      renameItem={props.actions.renameHistoryItem}
      deleteItem={props.actions.deleteHistoryItem}
      markOpened={props.actions.markHistoryItemOpened}
      onChange={props.onChange}
      onDelete={props.onDelete}
      onAnnouncement={props.onAnnouncement}
    />
  );
}

function EmptyState({
  query,
  onClearSearch,
  onClearFilters,
}: Pick<HistoryListProps, 'query' | 'onClearSearch' | 'onClearFilters'>) {
  if (query.q) {
    return (
      <section className="history-empty history-empty--search">
        <h2>No results for “{query.q}”</h2>
        <p>Try a different title, channel, URL, or keyword.</p>
        <button type="button" onClick={onClearSearch}>
          Clear search
        </button>
      </section>
    );
  }

  if (hasFilters(query)) {
    return (
      <section className="history-empty history-empty--filters">
        <h2>No analyses match these filters</h2>
        <p>Clear the active filters to see more saved analyses.</p>
        <button type="button" onClick={onClearFilters}>
          Clear filters
        </button>
      </section>
    );
  }

  return (
    <section className="history-empty history-empty--initial">
      <h2>No analyses yet</h2>
      <p>Your completed and in-progress analyses will appear here.</p>
      <Link href="/app">Start a new analysis</Link>
    </section>
  );
}

export function HistoryList({
  initialPage,
  query,
  actions,
  onClearSearch,
  onClearFilters,
  onAnnouncement,
}: HistoryListProps) {
  const [items, setItems] = useState<readonly HistoryItem[]>(initialPage.items);
  const [nextCursor, setNextCursor] = useState(initialPage.nextCursor);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState('');
  const mobile = useMobileHistoryLayout();

  function changeItem(id: string, change: Partial<HistoryItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...change } : item)),
    );
  }

  function deleteItem(id: string) {
    setItems((current) => current.filter((item) => item.id !== id));
  }

  async function loadMore() {
    if (!nextCursor || loadingMore) return;
    setLoadingMore(true);
    setLoadError('');
    try {
      const result = await actions.loadMoreHistory({
        query: serializeHistoryQuery({ ...query, cursor: null }).toString(),
        cursor: nextCursor,
      });
      if (!result.ok) {
        setLoadError(result.message);
        onAnnouncement(result.message);
        return;
      }

      const seen = new Set(items.map((item) => item.id));
      const appended = result.data.items.filter((item) => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
      });
      setItems((current) => [...current, ...appended]);
      setNextCursor(result.data.nextCursor);
      onAnnouncement(
        appended.length === 1
          ? '1 more saved analysis loaded.'
          : `${appended.length} more saved analyses loaded.`,
      );
    } catch {
      setLoadError(rejectedLoadMoreMessage);
      onAnnouncement(rejectedLoadMoreMessage);
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0 && nextCursor === null) {
    return (
      <EmptyState
        query={query}
        onClearSearch={onClearSearch}
        onClearFilters={onClearFilters}
      />
    );
  }

  return (
    <div className="history-list">
      {mobile ? (
        <div
          className="history-list__mobile history-list__card-mode"
          data-testid="history-mobile-list"
        >
          {items.map((item) => (
            <article key={item.id} className="history-card">
              <Media item={item} />
              <div className="history-card__body">
                <Link href={item.href} className="history-card__title">
                  {item.title}
                </Link>
                <p className="history-card__metadata">
                  {[item.channel, item.language].filter(Boolean).join(' · ')}
                </p>
                {item.analyzedAtLabel ? (
                  <time dateTime={item.analyzedAt}>{item.analyzedAtLabel}</time>
                ) : null}
                <Status item={item} />
              </div>
              <div className="history-card__actions">
                <ItemActions
                  item={item}
                  actions={actions}
                  onChange={(change) => changeItem(item.id, change)}
                  onDelete={() => deleteItem(item.id)}
                  onAnnouncement={onAnnouncement}
                />
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div
          className="history-list__desktop history-list__desktop-mode"
          data-testid="history-desktop-list"
        >
          <table className="history-table">
            <thead>
              <tr>
                <th scope="col">Video</th>
                <th scope="col">Details</th>
                <th scope="col">Status</th>
                <th scope="col">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="history-row">
                  <td className="history-row__video">
                    <Media item={item} />
                    <div>
                      <Link href={item.href} className="history-row__title">
                        {item.title}
                      </Link>
                      {item.channel ? (
                        <span className="history-row__channel">
                          {item.channel}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="history-row__details">
                    {item.language ? <span>{item.language}</span> : null}
                    {item.analyzedAtLabel ? (
                      <time dateTime={item.analyzedAt}>
                        {item.analyzedAtLabel}
                      </time>
                    ) : null}
                  </td>
                  <td className="history-row__status">
                    <Status item={item} />
                  </td>
                  <td className="history-row__actions">
                    <ItemActions
                      item={item}
                      actions={actions}
                      onChange={(change) => changeItem(item.id, change)}
                      onDelete={() => deleteItem(item.id)}
                      onAnnouncement={onAnnouncement}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {loadError ? (
        <div className="history-list__load-error" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={() => void loadMore()}>
            Try loading more again
          </button>
        </div>
      ) : nextCursor ? (
        <button
          type="button"
          className="history-list__load-more"
          disabled={loadingMore}
          onClick={() => void loadMore()}
        >
          {loadingMore ? 'Loading…' : 'Load more'}
        </button>
      ) : null}
    </div>
  );
}
