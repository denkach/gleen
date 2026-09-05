import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
const { getUser } = vi.hoisted(() => ({
  getUser: vi.fn(async () => ({ data: { user: { id: 'u1' } } })),
}));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'en'),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
import Page from './page';
describe('data settings page', () => {
  it('links to history without exposing unsafe deletion', async () => {
    render(await Page());
    expect(screen.getByRole('link', { name: 'Open history' })).toHaveAttribute(
      'href',
      '/app/history',
    );
    expect(
      screen.queryByRole('button', { name: /delete/i }),
    ).not.toBeInTheDocument();
  });
});
