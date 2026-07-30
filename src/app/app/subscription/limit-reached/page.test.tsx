import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getOwnedSnapshot, getUser, redirect, renderLimitScreen } = vi.hoisted(
  () => ({
    getOwnedSnapshot: vi.fn(),
    getUser: vi.fn(),
    redirect: vi.fn((path: string): never => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
    renderLimitScreen: vi.fn(),
  }),
);

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));
vi.mock('@/lib/billing/supabase-repository', () => ({
  createSupabaseBillingRepository: () => ({ getOwnedSnapshot }),
}));
vi.mock('@/lib/billing/presentation', () => ({
  toSubscriptionPresentation: (snapshot: unknown) => ({
    snapshot,
    usage: { used: 25, reserved: 0, remaining: 0, limit: 25 },
  }),
}));
vi.mock('@/components/billing/limit-reached-screen', () => ({
  LimitReachedScreen: (props: unknown) => {
    renderLimitScreen(props);
    return <h1>Analysis limit reached</h1>;
  },
}));

import LimitReachedPage from './page';

describe('LimitReachedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'owner-1' } } });
    getOwnedSnapshot.mockResolvedValue({ ownerScoped: true });
  });

  it('redirects unauthenticated requests before reading billing', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(LimitReachedPage()).rejects.toThrow(
      'NEXT_REDIRECT:/session-expired',
    );
    expect(getOwnedSnapshot).not.toHaveBeenCalled();
  });

  it('renders only the authenticated owner snapshot', async () => {
    render(await LimitReachedPage());

    expect(getOwnedSnapshot).toHaveBeenCalledWith('owner-1');
    expect(renderLimitScreen).toHaveBeenCalledWith(
      expect.objectContaining({
        presentation: expect.objectContaining({
          snapshot: { ownerScoped: true },
        }),
      }),
    );
    expect(screen.getByRole('heading', { name: 'Analysis limit reached' }));
  });
});
