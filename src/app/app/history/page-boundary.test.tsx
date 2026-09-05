import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRequestLocale, getUser, repository } = vi.hoisted(() => ({
  getRequestLocale: vi.fn(),
  getUser: vi.fn(),
  repository: {
    findOwnedReusableDuplicate: vi.fn(),
    listFacets: vi.fn(),
    listOwned: vi.fn(),
  },
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock('@/components/history/history-workspace', () => ({
  HistoryWorkspace: () => null,
}));

vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/history/supabase-repository', () => ({
  createSupabaseHistoryRepository: () => repository,
}));

vi.mock('@/lib/history/actions', () => ({
  deleteHistoryItem: vi.fn(),
  loadMoreHistory: vi.fn(),
  markHistoryItemOpened: vi.fn(),
  reanalyzeHistoryDuplicate: vi.fn(),
  renameHistoryItem: vi.fn(),
  retryPartialHistoryAnalysis: vi.fn(),
  toggleHistoryFavorite: vi.fn(),
}));

import HistoryPage from './page';

type HistoryClientBoundaryProps = Readonly<Record<string, unknown>>;

function expectSerializableHistoryBoundary(
  element: ReactElement,
  expectedLoadError: boolean,
) {
  const props = element.props as HistoryClientBoundaryProps;
  const { actions, ...serializableProps } = props;

  expect(props).not.toHaveProperty('copy');
  expect(props).not.toHaveProperty('locale');
  expect(props.copySource).toEqual({ kind: 'catalog', locale: 'de' });
  expect(props.loadError === true).toBe(expectedLoadError);
  expect(() => structuredClone(props.copySource)).not.toThrow();
  expect(() => structuredClone(serializableProps)).not.toThrow();
  expect(
    Object.values(actions as Record<string, unknown>).every(
      (action) => typeof action === 'function',
    ),
  ).toBe(true);
}

describe('HistoryPage client boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRequestLocale.mockResolvedValue('de');
    getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
    repository.listOwned.mockResolvedValue({ items: [], nextCursor: null });
    repository.listFacets.mockResolvedValue({ languages: [], sources: [] });
    repository.findOwnedReusableDuplicate.mockResolvedValue(null);
  });

  it('keeps successful production History catalog functions behind the client boundary', async () => {
    const element = await HistoryPage({ searchParams: Promise.resolve({}) });

    expectSerializableHistoryBoundary(element, false);
  });

  it('keeps failed production History catalog functions behind the client boundary', async () => {
    repository.listOwned.mockRejectedValue(new Error('fixture load failed'));

    const element = await HistoryPage({ searchParams: Promise.resolve({}) });

    expectSerializableHistoryBoundary(element, true);
  });
});
