import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn(async () => ({
    data: { user: { id: 'u1', app_metadata: { provider: 'google' } } },
  })),
}));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'en'),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
import Page from './page';
describe('security settings page', () => {
  it('shows the real auth provider', async () => {
    render(await Page());
    expect(screen.getByText('Google')).toBeVisible();
    expect(screen.queryByText(/sessions/i)).not.toBeInTheDocument();
  });
});
