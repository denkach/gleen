import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRequestLocale, getUser, read } = vi.hoisted(() => ({
  getRequestLocale: vi.fn(async () => 'en'),
  getUser: vi.fn(),
  read: vi.fn(),
}));

vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));
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

import SettingsProfilePage from './page';

describe('settings profile page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    read.mockResolvedValue({
      data: {
        interface_locale: 'de',
        output_locale: 'es',
        summary_preset: 'balanced',
        flashcard_preset: 18,
        onboarding_step: 3,
        onboarding_completed_at: '2026-08-01T00:00:00.000Z',
      },
      error: null,
    });
  });

  it('passes separately persisted interface and output locales to language preferences', async () => {
    render(await SettingsProfilePage());

    expect(screen.getByLabelText('Gleen controls language')).toHaveValue('de');
    expect(
      screen.getByLabelText('Future generated content language'),
    ).toHaveValue('es');
  });

  it('keeps both forms disabled and shows a localized retry state when profile storage fails', async () => {
    read.mockResolvedValue({
      data: null,
      error: { message: 'storage unavailable' },
    });

    render(await SettingsProfilePage());

    expect(screen.getByRole('alert')).toHaveTextContent(
      'We could not load your language preferences.',
    );
    expect(screen.getByRole('link', { name: 'Try again' })).toHaveAttribute(
      'href',
      '/app/settings/profile',
    );
    expect(
      screen.getByRole('button', { name: 'Save interface language' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'Save output language' }),
    ).toBeDisabled();
  });

  it('keeps first-time profiles editable with the successful default preferences', async () => {
    read.mockResolvedValue({ data: null, error: null });

    render(await SettingsProfilePage());

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByLabelText('Gleen controls language')).toHaveValue('en');
    expect(
      screen.getByRole('button', { name: 'Save output language' }),
    ).toBeEnabled();
  });
});
