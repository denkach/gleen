import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieStore, getUser, saveOnboardingStep, storage } = vi.hoisted(
  () => ({
    cookieStore: { set: vi.fn() },
    getUser: vi.fn(),
    saveOnboardingStep: vi.fn(),
    storage: {
      read: vi.fn(),
      upsert: vi.fn(),
      upsertInterfaceLocale: vi.fn(),
    },
  }),
);

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('./repository', () => ({ saveOnboardingStep }));
vi.mock('./supabase-storage', () => ({
  createSupabaseOnboardingStorage: vi.fn(() => storage),
}));

import { saveOnboardingPreferences } from './actions';

describe('onboarding actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
  });

  it('returns a stable code instead of an English message for an invalid step', async () => {
    const formData = new FormData();
    formData.set('step', '8');

    await expect(
      saveOnboardingPreferences({ status: 'idle' }, formData),
    ).resolves.toEqual({ status: 'error', code: 'invalid_step' });
  });

  it('returns a stable save code without exposing storage text', async () => {
    saveOnboardingStep.mockResolvedValue({ ok: false, code: 'storage' });
    const formData = new FormData();
    formData.set('step', '2');
    formData.set('outputLocale', 'de');

    await expect(
      saveOnboardingPreferences({ status: 'idle' }, formData),
    ).resolves.toEqual({ status: 'error', code: 'save_failed' });
  });

  it('returns the app route after completing step three', async () => {
    saveOnboardingStep.mockResolvedValue({
      ok: true,
      data: {
        interfaceLocale: 'en',
        outputLocale: 'en',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
        onboardingStep: 3,
        onboardingCompletedAt: '2026-07-12T10:00:00.000Z',
      },
    });
    const formData = new FormData();
    formData.set('step', '3');
    formData.set('summaryPreset', 'balanced');
    formData.set('flashcardPreset', '18');

    await expect(
      saveOnboardingPreferences({ status: 'idle' }, formData),
    ).resolves.toMatchObject({ status: 'success', redirectTo: '/app' });
  });

  it('advances onboarding step one after create-safe locale persistence for a first-time profile', async () => {
    storage.upsertInterfaceLocale.mockResolvedValue({
      data: { interface_locale: 'de' },
      error: null,
    });
    saveOnboardingStep.mockResolvedValue({
      ok: true,
      data: {
        interfaceLocale: 'de',
        outputLocale: 'en',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
        onboardingStep: 2,
        onboardingCompletedAt: null,
      },
    });
    const formData = new FormData();
    formData.set('step', '1');
    formData.set('interfaceLocale', 'de');

    await expect(
      saveOnboardingPreferences({ status: 'idle' }, formData),
    ).resolves.toMatchObject({ status: 'success' });

    expect(storage.upsertInterfaceLocale).toHaveBeenCalledWith('user-1', 'de');
    expect(cookieStore.set).toHaveBeenCalledWith('gleen_locale', 'de', {
      maxAge: 31_536_000,
      path: '/',
      sameSite: 'lax',
    });
    expect(saveOnboardingStep).toHaveBeenCalledWith(storage, 'user-1', {
      onboardingStep: 2,
    });
  });
});
