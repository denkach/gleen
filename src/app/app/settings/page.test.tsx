import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, getOnboardingState } = vi.hoisted(() => ({
  getUser: vi.fn(),
  getOnboardingState: vi.fn(),
}));

vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'en'),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/onboarding/repository', () => ({ getOnboardingState }));
vi.mock('@/lib/onboarding/supabase-storage', () => ({
  createSupabaseOnboardingStorage: vi.fn(() => ({})),
}));

import SettingsPage from './page';

describe('SettingsPage', () => {
  beforeEach(() => {
    getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'alex@example.com',
          email_confirmed_at: '2026-01-01T00:00:00.000Z',
          user_metadata: { full_name: 'Alex Koval' },
          app_metadata: { provider: 'email' },
          identities: [{ provider: 'email' }],
        },
      },
    });
    getOnboardingState.mockResolvedValue({
      ok: true,
      data: {
        interfaceLocale: 'en',
        outputLocale: 'uk',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
      },
    });
  });

  it('composes truthful account summaries from authenticated state', async () => {
    render(await SettingsPage());

    expect(screen.getByText('Alex Koval · Verified email')).toBeVisible();
    expect(screen.getByText('Balanced · 18 cards')).toBeVisible();
    expect(screen.getByText('English · Українська output')).toBeVisible();
    expect(screen.getByText('Email sign-in')).toBeVisible();
  });

  it('degrades preference-owned cards without hiding account-owned cards', async () => {
    getOnboardingState.mockResolvedValue({ ok: false });
    render(await SettingsPage());

    expect(screen.getByText('Alex Koval · Verified email')).toBeVisible();
    expect(screen.getByText('Preferences unavailable')).toBeVisible();
    expect(screen.getByText('Language settings unavailable')).toBeVisible();
  });
});
