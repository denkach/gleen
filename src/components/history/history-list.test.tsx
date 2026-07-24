import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { HistoryQuery } from '@/lib/history/query';
import type { HistoryItem } from '@/lib/history/repository';

import { HistoryList } from './history-list';

function stubHistoryViewport(mobile: boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((media: string) => ({
      matches: media === '(max-width: 720px)' && mobile,
      media,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

const query: HistoryQuery = {
  q: '',
  status: [],
  language: null,
  source: null,
  date: 'all',
  favorite: false,
  sort: 'newest',
  cursor: null,
};

function item(
  id: string,
  status: HistoryItem['status'],
  overrides: Partial<HistoryItem> = {},
): HistoryItem {
  return {
    id,
    sourceId: `video-${id}`,
    href:
      status.key === 'processing' || status.key === 'failed'
        ? `/app?analysis=${id}`
        : `/app/video/${id}`,
    title: `Video ${id}`,
    channel: 'Signal Lab',
    thumbnailUrl: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    source: `https://youtube.com/watch?v=${id}`,
    language: 'English',
    outputLocale: 'en',
    durationSeconds: 2_058,
    durationLabel: '34:18',
    analyzedAt: '2026-07-24T10:00:00.000Z',
    analyzedAtLabel: 'Jul 24, 2026, 10:00 AM',
    lastOpenedAt: null,
    lastOpenedAtLabel: null,
    status,
    favorite: false,
    selectedArtifacts: ['summary'],
    readyArtifacts: status.key === 'ready' ? ['summary'] : [],
    canExport: status.key === 'ready',
    titleRevision: '2026-07-24T10:00:00.000Z',
    ...overrides,
  };
}

const items = [
  item('ready', { key: 'ready', label: 'Ready' }, { favorite: true }),
  item('partial', { key: 'partial', label: 'Partial' }),
  item('processing', { key: 'processing', label: 'Processing' }),
  item('failed', { key: 'failed', label: 'Failed' }, { thumbnailUrl: null }),
];

function actions() {
  return {
    toggleHistoryFavorite: vi
      .fn()
      .mockResolvedValue({ ok: true, data: undefined }),
    renameHistoryItem: vi.fn().mockResolvedValue({
      ok: true,
      data: { updatedAt: '2026-07-24T12:00:00.000Z' },
    }),
    deleteHistoryItem: vi.fn().mockResolvedValue({ ok: true, data: undefined }),
    markHistoryItemOpened: vi
      .fn()
      .mockResolvedValue({ ok: true, data: undefined }),
    loadMoreHistory: vi.fn(),
  };
}

function renderList(
  overrides: Partial<Parameters<typeof HistoryList>[0]> = {},
) {
  const props: Parameters<typeof HistoryList>[0] = {
    initialPage: { items, nextCursor: null },
    query,
    actions: actions(),
    onClearSearch: vi.fn(),
    onClearFilters: vi.fn(),
    onAnnouncement: vi.fn(),
    ...overrides,
  };
  render(<HistoryList {...props} />);
  return props;
}

describe('HistoryList', () => {
  it('renders independent desktop rows and mobile cards from the same truthful model', () => {
    stubHistoryViewport(false);
    renderList();
    const desktop = screen.getByTestId('history-desktop-list');
    const mobile = screen.getByTestId('history-mobile-list');

    for (const header of ['Video', 'Details', 'Status', 'Actions']) {
      expect(
        within(desktop).getByRole('columnheader', { name: header }),
      ).toBeInTheDocument();
    }
    for (const status of ['Ready', 'Partial', 'Processing', 'Failed']) {
      expect(within(desktop).getByText(status)).toBeInTheDocument();
      expect(within(mobile).getByText(status)).toBeInTheDocument();
    }

    expect(
      within(desktop).getByAltText('Thumbnail for Video ready'),
    ).toHaveAttribute('src', items[0].thumbnailUrl);
    expect(
      within(mobile).getAllByLabelText('Play Video ready')[0],
    ).toBeInTheDocument();
    expect(within(mobile).getAllByText('34:18')[0]).toBeInTheDocument();
    expect(
      within(mobile).getByTestId('history-thumbnail-fallback-failed'),
    ).toBeInTheDocument();
    expect(
      within(desktop).getByRole('button', {
        name: 'Remove Video ready from favorites',
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    expect(desktop).toHaveAttribute('aria-hidden', 'false');
    expect(mobile).toHaveAttribute('aria-hidden', 'true');
    expect(mobile).toHaveAttribute('inert');
  });

  it('exposes only the mobile card tree to assistive technology on mobile', () => {
    stubHistoryViewport(true);
    renderList();
    const desktop = screen.getByTestId('history-desktop-list');
    const mobile = screen.getByTestId('history-mobile-list');

    expect(desktop).toHaveAttribute('aria-hidden', 'true');
    expect(desktop).toHaveAttribute('inert');
    expect(mobile).toHaveAttribute('aria-hidden', 'false');
    expect(
      within(mobile).getByRole('button', {
        name: 'Remove Video ready from favorites',
      }),
    ).toBeInTheDocument();
  });

  it('appends and deduplicates Load more results without URL navigation', async () => {
    const user = userEvent.setup();
    const duplicate = { ...items[0], title: 'Duplicate should not replace' };
    const appended = item('next', { key: 'ready', label: 'Ready' });
    const props = renderList({
      initialPage: { items: [items[0]], nextCursor: 'cursor-1' },
    });
    vi.mocked(props.actions.loadMoreHistory).mockResolvedValue({
      ok: true,
      data: { items: [duplicate, appended], nextCursor: 'cursor-2' },
    });

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(props.actions.loadMoreHistory).toHaveBeenCalledWith({
      query: '',
      cursor: 'cursor-1',
    });
    expect(
      within(screen.getByTestId('history-desktop-list')).getAllByRole('row'),
    ).toHaveLength(3);
    expect(screen.getAllByText('Video next')).toHaveLength(2);
    expect(
      screen.queryByText('Duplicate should not replace'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Load more' }),
    ).toBeInTheDocument();
  });

  it('keeps existing items and shows a localized retry state when Load more fails', async () => {
    const user = userEvent.setup();
    const props = renderList({
      initialPage: { items: [items[0]], nextCursor: 'cursor-1' },
    });
    vi.mocked(props.actions.loadMoreHistory).mockResolvedValue({
      ok: false,
      code: 'failed',
      message: 'Could not load more saved analyses.',
    });

    await user.click(screen.getByRole('button', { name: 'Load more' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Could not load more saved analyses.',
    );
    expect(screen.getAllByText('Video ready')).toHaveLength(2);
    expect(
      screen.getByRole('button', { name: 'Try loading more again' }),
    ).toBeInTheDocument();
  });

  it.each([
    {
      name: 'no data',
      query,
      heading: 'No analyses yet',
      action: 'Start a new analysis',
    },
    {
      name: 'search',
      query: { ...query, q: 'missing prism' },
      heading: 'No results for “missing prism”',
      action: 'Clear search',
    },
    {
      name: 'filters',
      query: { ...query, status: ['failed'] as const },
      heading: 'No analyses match these filters',
      action: 'Clear filters',
    },
  ])(
    'renders a distinct $name empty state',
    async ({ query, heading, action }) => {
      const user = userEvent.setup();
      const props = renderList({
        initialPage: { items: [], nextCursor: null },
        query,
      });

      expect(
        screen.getByRole('heading', { name: heading }),
      ).toBeInTheDocument();
      const correctiveAction = screen.getByRole(
        action === 'Start a new analysis' ? 'link' : 'button',
        { name: action },
      );
      if (action === 'Start a new analysis') {
        expect(correctiveAction).toHaveAttribute('href', '/app');
      } else {
        await user.click(correctiveAction);
        expect(
          action === 'Clear search'
            ? props.onClearSearch
            : props.onClearFilters,
        ).toHaveBeenCalledOnce();
      }
    },
  );
});
