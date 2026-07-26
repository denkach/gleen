import { act, render, screen, waitFor, within } from '@testing-library/react';
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

function stubHistoryViewport(initialMobile: boolean) {
  let mobile = initialMobile;
  const listeners = new Set<() => void>();
  const addEventListener = vi.fn(
    (_type: string, listener: () => void) => void listeners.add(listener),
  );
  const removeEventListener = vi.fn(
    (_type: string, listener: () => void) => void listeners.delete(listener),
  );

  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      get matches() {
        return query === '(max-width: 720px)' && mobile;
      },
      media: query,
      addEventListener,
      removeEventListener,
    })),
  );

  return {
    addEventListener,
    removeEventListener,
    setMobile(nextMobile: boolean) {
      mobile = nextMobile;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
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
      appliedCount={3}
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
    stubHistoryViewport(false);
    const user = userEvent.setup();
    render(<FiltersHarness />);

    const trigger = screen.getByRole('button', {
      name: 'Filters, 3 applied',
    });
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    const filterIcon = trigger.querySelector('.history-control-icon--filter');
    expect(filterIcon).toBeInstanceOf(SVGElement);
    expect(filterIcon).toHaveAttribute('viewBox', '0 0 24 24');
    expect(filterIcon).toHaveAttribute('fill', 'none');
    expect(filterIcon).toHaveAttribute('stroke', 'currentColor');
    expect(filterIcon).toHaveAttribute('stroke-width', '1.5');
    expect(filterIcon).toHaveAttribute('stroke-linecap', 'round');
    expect(filterIcon).toHaveAttribute('stroke-linejoin', 'round');
    expect(filterIcon).toHaveAttribute('aria-hidden', 'true');
    expect(filterIcon).toHaveAttribute('focusable', 'false');
    expect(filterIcon?.querySelector('path')).toHaveAttribute(
      'd',
      'M3 5h18l-7 8v5l-4 2v-7L3 5Z',
    );

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    const panel = screen.getByRole('region', { name: 'Filter results' });
    expect(panel).toHaveClass(
      'history-filters__desktop-panel',
      'history-filter-panel',
    );
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-history-filter-presentation]'),
    ).toHaveLength(1);
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
    stubHistoryViewport(false);
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
    stubHistoryViewport(false);
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
    expect(trigger).toHaveAccessibleName('Filters, 3 applied');
  });

  it('renders one accessible mobile Dialog with shared controls and draft-derived Apply count', async () => {
    stubHistoryViewport(true);
    const user = userEvent.setup();
    render(<FiltersHarness />);

    const mobileTrigger = await screen.findByRole('button', {
      name: 'Filter, 3 applied',
    });
    await user.click(mobileTrigger);

    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    expect(sheet).toHaveClass(
      'history-filters__mobile-sheet',
      'history-filter-sheet',
    );
    expect(
      within(sheet).getByTestId('history-filters-drag-affordance'),
    ).toBeInTheDocument();
    expect(
      within(sheet).getByRole('button', { name: 'Apply filters (3)' }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('3 filters applied')).toBeInTheDocument();
    expect(
      document.querySelectorAll('[data-history-filter-presentation]'),
    ).toHaveLength(1);
    expect(
      within(sheet).getAllByRole('checkbox', {
        name: /Ready|Processing|Failed/,
      }),
    ).toHaveLength(3);
    expect(
      within(sheet).getByRole('combobox', { name: 'Language' }),
    ).toHaveValue('en');
    expect(within(sheet).getByRole('combobox', { name: 'Source' })).toHaveValue(
      '',
    );
    expect(
      within(sheet).getByRole('combobox', { name: 'Date range' }),
    ).toHaveValue('7d');
    expect(
      within(sheet).getByRole('checkbox', { name: 'Show favorites only' }),
    ).not.toBeChecked();

    await user.click(
      within(sheet).getByRole('checkbox', { name: 'Processing' }),
    );
    await user.selectOptions(
      within(sheet).getByRole('combobox', { name: 'Source' }),
      'YouTube',
    );
    await user.click(
      within(sheet).getByRole('checkbox', { name: 'Show favorites only' }),
    );
    expect(
      within(sheet).getByRole('button', { name: 'Apply filters (6)' }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('3 filters applied')).toBeInTheDocument();
  });

  it('keeps the mobile applied note committed until props change and Reset clears only the draft', async () => {
    stubHistoryViewport(true);
    const user = userEvent.setup();
    const onApply = vi.fn();
    const onReset = vi.fn();
    render(<FiltersHarness onApply={onApply} onReset={onReset} />);

    const trigger = await screen.findByRole('button', {
      name: 'Filter, 3 applied',
    });
    await user.click(trigger);
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    await user.click(
      within(sheet).getByRole('checkbox', { name: 'Processing' }),
    );
    await user.click(
      within(sheet).getByRole('button', { name: 'Apply filters (4)' }),
    );

    expect(onApply).toHaveBeenCalledOnce();
    expect(within(sheet).getByText('3 filters applied')).toBeInTheDocument();
    expect(trigger).toHaveAccessibleName('Filter, 3 applied');

    await user.click(within(sheet).getByRole('button', { name: 'Reset' }));
    expect(onReset).toHaveBeenCalledOnce();
    expect(
      within(sheet).getByRole('button', { name: 'Apply filters (0)' }),
    ).toBeInTheDocument();
    expect(within(sheet).getByText('3 filters applied')).toBeInTheDocument();
  });

  it('dismisses mobile filters with Escape and restores focus to its trigger', async () => {
    stubHistoryViewport(true);
    const user = userEvent.setup();
    render(<FiltersHarness />);

    const trigger = await screen.findByRole('button', {
      name: 'Filter, 3 applied',
    });
    await user.click(trigger);
    expect(
      await screen.findByRole('dialog', { name: 'Filters' }),
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Filters' }),
      ).not.toBeInTheDocument(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it('mounts only the active surface across viewport changes without duplicate ids', async () => {
    const viewport = stubHistoryViewport(false);
    const user = userEvent.setup();
    const view = render(<FiltersHarness />);

    await user.click(
      screen.getByRole('button', { name: 'Filters, 3 applied' }),
    );
    const desktopPanel = screen.getByRole('region', {
      name: 'Filter results',
    });
    const desktopIds = [
      ...view.container.querySelectorAll<HTMLElement>('[id]'),
    ].map((element) => element.id);
    expect(new Set(desktopIds).size).toBe(desktopIds.length);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    viewport.setMobile(true);

    expect(
      screen.queryByRole('region', { name: 'Filter results' }),
    ).not.toBeInTheDocument();
    expect(desktopPanel).not.toBeInTheDocument();
    const sheet = await screen.findByRole('dialog', { name: 'Filters' });
    const allIds = [...document.querySelectorAll<HTMLElement>('[id]')].map(
      (element) => element.id,
    );
    expect(new Set(allIds).size).toBe(allIds.length);
    expect(
      document.querySelectorAll('[data-history-filter-presentation]'),
    ).toHaveLength(1);
    expect(
      within(sheet).getByRole('combobox', { name: 'Language' }),
    ).toBeInTheDocument();
  });

  it('removes its matchMedia listener on unmount', () => {
    const viewport = stubHistoryViewport(false);
    const view = render(<FiltersHarness />);

    expect(viewport.addEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
    const listener = viewport.addEventListener.mock.calls[0]?.[1];
    view.unmount();
    expect(viewport.removeEventListener).toHaveBeenCalledWith(
      'change',
      listener,
    );
  });
});
