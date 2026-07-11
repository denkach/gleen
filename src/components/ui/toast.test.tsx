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
  actionLabel,
  description,
  duration,
  onAction,
  title = 'Saved to library',
  variant = 'neutral',
}: {
  actionLabel?: string;
  description?: string;
  duration?: number;
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
          actionLabel: actionLabel ?? (onAction ? 'Undo' : undefined),
          onAction,
          duration,
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

  it('keeps interactive toast content outside its Radix live announcement', async () => {
    const user = userEvent.setup();

    render(
      <ToastProvider>
        <ToastTrigger
          title="Export failed"
          description="Try again in a moment."
          variant="error"
          actionLabel="Retry export"
          onAction={() => {}}
        />
      </ToastProvider>,
    );

    await user.click(screen.getByRole('button', { name: 'Show toast' }));

    const toast = document.querySelector('.ui-toast');
    expect(toast).not.toBeNull();
    expect(toast).not.toHaveAttribute('role');
    expect(toast?.querySelector('[role="status"]')).toBeNull();
    expect(toast?.querySelectorAll('button')).toHaveLength(2);

    const announcement = await waitFor(() => {
      const status = screen
        .getAllByRole('status')
        .find((item) => item.textContent?.includes('Export failed'));
      expect(status).toBeDefined();
      return status!;
    });
    expect(announcement).toHaveAttribute('aria-live', 'assertive');
    expect(announcement).toHaveTextContent('Error');
    expect(announcement).toHaveTextContent('Export failed');
    expect(announcement).toHaveTextContent('Try again in a moment.');
    expect(announcement).toHaveTextContent('Retry export');
    expect(announcement.querySelector('button')).toBeNull();

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

  it('cleans up a pending default 5000 ms timer on unmount', () => {
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

    expect(vi.getTimerCount()).toBeGreaterThan(0);
    expect(() => unmount()).not.toThrow();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('uses a default duration of 5000 ms', () => {
    vi.useFakeTimers();

    function ImmediateToast() {
      const { toast } = useToast();
      useEffect(() => {
        toast({ title: 'Default toast' });
      }, [toast]);
      return null;
    }

    render(
      <ToastProvider>
        <ImmediateToast />
      </ToastProvider>,
    );
    act(() => vi.advanceTimersByTime(4999));
    expect(screen.getByText('Default toast')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Default toast')).not.toBeInTheDocument();
  });

  it('honors a custom duration', () => {
    vi.useFakeTimers();

    function ImmediateToast() {
      const { toast } = useToast();
      useEffect(() => {
        toast({ title: 'Quick toast', duration: 1200 });
      }, [toast]);
      return null;
    }

    render(
      <ToastProvider>
        <ImmediateToast />
      </ToastProvider>,
    );
    act(() => vi.advanceTimersByTime(1199));
    expect(screen.getByText('Quick toast')).toBeInTheDocument();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByText('Quick toast')).not.toBeInTheDocument();
  });
});
