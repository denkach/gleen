import { createRef } from 'react';
import { readFileSync } from 'node:fs';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './tabs';

const globalStyles = readFileSync('src/app/globals.css', 'utf8');

function TestMenu({ onSelect = vi.fn() }: { onSelect?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger>Open actions</DropdownMenuTrigger>
      <DropdownMenuContent aria-label="Video actions">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onSelect={onSelect}>Summarize</DropdownMenuItem>
        <DropdownMenuItem disabled>Delete</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuCheckboxItem checked>
          Include transcript
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

describe('DropdownMenu', () => {
  it('opens, moves focus with ArrowDown, and activates an item with Enter', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<TestMenu onSelect={onSelect} />);

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    const summarize = await screen.findByRole('menuitem', {
      name: 'Summarize',
    });
    await user.keyboard('{ArrowDown}');
    expect(summarize).toHaveFocus();
    await user.keyboard('{Enter}');

    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  it('skips disabled items during keyboard movement', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(screen.getByRole('button', { name: 'Open actions' }));
    const summarize = await screen.findByRole('menuitem', {
      name: 'Summarize',
    });
    await user.keyboard('{ArrowDown}');
    expect(summarize).toHaveFocus();
    await user.keyboard('{ArrowDown}');

    expect(screen.getByRole('menuitem', { name: 'Delete' })).not.toHaveFocus();
    expect(
      screen.getByRole('menuitemcheckbox', { name: 'Include transcript' }),
    ).toHaveFocus();
  });

  it('does not activate disabled items', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger>Open protected menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem disabled onSelect={onSelect}>
            Protected action
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Open protected menu' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Protected action' }),
    );

    expect(onSelect).not.toHaveBeenCalled();
    expect(screen.getByRole('menu')).toBeVisible();
  });

  it('shows a textual check indicator for checked items', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);

    await user.click(screen.getByRole('button', { name: 'Open actions' }));

    expect(await screen.findByText('✓')).toBeVisible();
    expect(screen.getByText('✓')).toHaveAttribute('aria-hidden', 'true');
  });

  it('closes on Escape, cleans up its portal, and returns trigger focus', async () => {
    const user = userEvent.setup();
    render(<TestMenu />);
    const trigger = screen.getByRole('button', { name: 'Open actions' });

    await user.click(trigger);
    expect(await screen.findByRole('menu')).toBeVisible();
    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    expect(document.querySelector('.ui-dropdown-menu-content')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('cleans up an open portal when its tree unmounts', async () => {
    const { unmount } = render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open</DropdownMenuTrigger>
        <DropdownMenuContent>Content</DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(await screen.findByRole('menu')).toBeVisible();
    unmount();
    expect(document.querySelector('.ui-dropdown-menu-content')).toBeNull();
  });

  it('composes caller classes, native props, and forwarded refs', async () => {
    const user = userEvent.setup();
    const triggerRef = createRef<HTMLButtonElement>();
    const itemRef = createRef<HTMLDivElement>();
    render(
      <DropdownMenu>
        <DropdownMenuTrigger ref={triggerRef} className="caller-trigger">
          Open composed menu
        </DropdownMenuTrigger>
        <DropdownMenuContent className="caller-content">
          <DropdownMenuItem ref={itemRef} data-test-value="preserved">
            Item
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    expect(triggerRef.current).toHaveClass('caller-trigger');
    await user.click(triggerRef.current!);
    expect(await screen.findByRole('menu')).toHaveClass('caller-content');
    expect(itemRef.current).toHaveAttribute('data-test-value', 'preserved');
  });
});

function TestTabs() {
  return (
    <Tabs defaultValue="summary">
      <TabsList aria-label="Artifacts">
        <TabsTrigger value="summary">Summary</TabsTrigger>
        <TabsTrigger value="transcript">Transcript</TabsTrigger>
        <TabsTrigger value="export">Export</TabsTrigger>
      </TabsList>
      <TabsContent value="summary">Summary panel</TabsContent>
      <TabsContent value="transcript">Transcript panel</TabsContent>
      <TabsContent value="export">Export panel</TabsContent>
    </Tabs>
  );
}

describe('Tabs', () => {
  it('automatically activates tabs with ArrowRight and ArrowLeft', async () => {
    const user = userEvent.setup();
    render(<TestTabs />);
    const summary = screen.getByRole('tab', { name: 'Summary' });

    summary.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Transcript' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Transcript panel');

    await user.keyboard('{ArrowLeft}');
    expect(summary).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tabpanel')).toHaveTextContent('Summary panel');
  });

  it('connects every tab to its corresponding tabpanel with ARIA IDs', () => {
    render(<TestTabs />);

    for (const name of ['Summary', 'Transcript', 'Export']) {
      const tab = screen.getByRole('tab', { name });
      const panel = document.getElementById(tab.getAttribute('aria-controls')!);
      expect(panel).not.toBeNull();
      expect(panel).toHaveAttribute('role', 'tabpanel');
      expect(panel).toHaveAttribute('aria-labelledby', tab.id);
    }
  });

  it('keeps the active tabpanel keyboard focusable', () => {
    render(<TestTabs />);
    const panel = screen.getByRole('tabpanel');

    expect(panel).toHaveAttribute('tabindex', '0');
    panel.focus();
    expect(panel).toHaveFocus();
  });

  it.each([
    'neutral',
    'summary',
    'flashcards',
    'timestamps',
    'export',
  ] as const)('exposes the %s accent as semantic state', (accent) => {
    render(
      <Tabs defaultValue="one">
        <TabsList accent={accent} aria-label={`${accent} tabs`}>
          <TabsTrigger value="one">One</TabsTrigger>
        </TabsList>
        <TabsContent value="one">One panel</TabsContent>
      </Tabs>,
    );

    expect(
      screen.getByRole('tablist', { name: `${accent} tabs` }),
    ).toHaveAttribute('data-accent', accent);
  });

  it('composes native props, caller classes, and forwarded refs', () => {
    const listRef = createRef<HTMLDivElement>();
    render(
      <Tabs defaultValue="one" data-testid="tabs-root">
        <TabsList
          ref={listRef}
          className="caller-list"
          aria-label="Composed tabs"
        >
          <TabsTrigger value="one" className="caller-trigger">
            One
          </TabsTrigger>
        </TabsList>
        <TabsContent value="one" className="caller-panel">
          Panel
        </TabsContent>
      </Tabs>,
    );

    expect(screen.getByTestId('tabs-root')).toHaveAttribute(
      'data-orientation',
      'horizontal',
    );
    expect(listRef.current).toHaveClass('ui-tabs-list', 'caller-list');
    expect(screen.getByRole('tab')).toHaveClass('caller-trigger');
    expect(screen.getByRole('tabpanel')).toHaveClass('caller-panel');
  });
});

describe('navigation stylesheet contracts', () => {
  it('gives focused tab content a visible tokenized outline', () => {
    expect(globalStyles).toMatch(
      /\.ui-tabs-content:focus-visible\s*\{[^}]*outline:\s*var\(--focus-ring-width\) solid var\(--color-focus\)/,
    );
    expect(globalStyles).not.toMatch(
      /\.ui-tabs-content\s*\{[^}]*outline:\s*none/,
    );
  });

  it('contains tab overflow inside its horizontally scrollable list', () => {
    expect(globalStyles).toMatch(
      /\.ui-tabs-list\s*\{[^}]*max-width:\s*100%[^}]*overflow-x:\s*auto[^}]*overflow-y:\s*hidden/,
    );
  });

  it('removes active-indicator travel for reduced motion', () => {
    expect(globalStyles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.ui-tabs-trigger::after\s*\{[^}]*transition:\s*none/,
    );
  });

  it('keeps checked menu state visible with a rendered indicator', () => {
    expect(globalStyles).toMatch(
      /\.ui-dropdown-menu-item-indicator\s*\{[^}]*display:\s*inline-grid/,
    );
  });

  it('uses a persistent line as the active tab non-color cue', () => {
    expect(globalStyles).toMatch(
      /\.ui-tabs-trigger\[data-state='active'\]::after\s*\{[^}]*opacity:\s*1[^}]*transform:\s*scaleX\(1\)/,
    );
  });
});
