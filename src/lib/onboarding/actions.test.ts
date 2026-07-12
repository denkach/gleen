import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, saveOnboardingStep, storage } = vi.hoisted(() => ({
  getUser: vi.fn(),
  saveOnboardingStep: vi.fn(),
  storage: { read: vi.fn(), upsert: vi.fn() },
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
});
