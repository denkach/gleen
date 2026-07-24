import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HistoryToolbar } from './history-toolbar';
import type { HistoryQuery } from '@/lib/history/query';

const query: HistoryQuery = {
  q: 'prisms',
  status: ['ready', 'failed'],
  language: 'en',
  source: null,
  date: '7d',
  favorite: true,
  sort: 'recent',
  cursor: null,
};

describe('HistoryToolbar', () => {
  it('exposes stable toolbar, search, sort, and view-mode hooks', () => {
    const { container } = render(
      <HistoryToolbar
        query={query}
        onSearch={vi.fn()}
        onSortChange={vi.fn()}
        filterControl={<button type="button">Filters</button>}
      />,
    );

    expect(container.firstElementChild).toHaveClass('history-toolbar');
    expect(screen.getByRole('search')).toHaveClass('history-toolbar__search');
    const sort = screen.getByRole('button', { name: /sort history/i });
    expect(sort).toHaveClass('history-toolbar__sort');
    expect(
      sort.querySelector('.history-toolbar__sort-label'),
    ).toHaveTextContent('Sort: Recently opened');
    expect(screen.getByRole('group', { name: 'History view' })).toHaveClass(
      'history-toolbar__view',
    );
    expect(screen.getByRole('button', { name: 'List view' })).toHaveClass(
      'history-toolbar__view-button',
      'history-toolbar__view-button--active',
    );
    expect(
      screen.getByRole('button', { name: 'Grid view unavailable' }),
    ).toHaveClass('history-toolbar__view-button');
  });

  it('submits search on Enter and exposes every sort choice', async () => {
    const user = userEvent.setup();
    const onSearch = vi.fn();
    const onSortChange = vi.fn();

    render(
      <HistoryToolbar
        query={query}
        onSearch={onSearch}
        onSortChange={onSortChange}
        filterControl={<button type="button">Filters</button>}
      />,
    );

    const search = screen.getByRole('searchbox', { name: 'Search history' });
    expect(search).toHaveAttribute(
      'placeholder',
      'Search by title, channel, URL, or keyword',
    );
    await user.clear(search);
    await user.type(search, '  React Server Components  {Enter}');
    expect(onSearch).toHaveBeenCalledWith('React Server Components');

    await user.click(screen.getByRole('button', { name: /sort history/i }));
    for (const label of ['Newest', 'Oldest', 'Recently opened', 'A–Z', 'Z–A']) {
      expect(
        await screen.findByRole('menuitem', { name: label }),
      ).toBeInTheDocument();
    }

    await user.click(screen.getByRole('menuitem', { name: 'Oldest' }));
    expect(onSortChange).toHaveBeenCalledWith('oldest');
  });

  it('focuses search with Meta+K and Ctrl+K', async () => {
    const user = userEvent.setup();

    render(
      <HistoryToolbar
        query={query}
        onSearch={vi.fn()}
        onSortChange={vi.fn()}
        filterControl={<button type="button">Filters</button>}
      />,
    );

    const search = screen.getByRole('searchbox', { name: 'Search history' });
    await user.click(screen.getByRole('button', { name: 'List view' }));
    await user.keyboard('{Meta>}k{/Meta}');
    expect(search).toHaveFocus();

    await user.click(screen.getByRole('button', { name: 'List view' }));
    await user.keyboard('{Control>}k{/Control}');
    expect(search).toHaveFocus();
  });

  it('shows the applied filter count and truthful view controls', () => {
    render(
      <HistoryToolbar
        query={query}
        onSearch={vi.fn()}
        onSortChange={vi.fn()}
        filterControl={
          <button type="button" aria-label="Filters, 5 applied">
            Controlled filters
          </button>
        }
      />,
    );

    expect(
      screen.getByRole('button', { name: 'Filters, 5 applied' }),
    ).toHaveTextContent('Controlled filters');
    expect(screen.getAllByRole('button', { name: /filters/i })).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'List view' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    const grid = screen.getByRole('button', { name: 'Grid view unavailable' });
    expect(grid).toBeDisabled();
    expect(grid).toHaveAttribute('aria-disabled', 'true');
  });
});
