import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'en'),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));

import SettingsProfilePage from './page';

describe('settings profile page', () => {
  beforeEach(() => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'ada@example.com',
          email_confirmed_at: '2026-01-01',
          user_metadata: { full_name: 'Ada Lovelace' },
        },
      },
    });
  });

  it('renders the authenticated profile identity only', async () => {
    render(await SettingsProfilePage());
    expect(screen.getByRole('heading', { name: 'Profile' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Display name' })).toHaveValue(
      'Ada Lovelace',
    );
    expect(
      screen.queryByLabelText('Gleen controls language'),
    ).not.toBeInTheDocument();
  });
});
