import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HistoryFilters } from './history-filters';
import type { HistoryFilterDraft } from './history-workspace';

const initialDraft: HistoryFilterDraft = {
  status: ['ready'],
  language: 'en',
  source: null,
  date: '7d',
  favorite: false,
};

function stubMobileHistoryViewport() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query === '(max-width: 720px)',
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
}

afterEach(() => vi.unstubAllGlobals());

function FiltersHarness({
  onApply = vi.fn(),
  onClearAll = vi.fn(),
  onReset = vi.fn(),
}: Readonly<{
  onApply?: () => void;
  onClearAll?: () => void;
  onReset?: () => void;
}>) {
  const [draft, setDraft] = useState(initialDraft);
  const [open, setOpen] = useState(false);

  return (
    <HistoryFilters
      draft={draft}
      facets={{
        languages: ['en', 'sk'],
        sources: ['YouTube', 'Vimeo'],
      }}
      open={open}
      onOpenChange={setOpen}
      onChange={setDraft}
      onApply={onApply}
      onReset={() => {
        setDraft({
          status: [],
          language: null,
          source: null,
          date: 'all',
          favorite: false,
        });
        onReset();
      }}
      onClearAll={onClearAll}
    />
  );
}

describe('HistoryFilters', () => {
  it('owns one desktop trigger and exposes the complete labeled filter set', async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    const trigger = screen.getByRole('button', {
      name: 'Filters, 3 applied',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const panel = screen.getByRole('region', { name: 'Filter results' });
    expect(trigger).toHaveAttribute('aria-controls', panel.id);
    expect(
      within(panel).getAllByRole('checkbox', {
        name: /Ready|Processing|Failed/,
      }),
    ).toHaveLength(3);
    expect(
      within(panel).getByRole('combobox', { name: 'Language' }),
    ).toHaveValue('en');
    expect(within(panel).getByRole('combobox', { name: 'Source' })).toHaveValue(
      '',
    );
    expect(
      within(panel).getByRole('combobox', { name: 'Date range' }),
    ).toHaveValue('7d');
    expect(
      within(panel).getByRole('checkbox', { name: 'Show favorites only' }),
    ).not.toBeChecked();
  });

  it('dismisses the desktop panel on Escape and outside pointer, restoring focus', async () => {
    const user = userEvent.setup();
    render(<FiltersHarness />);

    const trigger = screen.getByRole('button', {
      name: 'Filters, 3 applied',
    });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(
      screen.queryByRole('region', { name: 'Filter results' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());

    await user.click(trigger);
    await user.pointer({ target: document.body, keys: '[MouseLeft]' });
    expect(
      screen.queryByRole('region', { name: 'Filter results' }),
    ).not.toBeInTheDocument();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('updates a persistent unapplied draft and wires Reset, Clear all, and Apply count', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onClearAll = vi.fn();
    const onReset = vi.fn();
    render(
      <FiltersHarness
        onApply={onApply}
        onClearAll={onClearAll}
        onReset={onReset}
      />,
    );

    const trigger = screen.getByRole('button', {
      name: 'Filters, 3 applied',
    });
    await user.click(trigger);
    let panel = screen.getByRole('region', { name: 'Filter results' });
    await user.click(
      within(panel).getByRole('checkbox', { name: 'Processing' }),
    );
    await user.selectOptions(
      within(panel).getByRole('combobox', { name: 'Source' }),
      'YouTube',
    );
    expect(
      within(panel).getByRole('button', { name: 'Apply filters (5)' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(trigger).toHaveAccessibleName('Filters, 3 applied');
    await user.click(trigger);
    panel = screen.getByRole('region', { name: 'Filter results' });
    expect(
      within(panel).getByRole('checkbox', { name: 'Processing' }),
    ).toBeChecked();
    expect(within(panel).getByRole('combobox', { name: 'Source' })).toHaveValue(
      'YouTube',
    );

    await user.click(within(panel).getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(
      within(panel).getByRole('button', { name: 'Apply filters (0)' }),
    ).toBeInTheDocument();

    await user.click(within(panel).getByRole('button', { name: 'Clear all' }));
    expect(onClearAll).toHaveBeenCalledOnce();

    await user.click(
      within(panel).getByRole('button', { name: 'Apply filters (0)' }),
    );
    expect(onApply).toHaveBeenCalledOnce();
  });

  it('renders an accessible mobile Dialog sheet with its approved copy and affordance', async () => {
    stubMobileHistoryViewport();
    const user = userEvent.setup();
    render(<FiltersHarness />);

    const mobileTrigger = await screen.findByRole('button', {
      name: 'Filter, 3 applied',
    });
    await user.click(mobileTrigger);

    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(sheet).toHaveClass('history-filters__mobile-sheet');
    expect(
      within(sheet).getByTestId('history-filters-drag-affordance'),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole('button', { name: 'Apply filters (3)' }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('3 filters applied')).toBeInTheDocument();
  });
});
