import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { getUser, read } = vi.hoisted(() => ({
  getUser: vi.fn(),
  read: vi.fn(),
}));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'en'),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: read })) })),
    })),
  })),
}));

import SettingsPreferencesPage from './page';

describe('settings preferences page', () => {
  it('loads persisted summary and flashcard defaults', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    read.mockResolvedValue({
      data: {
        interface_locale: 'en',
        output_locale: 'en',
        summary_preset: 'deep',
        flashcard_preset: 30,
        onboarding_step: 3,
        onboarding_completed_at: null,
      },
      error: null,
    });
    render(await SettingsPreferencesPage());
    expect(screen.getByLabelText('Default summary mode')).toHaveValue('deep');
    expect(screen.getByLabelText('Default flashcard count')).toHaveValue('30');
  });
});
