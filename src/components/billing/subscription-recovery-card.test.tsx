import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { refresh } = vi.hoisted(() => ({ refresh: vi.fn() }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

import { billingMessages } from '@/lib/i18n/messages/billing';
import type { SubscriptionRecoveryResult } from '@/lib/billing/subscription-recovery';

import { SubscriptionRecoveryCard } from './subscription-recovery-card';

function deferredResult() {
  let resolve: ((result: SubscriptionRecoveryResult) => void) | undefined;
  const promise = new Promise<SubscriptionRecoveryResult>((next) => {
    resolve = next;
  });
  return {
    promise,
    resolve(result: SubscriptionRecoveryResult) {
      if (!resolve) throw new Error('Recovery promise is not ready.');
      resolve(result);
    },
  };
}

describe('subscription recovery card', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the approved recovery structure and truthful support destination', () => {
    render(
      <SubscriptionRecoveryCard
        copy={billingMessages.en.subscription.error}
        locale="en"
        retryAction={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Billing details are temporarily unavailable.',
      }),
    ).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'Contact support' }),
    ).toHaveAttribute('href', 'mailto:gleen_support@gmail.com');
    expect(screen.getByText('Your account and data are safe')).toBeVisible();
    expect(screen.getByText('Not retried yet')).toBeVisible();
  });

  it('submits one retry, preserves focus, and announces another controlled failure', async () => {
    const user = userEvent.setup();
    const deferred = deferredResult();
    const retryAction = vi.fn(() => deferred.promise);
    render(
      <SubscriptionRecoveryCard
        copy={billingMessages.en.subscription.error}
        locale="en"
        now={() => new Date(2026, 7, 5, 14, 32)}
        retryAction={retryAction}
      />,
    );
    const retry = screen.getByRole('button', {
      name: 'Reload subscription details',
    });

    retry.focus();
    await user.dblClick(retry);

    expect(retryAction).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Retrying…' })).toBeDisabled();
    expect(screen.getByText(/Last attempt:.*14:32/)).toBeVisible();

    await act(async () => {
      deferred.resolve({ status: 'error', code: 'snapshot_unavailable' });
    });

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We still could not load billing details. Try again.',
    );
    expect(
      screen.getByRole('button', { name: 'Reload subscription details' }),
    ).toHaveFocus();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes the authoritative server page after recovery succeeds', async () => {
    const user = userEvent.setup();
    const retryAction = vi.fn(async () => ({ status: 'success' }) as const);
    render(
      <SubscriptionRecoveryCard
        copy={billingMessages.en.subscription.error}
        locale="en"
        retryAction={retryAction}
      />,
    );

    await user.click(
      screen.getByRole('button', { name: 'Reload subscription details' }),
    );

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(retryAction).toHaveBeenCalledOnce();
  });
});
