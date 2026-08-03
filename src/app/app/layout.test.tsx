import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getOwnedSnapshot, getRequestLocale, getUser, redirect, usePathname } =
  vi.hoisted(() => ({
    getOwnedSnapshot: vi.fn(),
    getRequestLocale: vi.fn(async () => 'de'),
    getUser: vi.fn(),
    redirect: vi.fn((path: string): never => {
      throw new Error(`NEXT_REDIRECT:${path}`);
    }),
    usePathname: vi.fn(() => '/app'),
  }));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/billing/supabase-repository', () => ({
  createSupabaseBillingRepository: vi.fn(() => ({ getOwnedSnapshot })),
}));
vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));
vi.mock('next/navigation', () => ({
  redirect,
  usePathname,
  useRouter: () => ({ refresh: vi.fn() }),
}));

import AppLayout from './layout';

describe('authenticated app layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getOwnedSnapshot.mockResolvedValue({
      currentPlan: {
        id: 'prism-pro',
        slug: 'prism-pro',
        displayName: 'Prism Pro',
        description: 'For focused learners',
        analysisLimit: 25,
        features: ['25 analyses'],
        purchasable: true,
      },
      currentPrice: null,
      period: {
        startsAt: '2026-07-01T00:00:00.000Z',
        endsAt: '2026-08-01T00:00:00.000Z',
      },
      usage: { used: 17, reserved: 1, remaining: 7, limit: 25 },
      scheduledChange: null,
      paymentSummary: {
        subscriptionStatus: 'active',
        paidThrough: '2026-08-01T00:00:00.000Z',
        outstandingAmountMinor: 0,
        currency: 'usd',
      },
      recentActivity: [],
      availablePlans: [],
    });
  });

  it('redirects an unauthenticated app request to session expiry', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(AppLayout({ children: <p>Child</p> })).rejects.toThrow(
      'NEXT_REDIRECT:/session-expired',
    );
    expect(redirect).toHaveBeenCalledWith('/session-expired');
  });

  it('renders the shell with a derived authenticated identity', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'alex@example.com',
          user_metadata: { full_name: 'Alex Koval' },
        },
      },
    });

    render(await AppLayout({ children: <p>Child</p> }));

    expect(screen.getByText('Alex Koval')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(screen.getAllByText('7 Analysen übrig')).not.toHaveLength(0);
    expect(getOwnedSnapshot).toHaveBeenCalledWith(
      '22222222-2222-4222-8222-222222222222',
    );
  });

  it('keeps navigation available when the owner billing read fails', async () => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: '22222222-2222-4222-8222-222222222222',
          email: 'alex@example.com',
          user_metadata: { full_name: 'Alex Koval' },
        },
      },
    });
    getOwnedSnapshot.mockRejectedValue(new Error('billing unavailable'));

    render(await AppLayout({ children: <p>Child</p> }));

    expect(screen.getByText('Child')).toBeInTheDocument();
    expect(
      screen.getAllByText('Nutzung mit Abrechnung verfügbar'),
    ).not.toHaveLength(0);
  });
});
