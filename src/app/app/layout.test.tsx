import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, redirect, usePathname } = vi.hoisted(() => ({
  getUser: vi.fn(),
  redirect: vi.fn((path: string): never => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
  usePathname: vi.fn(() => '/app'),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('next/navigation', () => ({ redirect, usePathname }));

import AppLayout from './layout';

describe('authenticated app layout', () => {
  beforeEach(() => vi.clearAllMocks());

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
          email: 'alex@example.com',
          user_metadata: { full_name: 'Alex Koval' },
        },
      },
    });

    render(await AppLayout({ children: <p>Child</p> }));

    expect(screen.getByText('Alex Koval')).toBeInTheDocument();
    expect(screen.getByText('Child')).toBeInTheDocument();
  });
});
