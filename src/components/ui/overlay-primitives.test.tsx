import { createRef } from 'react';

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from './dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Dialog', () => {
  it('preserves supported native props, asChild composition, and refs on public parts', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    const titleRef = createRef<HTMLHeadingElement>();
    render(
      <Dialog>
        <DialogTrigger ref={triggerRef} data-contract="trigger">
          Open API dialog
        </DialogTrigger>
        <DialogContent title="API dialog" description="API description">
          Content
        </DialogContent>
        <DialogTitle ref={titleRef}>Standalone title contract</DialogTitle>
        <DialogDescription data-contract="description">
          Standalone description
        </DialogDescription>
        <DialogClose asChild>
          <button type="button">Standalone close</button>
        </DialogClose>
      </Dialog>,
    );

    expect(triggerRef.current).toHaveAttribute('data-contract', 'trigger');
    expect(titleRef.current).toHaveTextContent('Standalone title contract');
    expect(
      screen.getByRole('button', { name: 'Standalone close' }),
    ).toBeInTheDocument();
  });
  it('uses resolvable Radix description IDs without console diagnostics', async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <Dialog>
        <DialogTrigger>Open described dialog</DialogTrigger>
        <DialogContent
          title="Described dialog"
          description="Wrapper description"
        >
          Content
        </DialogContent>
      </Dialog>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Open described dialog' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'Described dialog',
    });
    const descriptionIds =
      dialog.getAttribute('aria-describedby')?.split(' ') ?? [];

    expect(descriptionIds).toHaveLength(1);
    expect(descriptionIds[0]).toMatch(/^radix-/);
    expect(descriptionIds.every((id) => document.getElementById(id))).toBe(
      true,
    );
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('focuses its requested control and renders accessible copy when opened', async () => {
    const user = userEvent.setup();
    const initialFocusRef = createRef<HTMLButtonElement>();

    render(
      <Dialog>
        <DialogTrigger>Open settings</DialogTrigger>
        <DialogContent
          title="Export settings"
          description="Choose where to send this artifact."
          initialFocusRef={initialFocusRef}
        >
          <button ref={initialFocusRef}>Choose destination</button>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Open settings' }));

    expect(
      await screen.findByRole('dialog', { name: 'Export settings' }),
    ).toHaveAccessibleDescription('Choose where to send this artifact.');
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'Choose destination' }),
      ).toHaveFocus(),
    );
    expect(screen.getByRole('button', { name: 'Close dialog' })).toBeVisible();
  });

  it('uses default initial focus and contains forward and reverse tabbing', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open focus test</DialogTrigger>
        <DialogContent title="Focus test">
          <button>First action</button>
          <button>Last action</button>
        </DialogContent>
      </Dialog>,
    );

    await user.click(screen.getByRole('button', { name: 'Open focus test' }));
    const firstAction = screen.getByRole('button', { name: 'First action' });
    const close = screen.getByRole('button', { name: 'Close dialog' });
    await waitFor(() => expect(firstAction).toHaveFocus());

    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.tab();
    expect(firstAction).toHaveFocus();
  });

  it('closes on Escape and returns focus to its trigger', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open details</DialogTrigger>
        <DialogContent title="Video details">
          <button>Dialog action</button>
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Open details' });
    await user.click(trigger);
    const dialog = await screen.findByRole('dialog', {
      name: 'Video details',
    });

    await user.keyboard('{Escape}');

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes from its labeled close button, removes its portal, and returns focus', async () => {
    const user = userEvent.setup();

    render(
      <Dialog>
        <DialogTrigger>Open close test</DialogTrigger>
        <DialogContent title="Close test">Content</DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Open close test' });
    await user.click(trigger);
    await user.click(screen.getByRole('button', { name: 'Close dialog' }));

    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument(),
    );
    expect(document.querySelector('.ui-dialog-overlay')).toBeNull();
    expect(document.querySelector('.ui-dialog-content')).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('removes open portal content when its tree unmounts', async () => {
    const { unmount } = render(
      <Dialog defaultOpen>
        <DialogTrigger>Open unmount test</DialogTrigger>
        <DialogContent title="Unmount test">Content</DialogContent>
      </Dialog>,
    );

    expect(
      await screen.findByRole('dialog', { name: 'Unmount test' }),
    ).toBeVisible();
    unmount();

    expect(document.querySelector('.ui-dialog-overlay')).toBeNull();
    expect(document.querySelector('.ui-dialog-content')).toBeNull();
  });

  it('omits dangling description references and warns when no description is provided', async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <Dialog>
        <DialogTrigger>Open no description</DialogTrigger>
        <DialogContent title="No description">Content</DialogContent>
      </Dialog>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Open no description' }),
    );
    const dialog = await screen.findByRole('dialog', {
      name: 'No description',
    });

    expect(dialog).not.toHaveAttribute('aria-describedby');
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).toHaveBeenCalledOnce();
    expect(consoleWarn).toHaveBeenCalledWith(
      'Gleen DialogContent requires a description or an aria-describedby value that resolves to mounted content.',
    );
  });

  it('warns when a caller description reference does not resolve', async () => {
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <Dialog defaultOpen>
        <DialogContent
          title="Missing external description"
          aria-describedby="missing-description"
        >
          Content
        </DialogContent>
      </Dialog>,
    );

    await screen.findByRole('dialog', { name: 'Missing external description' });
    expect(consoleWarn).toHaveBeenCalledOnce();
    expect(consoleWarn).toHaveBeenCalledWith(
      'Gleen DialogContent requires a description or an aria-describedby value that resolves to mounted content.',
    );
  });

  it('keeps missing-description diagnostics silent in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(
      <Dialog defaultOpen>
        <DialogContent title="Production dialog">Content</DialogContent>
      </Dialog>,
    );
    await screen.findByRole('dialog', { name: 'Production dialog' });
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it('preserves a caller description reference when no wrapper description is provided', async () => {
    const user = userEvent.setup();
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <>
        <p id="external-dialog-description">External context</p>
        <Dialog>
          <DialogTrigger>Open external description</DialogTrigger>
          <DialogContent
            title="External description"
            aria-describedby="external-dialog-description"
          >
            Content
          </DialogContent>
        </Dialog>
      </>,
    );

    await user.click(
      screen.getByRole('button', { name: 'Open external description' }),
    );

    const dialog = await screen.findByRole('dialog', {
      name: 'External description',
    });
    const descriptionIds =
      dialog.getAttribute('aria-describedby')?.split(' ') ?? [];

    expect(dialog).toHaveAccessibleDescription('External context');
    expect(descriptionIds).toEqual(['external-dialog-description']);
    expect(descriptionIds.every((id) => document.getElementById(id))).toBe(
      true,
    );
    expect(consoleWarn).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });
});

