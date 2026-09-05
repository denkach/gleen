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
describe('integrations settings page', () => {
  it('does not render connect controls for planned integrations', async () => {
    render(await Page());
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText('Notion')).toBeVisible();
  });
});
