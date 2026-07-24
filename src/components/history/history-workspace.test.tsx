import { render, screen, within } from '@testing-library/react';
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
};

function renderWorkspace(queryOverride: HistoryQuery = query) {
  return render(
    <HistoryWorkspace
      initialPage={{ items: [], nextCursor: null }}
      query={queryOverride}
      facets={{ languages: ['en', 'sk'], sources: ['YouTube'] }}
      verifiedDuplicate={null}
      actions={actions}
    />,
  );
}

beforeEach(() => vi.clearAllMocks());

describe('HistoryWorkspace URL state', () => {
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
});
