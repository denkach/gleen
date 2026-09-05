import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import {
  HistoryWorkspace,
  type HistoryWorkspaceProps,
} from './history-workspace';
import type { HistoryQuery } from '@/lib/history/query';
import type { HistoryItem } from '@/lib/history/repository';
import { historyMessages } from '@/lib/i18n/messages/history';
import type { Locale } from '@/lib/i18n/locales';

const query: HistoryQuery = {
  q: 'prisms',
  status: ['ready'],
  language: 'en',
  source: 'YouTube',
  date: '30d',
  favorite: true,
  sort: 'recent',
  cursor: {
    sort: 'recent',
    value: '2026-07-20T10:00:00.000Z',
    id: '00000000-0000-4000-8000-000000000001',
  },
};

const actions: HistoryWorkspaceProps['actions'] = {
  toggleHistoryFavorite: vi.fn(),
  renameHistoryItem: vi.fn(),
  deleteHistoryItem: vi.fn(),
  reanalyzeHistoryDuplicate: vi.fn(),
  markHistoryItemOpened: vi.fn(),
  loadMoreHistory: vi.fn(),
};

function injectedHistoryCopy(locale: Locale) {
  return {
    kind: 'injected' as const,
    locale,
    copy: historyMessages[locale],
  };
}

const historyItem: HistoryItem = {
  id: '22222222-2222-4222-8222-222222222222',
  sourceId: 'video-1',
  href: '/app/video/22222222-2222-4222-8222-222222222222',
  title: 'Integrated history item',
  channel: 'Signal Lab',
  thumbnailUrl: null,
  source: 'https://youtube.com/watch?v=video-1',
  language: 'English',
  outputLocale: 'en',
  summaryPresetLabel: 'Deep',
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

function renderWorkspace(queryOverride: HistoryQuery = query) {
  return render(
    <HistoryWorkspace
      copySource={injectedHistoryCopy('en')}
      initialPage={{ items: [], nextCursor: null }}
      query={queryOverride}
      facets={{ languages: ['en', 'sk'], sources: ['YouTube'] }}
      verifiedDuplicate={null}
      actions={actions}
    />,
  );
}

const localeRerenderCases = [
  {
    locale: 'de',
    initialStatus: 'Bereit',
    initialDate: '24.07.2026',
    loadedStatus: 'Fehlgeschlagen',
    loadedDate: '23.07.2026',
  },
  {
    locale: 'uk',
    initialStatus: 'Готово',
    initialDate: '24 лип. 2026 р.',
    loadedStatus: 'Помилка',
    loadedDate: '23 лип. 2026 р.',
  },
] as const satisfies readonly Readonly<{
  locale: Locale;
  initialStatus: string;
  initialDate: string;
  loadedStatus: string;
  loadedDate: string;
}>[];

const resultAnnouncementCases = [
  ['uk', 2, '2 збережені аналізи'],
  ['uk', 5, '5 збережених аналізів'],
  ['uk', 21, '21 збережений аналіз'],
  ['ru', 2, '2 сохранённых анализа'],
  ['ru', 5, '5 сохранённых анализов'],
  ['ru', 21, '21 сохранённый анализ'],
] as const;

beforeEach(() => vi.clearAllMocks());

describe('HistoryWorkspace URL state', () => {
  it('mounts the approved page heading and spectral New analysis action', () => {
    renderWorkspace();

    const heading = screen.getByRole('heading', { name: 'History', level: 1 });
    expect(heading.closest('.history-page-head')).toBeInTheDocument();
    expect(heading.parentElement).toHaveClass('history-page-head__copy');
    expect(
      screen.getByRole('link', { name: 'New analysis' }).parentElement,
    ).toHaveClass('history-page-head__actions');
    expect(screen.getByText('Your library')).toHaveClass(
      'history-page-head__eyebrow',
    );
    expect(
      screen.getByText(
        'Open a saved result without spending another analysis.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New analysis' })).toHaveAttribute(
      'href',
      '/app',
    );
    expect(screen.getByRole('link', { name: 'New analysis' })).toHaveClass(
      'history-new-analysis',
    );
  });

  it('renders the verified duplicate and reanalyzes with only its confirmed id', async () => {
    const user = userEvent.setup();
    vi.mocked(actions.reanalyzeHistoryDuplicate).mockResolvedValue({
      ok: true,
      data: {
        redirectTo: '/app/video/33333333-3333-4333-8333-333333333333',
      },
    });

    render(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('en')}
        initialPage={{ items: [], nextCursor: null }}
        query={query}
        facets={{ languages: [], sources: [] }}
        verifiedDuplicate={historyItem}
        actions={actions}
      />,
    );

    const banner = screen
      .getByText('You already analyzed this video')
      .closest('.history-duplicate-banner');
    expect(banner).toBeInTheDocument();
    expect(
      banner?.querySelector('.history-duplicate-banner__play'),
    ).toHaveAttribute('aria-hidden', 'true');
    expect(
      screen.getByText('You already analyzed this video').parentElement,
    ).toHaveClass('history-duplicate-banner__copy');
    expect(
      screen.getByRole('link', { name: 'Open saved result' }).parentElement,
    ).toHaveClass('history-duplicate-banner__actions');
    expect(
      screen.getByText(
        'Open the saved English · Deep version. No credits will be used.',
      ),
    ).toBeInTheDocument();
    const openSaved = screen.getByRole('link', { name: 'Open saved result' });
    expect(openSaved).toHaveAttribute('href', historyItem.href);
    expect(openSaved).toHaveClass('history-duplicate-banner__primary');

    const reanalyze = screen.getByRole('button', {
      name: 'Analyze another version',
    });
    expect(reanalyze).toHaveClass('history-duplicate-banner__secondary');
    expect(reanalyze.closest('form')).toBeInTheDocument();
    await user.click(reanalyze);

    expect(actions.reanalyzeHistoryDuplicate).toHaveBeenCalledWith({
      analysisId: historyItem.id,
    });
    expect(push).toHaveBeenCalledWith(
      '/app/video/33333333-3333-4333-8333-333333333333',
    );
  });

  it('stays locked after a valid reanalysis redirect until navigation unmounts', async () => {
    const user = userEvent.setup();
    let resolveReanalysis:
      | ((
          result: Awaited<ReturnType<typeof actions.reanalyzeHistoryDuplicate>>,
        ) => void)
      | undefined;
    vi.mocked(actions.reanalyzeHistoryDuplicate).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReanalysis = resolve;
        }),
    );

    render(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('en')}
        initialPage={{ items: [], nextCursor: null }}
        query={query}
        facets={{ languages: [], sources: [] }}
        verifiedDuplicate={historyItem}
        actions={actions}
      />,
    );

    const reanalyze = screen.getByRole('button', {
      name: 'Analyze another version',
    });
    const form = reanalyze.closest('form')!;
    await user.click(reanalyze);

    await act(async () => {
      resolveReanalysis?.({
        ok: true,
        data: {
          redirectTo: '/app/video/33333333-3333-4333-8333-333333333333',
        },
      });
    });

    const pending = screen.getByRole('button', {
      name: 'Starting another analysis…',
    });
    expect(pending).toBeDisabled();
    await user.click(pending);
    fireEvent.submit(form);
    expect(actions.reanalyzeHistoryDuplicate).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledOnce();
    expect(push).toHaveBeenCalledWith(
      '/app/video/33333333-3333-4333-8333-333333333333',
    );
  });

  it('announces rejected duplicate reanalysis and never follows an unsafe redirect', async () => {
    const user = userEvent.setup();
    let rejectReanalysis: ((reason: unknown) => void) | undefined;
    vi.mocked(actions.reanalyzeHistoryDuplicate)
      .mockImplementationOnce(
        () =>
          new Promise((_, reject) => {
            rejectReanalysis = reject;
          }),
      )
      .mockResolvedValueOnce({
        ok: true,
        data: { redirectTo: 'https://attacker.example/result' },
      });

    render(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('en')}
        initialPage={{ items: [], nextCursor: null }}
        query={query}
        facets={{ languages: [], sources: [] }}
        verifiedDuplicate={historyItem}
        actions={actions}
      />,
    );

    const reanalyze = screen.getByRole('button', {
      name: 'Analyze another version',
    });
    await user.click(reanalyze);
    expect(
      screen.getByRole('button', { name: 'Starting another analysis…' }),
    ).toBeDisabled();
    await act(async () => {
      rejectReanalysis?.(new Error('private database detail'));
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'We could not start another analysis. Try again.',
    );
    expect(screen.getByRole('status')).not.toHaveTextContent(
      'private database detail',
    );

    const recovered = screen.getByRole('button', {
      name: 'Analyze another version',
    });
    expect(recovered).toBeEnabled();
    await user.click(recovered);
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'We could not start another analysis. Try again.',
    );
  });

  it('announces a structured duplicate rejection without navigation', async () => {
    const user = userEvent.setup();
    let resolveReanalysis:
      | ((
          result: Awaited<ReturnType<typeof actions.reanalyzeHistoryDuplicate>>,
        ) => void)
      | undefined;
    vi.mocked(actions.reanalyzeHistoryDuplicate).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveReanalysis = resolve;
        }),
    );

    render(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('en')}
        initialPage={{ items: [], nextCursor: null }}
        query={query}
        facets={{ languages: [], sources: [] }}
        verifiedDuplicate={historyItem}
        actions={actions}
      />,
    );

    const reanalyze = screen.getByRole('button', {
      name: 'Analyze another version',
    });
    await user.click(reanalyze);
    expect(
      screen.getByRole('button', { name: 'Starting another analysis…' }),
    ).toBeDisabled();
    await user.click(
      screen.getByRole('button', { name: 'Starting another analysis…' }),
    );
    fireEvent.submit(reanalyze.closest('form')!);
    expect(actions.reanalyzeHistoryDuplicate).toHaveBeenCalledOnce();

    await act(async () => {
      resolveReanalysis?.({
        ok: false,
        code: 'not-found',
      });
    });

    expect(screen.getByRole('status')).toHaveTextContent(
      'This saved analysis is no longer available.',
    );
    expect(
      screen.getByRole('button', { name: 'Analyze another version' }),
    ).toBeEnabled();
    expect(push).not.toHaveBeenCalled();
  });

  it('omits unavailable duplicate metadata instead of inventing copy', () => {
    render(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('en')}
        initialPage={{ items: [], nextCursor: null }}
        query={query}
        facets={{ languages: [], sources: [] }}
        verifiedDuplicate={{
          ...historyItem,
          language: null,
          summaryPresetLabel: null,
        }}
        actions={actions}
      />,
    );

    expect(
      screen.getByText('Open the saved version. No credits will be used.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Balanced|Deep/u)).not.toBeInTheDocument();
  });

  it('renders the safe load error under the same approved page heading', () => {
    render(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('en')}
        initialPage={{ items: [], nextCursor: null }}
        query={query}
        facets={{ languages: [], sources: [] }}
        loadError
        actions={actions}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'History', level: 1 }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'New analysis' })).toHaveAttribute(
      'href',
      '/app',
    );
    expect(
      screen.getByRole('heading', { name: 'History is unavailable' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/app/history',
    );
  });

  it('exposes the stable page and bottom-navigation clearance hooks', () => {
    renderWorkspace();

    const workspace = screen.getByRole('region', { name: 'History' });
    expect(workspace).toHaveClass(
      'history-workspace',
      'history-bottom-nav-clearance',
    );
    expect(screen.getByRole('status')).toHaveClass(
      'history-workspace__announcer',
    );
  });

  it('removes the cursor and serializes canonical URLs for search and sort', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const search = screen.getByRole('searchbox', { name: 'Search history' });
    await user.clear(search);
    await user.type(search, 'server actions{Enter}');

    expect(push).toHaveBeenNthCalledWith(
      1,
      '/app/history?q=server+actions&status=ready&language=en&source=YouTube&date=30d&favorite=true&sort=recent',
    );

    await user.click(screen.getByRole('button', { name: /sort history/i }));
    await user.click(await screen.findByRole('menuitem', { name: 'A–Z' }));

    expect(push).toHaveBeenNthCalledWith(
      2,
      '/app/history?q=prisms&status=ready&language=en&source=YouTube&date=30d&favorite=true&sort=title-asc',
    );
    expect(push.mock.calls.flat().join('')).not.toContain('cursor=');
  });

  it('keeps drafts local until Apply and Reset clears only the draft', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    const filterTrigger = screen.getByRole('button', {
      name: 'Filters, 5 applied',
    });
    await user.click(filterTrigger);
    const desktopPanel = screen.getByRole('region', {
      name: 'Filter results',
    });

    await user.click(
      within(desktopPanel).getByRole('checkbox', { name: 'Failed' }),
    );
    await user.click(
      within(desktopPanel).getByRole('checkbox', { name: 'Ready' }),
    );
    await user.selectOptions(
      within(desktopPanel).getByRole('combobox', { name: 'Language' }),
      '',
    );
    await user.selectOptions(
      within(desktopPanel).getByRole('combobox', { name: 'Source' }),
      '',
    );
    await user.selectOptions(
      within(desktopPanel).getByRole('combobox', { name: 'Date range' }),
      'today',
    );
    await user.click(
      within(desktopPanel).getByRole('checkbox', {
        name: 'Show favorites only',
      }),
    );
    expect(push).not.toHaveBeenCalled();

    await user.click(
      within(desktopPanel).getByRole('button', { name: 'Reset' }),
    );
    expect(push).not.toHaveBeenCalled();
    expect(
      within(desktopPanel).getByRole('checkbox', { name: 'Failed' }),
    ).not.toBeChecked();
    expect(
      within(desktopPanel).getByRole('combobox', { name: 'Language' }),
    ).toHaveValue('');
    expect(
      within(desktopPanel).getByRole('combobox', { name: 'Date range' }),
    ).toHaveValue('all');

    await user.click(
      within(desktopPanel).getByRole('checkbox', { name: 'Failed' }),
    );
    await user.selectOptions(
      within(desktopPanel).getByRole('combobox', { name: 'Date range' }),
      'today',
    );
    await user.click(
      within(desktopPanel).getByRole('button', {
        name: 'Apply filters (2)',
      }),
    );
    expect(push).toHaveBeenCalledWith(
      '/app/history?q=prisms&status=failed&date=today&sort=recent',
    );
    expect(
      screen.getByRole('button', { name: 'Filters, 5 applied' }),
    ).toBeInTheDocument();
  });

  it('Clear all preserves valid search and sort while clearing filters and cursor', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(
      screen.getByRole('button', { name: 'Filters, 5 applied' }),
    );
    await user.click(
      within(screen.getByRole('region', { name: 'Filter results' })).getByRole(
        'button',
        { name: 'Clear all' },
      ),
    );

    expect(push).toHaveBeenCalledWith('/app/history?q=prisms&sort=recent');
    expect(
      screen.getByRole('button', { name: 'Filters, 5 applied' }),
    ).toBeInTheDocument();
  });

  it('resynchronizes search and filter drafts from new query props for Back/Forward', async () => {
    const user = userEvent.setup();
    const view = renderWorkspace();
    await user.click(
      screen.getByRole('button', { name: 'Filters, 5 applied' }),
    );

    const restoredQuery: HistoryQuery = {
      ...query,
      q: 'restored',
      status: ['processing'],
      language: 'sk',
      source: null,
      date: '7d',
      favorite: false,
      cursor: null,
    };
    view.rerender(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('en')}
        initialPage={{ items: [], nextCursor: null }}
        query={restoredQuery}
        facets={{ languages: ['en', 'sk'], sources: ['YouTube'] }}
        verifiedDuplicate={null}
        actions={actions}
      />,
    );

    expect(
      screen.getByRole('searchbox', { name: 'Search history' }),
    ).toHaveValue('restored');
    await user.click(
      screen.getByRole('button', { name: 'Filters, 3 applied' }),
    );
    const restoredPanel = screen.getByRole('region', {
      name: 'Filter results',
    });
    expect(
      within(restoredPanel).getByRole('checkbox', { name: 'Processing' }),
    ).toBeChecked();
    expect(
      within(restoredPanel).getByRole('combobox', { name: 'Language' }),
    ).toHaveValue('sk');
  });

  it('never navigates from the disabled grid control and announces results politely', async () => {
    const user = userEvent.setup();
    renderWorkspace(query);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('No saved analyses');

    const grid = screen.getByRole('button', { name: 'Grid view unavailable' });
    await user.click(grid);
    expect(push).not.toHaveBeenCalled();
  });

  it.each(resultAnnouncementCases)(
    'announces the %s plural category for %d initial results',
    (locale, count, expected) => {
      render(
        <HistoryWorkspace
          copySource={injectedHistoryCopy(locale)}
          initialPage={{
            items: Array.from({ length: count }, (_, index) => ({
              ...historyItem,
              id: `history-item-${index}`,
              sourceId: `video-${index}`,
            })),
            nextCursor: null,
          }}
          query={{ ...query, q: '', status: [], cursor: null }}
          facets={{ languages: [], sources: [] }}
          actions={actions}
        />,
      );

      expect(screen.getByRole('status')).toHaveTextContent(expected);
    },
  );

  it('integrates the responsive list with real actions and shared announcements', async () => {
    const user = userEvent.setup();
    vi.mocked(actions.toggleHistoryFavorite).mockResolvedValue({
      ok: true,
      data: undefined,
    });
    render(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('en')}
        initialPage={{ items: [historyItem], nextCursor: null }}
        query={{ ...query, q: '', status: [], cursor: null }}
        facets={{ languages: [], sources: [] }}
        actions={actions}
      />,
    );

    expect(screen.getByTestId('history-desktop-list')).toBeInTheDocument();
    expect(screen.queryByTestId('history-mobile-list')).not.toBeInTheDocument();
    await user.click(
      within(screen.getByTestId('history-desktop-list')).getByRole('button', {
        name: 'Add Integrated history item to favorites',
      }),
    );
    expect(actions.toggleHistoryFavorite).toHaveBeenCalledWith({
      analysisId: historyItem.id,
      favorite: true,
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'Integrated history item added to favorites.',
    );
  });

  it.each(localeRerenderCases)(
    'replaces localized list state on an in-place en → $locale rerender and keeps load-more consistent',
    async ({
      locale,
      initialStatus,
      initialDate,
      loadedStatus,
      loadedDate,
    }) => {
      const user = userEvent.setup();
      const targetCopy = historyMessages[locale];
      const targetItem: HistoryItem = {
        ...historyItem,
        summaryPresetLabel: targetCopy.presentation.presets.deep,
        analyzedAtLabel: initialDate,
        status: { key: 'ready', label: initialStatus },
      };
      const loadedItem: HistoryItem = {
        ...targetItem,
        id: '33333333-3333-4333-8333-333333333333',
        sourceId: 'video-2',
        title: 'Localized loaded item',
        analyzedAtLabel: loadedDate,
        status: { key: 'failed', label: loadedStatus },
      };
      vi.mocked(actions.loadMoreHistory).mockResolvedValue({
        ok: true,
        data: { items: [loadedItem], nextCursor: null },
      });

      const view = render(
        <HistoryWorkspace
          copySource={injectedHistoryCopy('en')}
          initialPage={{ items: [historyItem], nextCursor: 'en-cursor' }}
          query={{ ...query, cursor: null }}
          facets={{ languages: [], sources: [] }}
          actions={actions}
        />,
      );

      view.rerender(
        <HistoryWorkspace
          copySource={{ kind: 'injected', locale, copy: targetCopy }}
          initialPage={{ items: [targetItem], nextCursor: 'localized-cursor' }}
          query={{ ...query, cursor: null }}
          facets={{ languages: [], sources: [] }}
          actions={actions}
        />,
      );

      expect(screen.getByText(initialStatus)).toBeInTheDocument();
      expect(screen.getByText(initialDate)).toBeInTheDocument();
      expect(screen.queryByText('Ready')).not.toBeInTheDocument();
      expect(screen.queryByText('Jul 24, 2026')).not.toBeInTheDocument();

      await user.click(
        screen.getByRole('button', { name: targetCopy.loadMore.action }),
      );

      expect(actions.loadMoreHistory).toHaveBeenCalledWith({
        query:
          'q=prisms&status=ready&language=en&source=YouTube&date=30d&favorite=true&sort=recent',
        cursor: 'localized-cursor',
      });
      expect(screen.getByText(loadedStatus)).toBeInTheDocument();
      expect(screen.getByText(loadedDate)).toBeInTheDocument();
      expect(screen.queryByText('Ready')).not.toBeInTheDocument();
      expect(screen.queryByText('Jul 24, 2026')).not.toBeInTheDocument();
    },
  );

  it('preserves optimistic item state across same-locale refresh rerenders', async () => {
    const user = userEvent.setup();
    vi.mocked(actions.toggleHistoryFavorite).mockResolvedValue({
      ok: true,
      data: undefined,
    });
    const props = {
      copySource: injectedHistoryCopy('en'),
      initialPage: { items: [historyItem], nextCursor: null },
      query: { ...query, q: '', status: [], cursor: null },
      facets: { languages: [], sources: [] },
      actions,
    };
    const view = render(<HistoryWorkspace {...props} />);

    await user.click(
      screen.getByRole('button', {
        name: 'Add Integrated history item to favorites',
      }),
    );
    expect(
      screen.getByRole('button', {
        name: 'Remove Integrated history item from favorites',
      }),
    ).toBeInTheDocument();

    view.rerender(<HistoryWorkspace {...props} />);

    expect(
      screen.getByRole('button', {
        name: 'Remove Integrated history item from favorites',
      }),
    ).toBeInTheDocument();
  });

  it('renders German workspace copy while preserving canonical query values', async () => {
    const user = userEvent.setup();
    render(
      <HistoryWorkspace
        copySource={injectedHistoryCopy('de')}
        initialPage={{ items: [], nextCursor: null }}
        query={query}
        facets={{ languages: ['en'], sources: ['YouTube'] }}
        verifiedDuplicate={{
          ...historyItem,
          summaryPresetLabel: 'Tiefgehend',
        }}
        actions={actions}
      />,
    );

    expect(
      screen.getByRole('heading', { name: 'Verlauf', level: 1 }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Du hast dieses Video bereits analysiert'),
    ).toBeInTheDocument();
    expect(screen.getByText(/English · Tiefgehend/u)).toBeInTheDocument();

    const search = screen.getByRole('searchbox', {
      name: 'Verlauf durchsuchen',
    });
    await user.clear(search);
    await user.type(search, 'wissen{Enter}');
    expect(push).toHaveBeenCalledWith(
      '/app/history?q=wissen&status=ready&language=en&source=YouTube&date=30d&favorite=true&sort=recent',
    );
  });
});
