import { createRef } from 'react';

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Dialog, DialogContent, DialogTrigger } from './dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './tooltip';

describe('Dialog', () => {
  it('focuses its requested control and renders accessible copy when opened', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));

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

  it('closes on Escape and returns focus to its trigger', async () => {
    render(
      <Dialog>
        <DialogTrigger>Open details</DialogTrigger>
        <DialogContent title="Video details">
          <button>Dialog action</button>
        </DialogContent>
      </Dialog>,
    );

    const trigger = screen.getByRole('button', { name: 'Open details' });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole('dialog', {
      name: 'Video details',
    });

    fireEvent.keyDown(dialog, { key: 'Escape' });

    await waitFor(() => expect(dialog).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});

describe('Tooltip', () => {
  it('appears on keyboard focus without replacing the trigger accessible name', async () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger aria-label="Copy transcript">Copy</TooltipTrigger>
          <TooltipContent>Copy to clipboard</TooltipContent>
        </Tooltip>
      </TooltipProvider>,
    );

    const trigger = screen.getByRole('button', { name: 'Copy transcript' });
    fireEvent.focus(trigger);

    expect(await screen.findByRole('tooltip')).toHaveTextContent(
      'Copy to clipboard',
    );
    expect(trigger).toHaveAccessibleName('Copy transcript');
  });
});
