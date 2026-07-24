import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const getUser = vi.fn();
const listOwnedHistory = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({ auth: { getUser } }),
}));

vi.mock('@/lib/analysis-pipeline/supabase-repository', () => ({
  createSupabaseAnalysisRepository: () => ({ listOwnedHistory }),
}));

import HistoryPage from './page';

describe('HistoryPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    listOwnedHistory.mockResolvedValue([
      {
        id: 'active',
        title: 'Active',
        status: 'running',
        updatedAt: '2026-07-18T12:00:00Z',
      },
      {
        id: 'partial',
        title: 'Partial',
        status: 'partial',
        updatedAt: '2026-07-18T11:00:00Z',
      },
      {
        id: 'complete',
        title: 'Complete',
        status: 'complete',
        updatedAt: '2026-07-18T10:00:00Z',
      },
      {
        id: 'failed',
        title: 'Failed',
        status: 'failed',
        updatedAt: '2026-07-18T09:00:00Z',
      },
    ]);
  });

  test('renders owned active and terminal entries with their correct routes', async () => {
    render(await HistoryPage());

    expect(
      screen.getByRole('link', { name: /Active Processing/ }),
    ).toHaveAttribute('href', '/app?analysis=active');
    expect(
      screen.getByRole('link', { name: /Partial Partial/ }),
    ).toHaveAttribute('href', '/app/video/partial');
    expect(
      screen.getByRole('link', { name: /Complete Complete/ }),
    ).toHaveAttribute('href', '/app/video/complete');
    expect(screen.getByRole('link', { name: /Failed Failed/ })).toHaveAttribute(
      'href',
      '/app?analysis=failed',
    );
    expect(listOwnedHistory).toHaveBeenCalledWith('user-1', 50);
  });
});