describe('Tooltip', () => {
  it('preserves trigger refs, native props, and asChild composition', () => {
    const triggerRef = createRef<HTMLButtonElement>();
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild ref={triggerRef}>
            <button type="button" data-contract="tooltip-trigger">
              Tooltip API
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" align="start">
            API content
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    expect(triggerRef.current).toHaveAttribute(
      'data-contract',
      'tooltip-trigger',
    );
  });
  it('appears on keyboard focus without replacing the trigger accessible name', async () => {
    const user = userEvent.setup();

    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger aria-label="Copy transcript">Copy</TooltipTrigger>
          <TooltipContent>Copy to clipboard</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    await user.tab();
    const trigger = screen.getByRole('button', { name: 'Copy transcript' });

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Copy to clipboard',
    );
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAccessibleName('Copy transcript');
  });

  it('removes tooltip portal content after keyboard blur and unmount', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>Tooltip trigger</TooltipTrigger>
          <TooltipContent>Helpful context</TooltipContent>
        </Tooltip>
        <button>Next control</button>
      </TooltipProvider>,
    );

    await user.tab();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Helpful context',
    );
    await user.tab();
    await waitFor(() =>
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
    );

    await user.tab({ shift: true });
    expect(await screen.findByRole('tooltip')).toBeVisible();
    unmount();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    expect(document.querySelector('.ui-tooltip-content')).toBeNull();
  });
});
