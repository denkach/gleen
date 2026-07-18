import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const getUser = vi.fn();
const read = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: async () => ({
    auth: { getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: read }) }) }),
  }),
}));

import AppPage from './page';

describe('AppPage', () => {
  beforeEach(() => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    read.mockResolvedValue({
      data: {
        interface_locale: 'en',
        output_locale: 'es',
        summary_preset: 'detailed',
        flashcard_preset: 30,
        onboarding_step: 3,
        onboarding_completed_at: '2026-07-12T00:00:00.000Z',
      },
      error: null,
    });
  });

  test('loads authenticated profile defaults for the intake form', async () => {
    render(await AppPage());
    expect(screen.getByLabelText('YouTube URL')).toBeEnabled();
    expect(screen.getByDisplayValue('es')).toBeInTheDocument();
  });
});
