import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getOwnedSnapshot, getUser } = vi.hoisted(() => ({
  getOwnedSnapshot: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
  })),
}));

vi.mock('./supabase-repository', () => ({
  createSupabaseBillingRepository: vi.fn(() => ({ getOwnedSnapshot })),
}));

import { retrySubscriptionSnapshot } from './subscription-recovery';

describe('subscription snapshot recovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    getOwnedSnapshot.mockResolvedValue({ entitlement: { plan: 'prism' } });
  });

  it('retries the authenticated owner snapshot without returning billing data', async () => {
    await expect(retrySubscriptionSnapshot()).resolves.toEqual({
      status: 'success',
    });
    expect(getOwnedSnapshot).toHaveBeenCalledExactlyOnceWith('user-1');
  });

  it('returns a controlled failure without exposing the repository exception', async () => {
    getOwnedSnapshot.mockRejectedValueOnce(
      new Error('stripe_customer_secret cus_private'),
    );

    const result = await retrySubscriptionSnapshot();

    expect(result).toEqual({
      status: 'error',
      code: 'snapshot_unavailable',
    });
    expect(JSON.stringify(result)).not.toContain('cus_private');
  });

  it('does not read billing data after the session expires', async () => {
    getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(retrySubscriptionSnapshot()).resolves.toEqual({
      status: 'error',
      code: 'session_expired',
    });
    expect(getOwnedSnapshot).not.toHaveBeenCalled();
  });
});
