import { useEffect } from 'react';

import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ToastProvider, useToast } from './toast';

function ToastTrigger({
  description,
  onAction,
  title = 'Saved to library',
  variant = 'neutral',
}: {
  description?: string;
  onAction?: () => void;
  title?: string;
  variant?: 'neutral' | 'success' | 'error';
}) {
  const { toast } = useToast();

  return (
    <button
      onClick={() =>
        toast({
          title,
          description,
          variant,
          actionLabel: onAction ? 'Undo' : undefined,
          onAction,
        })
      }
    >
      Show toast
    </button>
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe('ToastProvider', () => {
  it('throws a useful error when useToast is called outside the provider', () => {
    expect(() => render(<ToastTrigger />)).toThrow(
      'useToast must be used within ToastProvider',
    );
  });

  it('announces its title and description and exposes non-color variant state', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTrigger
          title="Export failed"
          description="Try again in a moment."
          variant="error"
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Show toast' }));

    const toast = await screen.findByRole('status');
    expect(toast).toHaveTextContent('Export failed');
    expect(toast).toHaveTextContent('Try again in a moment.');
    expect(toast).toHaveTextContent('Error');
    expect(toast).toHaveAttribute('data-variant', 'error');
  });

  it('keeps multiple toasts in insertion order', async () => {
    function QueueTrigger() {
      const { toast } = useToast();
      return (
        <button
          onClick={() => {
            toast({ title: 'First toast' });
            toast({ title: 'Second toast', variant: 'success' });
          }}
        >
          Queue toasts
        </button>
      );
    }
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <QueueTrigger />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Queue toasts' }));

    await screen.findByText('First toast');
    expect(
      [...document.querySelectorAll('.ui-toast')].map(
        (item) => item.textContent,
      ),
    ).toEqual([
      expect.stringContaining('First toast'),
      expect.stringContaining('Second toast'),
    ]);
  });

  it('invokes its action and can be dismissed', async () => {
    const onAction = vi.fn();
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTrigger onAction={onAction} />
      </ToastProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    expect(onAction).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(screen.queryByText('Saved to library')).not.toBeInTheDocument(),
    );

    await user.click(screen.getByRole('button', { name: 'Show toast' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Dismiss notification' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('Saved to library')).not.toBeInTheDocument(),
    );
  });

  it('uses a 5000 ms default duration and cleans up on unmount', async () => {
    vi.useFakeTimers();

    function ImmediateToast() {
      const { toast } = useToast();
      useEffect(() => {
        toast({ title: 'Temporary toast' });
      }, [toast]);
      return null;
    }

    const { unmount } = render(
      <ToastProvider>
        <ImmediateToast />
      </ToastProvider>,
    );
    expect(screen.getByText('Temporary toast')).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByText('Temporary toast')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Temporary toast')).not.toBeInTheDocument();

    expect(() => unmount()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });
});
