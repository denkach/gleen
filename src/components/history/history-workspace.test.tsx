import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

import {
  HistoryWorkspace,
  type HistoryFilterControlsProps,
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

function renderFilters(props: HistoryFilterControlsProps) {
  return (
    <div>
      <output data-testid="draft">{JSON.stringify(props.draft)}</output>
      <button
        type="button"
        onClick={() =>
          props.onChange({
            ...props.draft,
            status: ['failed'],
            language: null,
            source: null,
            date: 'today',
            favorite: false,
          })
        }
      >
        Change draft
      </button>
      <button type="button" onClick={props.onApply}>
        Apply
      </button>
      <button type="button" onClick={props.onReset}>
        Reset
      </button>
      <button type="button" onClick={props.onClearAll}>
        Clear all
      </button>
    </div>
  );
}

function renderWorkspace(
  queryOverride: HistoryQuery = query,
  renderFiltersOverride = renderFilters,
) {
  return render(
    <HistoryWorkspace
      initialPage={{ items: [], nextCursor: null }}
      query={queryOverride}
      facets={{ languages: ['en', 'sk'], sources: ['YouTube'] }}
      verifiedDuplicate={null}
      actions={actions}
      renderFilters={renderFiltersOverride}
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

    await user.click(screen.getByRole('button', { name: 'Change draft' }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('draft')).toHaveTextContent(
      '"status":["failed"]',
    );

    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByTestId('draft')).toHaveTextContent('"status":[]');
    expect(screen.getByTestId('draft')).toHaveTextContent('"language":null');
    expect(screen.getByTestId('draft')).toHaveTextContent('"date":"all"');

    await user.click(screen.getByRole('button', { name: 'Change draft' }));
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(push).toHaveBeenCalledWith(
      '/app/history?q=prisms&status=failed&date=today&sort=recent',
    );
  });

  it('Clear all preserves valid search and sort while clearing filters and cursor', async () => {
    const user = userEvent.setup();
    renderWorkspace();

    await user.click(screen.getByRole('button', { name: 'Change draft' }));
    await user.click(screen.getByRole('button', { name: 'Clear all' }));

    expect(push).toHaveBeenCalledWith('/app/history?q=prisms&sort=recent');
  });

  it('resynchronizes search and filter drafts from new query props for Back/Forward', async () => {
    const user = userEvent.setup();
    const view = renderWorkspace();
    await user.click(screen.getByRole('button', { name: 'Change draft' }));

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
        renderFilters={renderFilters}
      />,
    );

    expect(
      screen.getByRole('searchbox', { name: 'Search history' }),
    ).toHaveValue('restored');
    expect(screen.getByTestId('draft')).toHaveTextContent(
      '"status":["processing"]',
    );
    expect(screen.getByTestId('draft')).toHaveTextContent('"language":"sk"');
  });

  it('never navigates from the disabled grid control and announces results politely', async () => {
    const user = userEvent.setup();
    renderWorkspace(query, () => <></>);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('No saved analyses');

    const grid = screen.getByRole('button', { name: 'Grid view unavailable' });
    await user.click(grid);
    expect(push).not.toHaveBeenCalled();
  });
});
