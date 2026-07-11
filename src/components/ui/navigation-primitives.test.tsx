import { createRef } from 'react';
import { readFileSync } from 'node:fs';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

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

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

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
  it('warns once when mounted without content items', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { rerender } = render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open empty menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <>
            {false}
            {null}
          </>
        </DropdownMenuContent>
      </DropdownMenu>,
    );

    await screen.findByRole('menu');
    rerender(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Open empty menu</DropdownMenuTrigger>
        <DropdownMenuContent>
          <>
            {false}
            {null}
          </>
        </DropdownMenuContent>
      </DropdownMenu>,
    );
    expect(consoleWarn).toHaveBeenCalledOnce();
    expect(consoleWarn).toHaveBeenCalledWith(
      'Gleen DropdownMenuContent must contain at least one menu part.',
    );
  });

  it('does not warn for a menu with content', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<TestMenu />);
    await userEvent
      .setup()
      .click(screen.getByRole('button', { name: 'Open actions' }));
    await screen.findByRole('menuitem', { name: 'Summarize' });
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('keeps invalid-composition diagnostics silent in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <>
        <DropdownMenu defaultOpen>
          <DropdownMenuContent />
        </DropdownMenu>
        <Tabs>
          <TabsList />
        </Tabs>
      </>,
    );
    expect(consoleWarn).not.toHaveBeenCalled();
  });
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
  it('warns once for each mounted empty Tabs and TabsList composition', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const emptyTabs = (
      <>
        <Tabs>
          <>
            {false}
            {null}
          </>
        </Tabs>
        <Tabs defaultValue="one">
          <TabsList aria-label="Empty tabs">
            <>
              {false}
              {null}
            </>
          </TabsList>
        </Tabs>
      </>
    );
    const { rerender } = render(emptyTabs);
    rerender(
      <>
        <Tabs>
          <>
            {false}
            {null}
          </>
        </Tabs>
        <Tabs defaultValue="one">
          <TabsList aria-label="Empty tabs">
            <>
              {false}
              {null}
            </>
          </TabsList>
        </Tabs>
      </>,
    );

    expect(consoleWarn).toHaveBeenCalledTimes(2);
    expect(consoleWarn).toHaveBeenCalledWith(
      'Gleen Tabs must contain a TabsList and its associated tab content.',
    );
    expect(consoleWarn).toHaveBeenCalledWith(
      'Gleen TabsList must contain at least one TabsTrigger.',
    );
  });

  it('does not warn for a valid tabs composition', () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(<TestTabs />);
    expect(consoleWarn).not.toHaveBeenCalled();
  });
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
    const triggerRef = createRef<HTMLButtonElement>();
    const contentRef = createRef<HTMLDivElement>();
    render(
      <Tabs defaultValue="one" data-testid="tabs-root">
        <TabsList
          ref={listRef}
          className="caller-list"
          aria-label="Composed tabs"
        >
          <TabsTrigger ref={triggerRef} value="one" className="caller-trigger">
            One
          </TabsTrigger>
        </TabsList>
        <TabsContent ref={contentRef} value="one" className="caller-panel">
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
    expect(triggerRef.current).toBe(screen.getByRole('tab'));
    expect(contentRef.current).toBe(screen.getByRole('tabpanel'));
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

  it('expands dialog and dropdown targets only for coarse pointers', () => {
    expect(globalStyles).toMatch(
      /@media \(pointer: coarse\)[\s\S]*\.ui-dialog-close[\s\S]*min-width:\s*var\(--control-touch-target-min\)[\s\S]*min-height:\s*var\(--control-touch-target-min\)/,
    );
    expect(globalStyles).toMatch(
      /@media \(pointer: coarse\)[\s\S]*\.ui-dropdown-menu-item[\s\S]*min-width:\s*var\(--control-touch-target-min\)[\s\S]*min-height:\s*var\(--control-touch-target-min\)/,
    );
    expect(globalStyles).toMatch(
      /\.ui-dialog-close\s*\{[^}]*width:\s*var\(--control-height-sm\)[^}]*height:\s*var\(--control-height-sm\)/,
    );
  });

  it('uses a persistent line as the active tab non-color cue', () => {
    expect(globalStyles).toMatch(
      /\.ui-tabs-trigger\[data-state='active'\]::after\s*\{[^}]*opacity:\s*1[^}]*transform:\s*scaleX\(1\)/,
    );
  });
});
