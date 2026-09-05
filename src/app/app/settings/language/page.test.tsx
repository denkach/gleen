import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { getUser, read } = vi.hoisted(() => ({
  getUser: vi.fn(),
  read: vi.fn(),
}));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'en'),
}));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    from: vi.fn(() => ({
      select: vi.fn(() => ({ eq: vi.fn(() => ({ maybeSingle: read })) })),
    })),
  })),
}));

import SettingsLanguagePage from './page';

describe('settings language page', () => {
  it('loads only independent interface and output locales', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    read.mockResolvedValue({
      data: {
        interface_locale: 'de',
        output_locale: 'es',
        summary_preset: 'balanced',
        flashcard_preset: 18,
        onboarding_step: 3,
        onboarding_completed_at: null,
      },
      error: null,
    });
    render(await SettingsLanguagePage());
    expect(screen.getByLabelText('Gleen controls language')).toHaveValue('de');
    expect(
      screen.getByLabelText('Future generated content language'),
    ).toHaveValue('es');
    expect(
      screen.queryByLabelText('Default summary mode'),
    ).not.toBeInTheDocument();
  });
});
