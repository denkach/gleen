import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { HistoryItem } from '@/lib/history/repository';

const {
  deleteHistoryItem,
  findOwnedReusableDuplicate,
  getUser,
  listFacets,
  listOwned,
  loadMoreHistory,
  markHistoryItemOpened,
  push,
  reanalyzeHistoryDuplicate,
  renameHistoryItem,
  toggleHistoryFavorite,
} = vi.hoisted(() => ({
  deleteHistoryItem: vi.fn(),
  findOwnedReusableDuplicate: vi.fn(),
  getUser: vi.fn(),
  listFacets: vi.fn(),
  listOwned: vi.fn(),
  loadMoreHistory: vi.fn(),
  markHistoryItemOpened: vi.fn(),
  push: vi.fn(),
  reanalyzeHistoryDuplicate: vi.fn(),
  renameHistoryItem: vi.fn(),
  toggleHistoryFavorite: vi.fn(),
}));

const redirect = vi.hoisted(() =>
  vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
);

vi.mock('next/navigation', () => ({
  redirect,
  useRouter: () => ({ push }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/history/supabase-repository', () => ({
  createSupabaseHistoryRepository: () => ({
    findOwnedReusableDuplicate,
    listFacets,
    listOwned,
  }),
}));

vi.mock('@/lib/history/actions', () => ({
  deleteHistoryItem,
  loadMoreHistory,
  markHistoryItemOpened,
  reanalyzeHistoryDuplicate,
  renameHistoryItem,
  toggleHistoryFavorite,
}));

import HistoryPage from './page';

const ownerId = '11111111-1111-4111-8111-111111111111';
const verifiedDuplicate: HistoryItem = {
  id: '22222222-2222-4222-8222-222222222222',
  sourceId: 'video-1',
  href: '/app/video/22222222-2222-4222-8222-222222222222',
  title: 'Verified duplicate',
  channel: 'Signal Lab',
  thumbnailUrl: null,
  source: 'https://youtube.com/watch?v=video-1',
  language: 'English',
  outputLocale: 'en',
  summaryPresetLabel: 'Detailed',
  durationSeconds: 120,
  durationLabel: '2:00',
  analyzedAt: '2026-07-24T10:00:00.000Z',
  analyzedAtLabel: 'Jul 24, 2026',
  lastOpenedAt: null,
  lastOpenedAtLabel: null,
  status: { key: 'ready', label: 'Ready' },
  favorite: false,
  selectedArtifacts: ['summary'],
  readyArtifacts: ['summary'],
  canExport: true,
  titleRevision: '2026-07-24T10:00:00.000Z',
};

function renderPage(
  searchParams: Record<string, string | string[] | undefined> = {},
) {
  return HistoryPage({ searchParams: Promise.resolve(searchParams) }).then(
    render,
  );
}

describe('HistoryPage server boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: ownerId } } });
    listOwned.mockResolvedValue({ items: [], nextCursor: null });
    listFacets.mockResolvedValue({
      languages: ['en'],
      sources: ['https://youtube.com/watch?v=video-1'],
    });
    findOwnedReusableDuplicate.mockResolvedValue(null);
  });

  test('redirects unauthenticated users before loading History', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(renderPage()).rejects.toThrow(
      'NEXT_REDIRECT:/session-expired',
    );
    expect(listOwned).not.toHaveBeenCalled();
    expect(listFacets).not.toHaveBeenCalled();
  });

  test('passes the authenticated owner and validated query to a page of 20', async () => {
    await renderPage({
      q: '  prisms  ',
      status: ['ready', 'failed', 'unknown'],
      language: 'en',
      source: 'https://youtube.com/watch?v=video-1',
      date: '30d',
      favorite: 'true',
      sort: 'title-asc',
    });

    expect(listOwned).toHaveBeenCalledWith(
      ownerId,
      {
        q: 'prisms',
        status: ['ready', 'failed'],
        language: 'en',
        source: 'https://youtube.com/watch?v=video-1',
        date: '30d',
        favorite: true,
        sort: 'title-asc',
        cursor: null,
      },
      20,
    );
    expect(listFacets).toHaveBeenCalledWith(ownerId);
    expect(
      screen.getByRole('heading', { name: 'History', level: 1 }),
    ).toBeInTheDocument();
  });

  test('falls back safely for malformed query state', async () => {
    await renderPage({
      q: ['first', 'ignored'],
      status: ['unknown', 'processing'],
      language: '',
      source: '   ',
      date: 'tomorrow',
      favorite: 'yes',
      sort: 'dangerous',
      cursor: 'not-a-cursor',
    });

    expect(listOwned).toHaveBeenCalledWith(
      ownerId,
      {
        q: 'first',
        status: ['processing'],
        language: null,
        source: null,
        date: 'all',
        favorite: false,
        sort: 'newest',
        cursor: null,
      },
      20,
    );
  });

  test('verifies only a scalar duplicate candidate and renders the returned reusable item', async () => {
    findOwnedReusableDuplicate.mockResolvedValue(verifiedDuplicate);

    await renderPage({ duplicate: verifiedDuplicate.id });

    expect(findOwnedReusableDuplicate).toHaveBeenCalledWith(
      ownerId,
      verifiedDuplicate.id,
    );
    expect(
      screen.getByText('You already analyzed this video'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Open saved result' }),
    ).toHaveAttribute('href', verifiedDuplicate.href);
  });

  test.each([
    ['missing', undefined],
    ['repeated', [verifiedDuplicate.id, 'attacker-id']],
  ])('ignores a %s duplicate query candidate', async (_, duplicate) => {
    await renderPage({ duplicate });

    expect(findOwnedReusableDuplicate).not.toHaveBeenCalled();
    expect(
      screen.queryByText('You already analyzed this video'),
    ).not.toBeInTheDocument();
  });

  test('ignores a malformed scalar duplicate without failing normal History', async () => {
    await renderPage({ duplicate: 'not-a-uuid' });

    expect(findOwnedReusableDuplicate).not.toHaveBeenCalled();
    expect(
      screen.getByRole('heading', { name: 'No analyses yet' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByText('You already analyzed this video'),
    ).not.toBeInTheDocument();
  });

  test.each(['stale', 'foreign', 'processing', 'failed'])(
    'renders no banner when the repository rejects a %s duplicate candidate',
    async () => {
      findOwnedReusableDuplicate.mockResolvedValue(null);

      await renderPage({ duplicate: verifiedDuplicate.id });

      expect(findOwnedReusableDuplicate).toHaveBeenCalledWith(
        ownerId,
        verifiedDuplicate.id,
      );
      expect(
        screen.queryByText('You already analyzed this video'),
      ).not.toBeInTheDocument();
    },
  );

  test('passes every real History action including load more to the workspace', async () => {
    await renderPage();

    expect(
      screen.getByRole('heading', { name: 'No analyses yet' }),
    ).toBeInTheDocument();
    expect(loadMoreHistory).not.toHaveBeenCalled();
    expect(toggleHistoryFavorite).not.toHaveBeenCalled();
    expect(renameHistoryItem).not.toHaveBeenCalled();
    expect(deleteHistoryItem).not.toHaveBeenCalled();
    expect(reanalyzeHistoryDuplicate).not.toHaveBeenCalled();
    expect(markHistoryItemOpened).not.toHaveBeenCalled();
  });

  test('renders a safe retry state when the repository load fails', async () => {
    listOwned.mockRejectedValue(
      new Error('relation analysis_history secret detail'),
    );

    await renderPage();

    expect(
      screen.getByRole('heading', { name: 'History', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New analysis' })).toHaveAttribute(
      'href',
      '/app',
    );
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/app/history',
    );
    expect(document.body).not.toHaveTextContent('analysis_history');
    expect(document.body).not.toHaveTextContent('secret detail');
  });
});
