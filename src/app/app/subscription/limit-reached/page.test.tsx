import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getOwnedSnapshot,
  getRequestLocale,
  getUser,
  redirect,
  renderLimitScreen,
} = vi.hoisted(() => ({
  getOwnedSnapshot: vi.fn(),
  getRequestLocale: vi.fn(),
  getUser: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  renderLimitScreen: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect }));
vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));
vi.mock('@/lib/billing/supabase-repository', () => ({
  createSupabaseBillingRepository: () => ({ getOwnedSnapshot }),
}));
vi.mock('@/lib/billing/presentation', () => ({
  toLimitReachedPresentation: (snapshot: {
    usage: { used: number; reserved: number; remaining: number; limit: number };
  }) => ({
    snapshot,
    usage: snapshot.usage,
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
    getRequestLocale.mockResolvedValue('en');
    getOwnedSnapshot.mockResolvedValue({
      ownerScoped: true,
      usage: { used: 9, reserved: 1, remaining: 0, limit: 10 },
    });
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
          snapshot: {
            ownerScoped: true,
            usage: { used: 9, reserved: 1, remaining: 0, limit: 10 },
          },
        }),
        locale: 'en',
        copy: expect.objectContaining({
          limitReached: expect.objectContaining({
            title: 'Analysis limit reached',
          }),
        }),
      }),
    );
    expect(screen.getByRole('heading', { name: 'Analysis limit reached' }));
  });

  it.each([
    { used: 2, reserved: 1, remaining: 7, limit: 10 },
    { used: 0, reserved: 0, remaining: 10, limit: 10 },
    { used: 0, reserved: 0, remaining: 0, limit: 0 },
  ])(
    'redirects a non-exhausted owner snapshot to subscription',
    async (usage) => {
      getOwnedSnapshot.mockResolvedValue({ ownerScoped: true, usage });

      await expect(LimitReachedPage()).rejects.toThrow(
        'NEXT_REDIRECT:/app/subscription',
      );
      expect(redirect).toHaveBeenCalledWith('/app/subscription');
      expect(renderLimitScreen).not.toHaveBeenCalled();
    },
  );
});
