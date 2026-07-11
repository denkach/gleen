import { describe, expect, it, vi } from 'vitest';

import { getOnboardingState, saveOnboardingStep } from './repository';

const storedProfile = {
  interface_locale: 'en',
  output_locale: 'de',
  summary_preset: 'balanced',
  flashcard_preset: 18,
  onboarding_step: 2,
  onboarding_completed_at: null,
};

describe('onboarding repository', () => {
  it('refuses reads and writes without an authenticated user', async () => {
    const client = { read: vi.fn(), upsert: vi.fn() };

    await expect(getOnboardingState(client, null)).resolves.toEqual({
      ok: false,
      code: 'unauthorized',
    });
    await expect(
      saveOnboardingStep(client, null, {
        interfaceLocale: 'en',
        onboardingStep: 2,
      }),
    ).resolves.toEqual({ ok: false, code: 'unauthorized' });
    expect(client.read).not.toHaveBeenCalled();
    expect(client.upsert).not.toHaveBeenCalled();
  });

  it('maps stored snake-case fields into a validated state', async () => {
    const client = {
      read: vi.fn().mockResolvedValue({ data: storedProfile, error: null }),
      upsert: vi.fn(),
    };

    await expect(getOnboardingState(client, 'user-1')).resolves.toEqual({
      ok: true,
      data: {
        interfaceLocale: 'en',
        outputLocale: 'de',
        summaryPreset: 'balanced',
        flashcardPreset: 18,
        onboardingStep: 2,
        onboardingCompletedAt: null,
      },
    });
    expect(client.read).toHaveBeenCalledWith('user-1');
  });

  it('validates a patch before upserting only the authenticated user', async () => {
    const client = {
      read: vi.fn(),
      upsert: vi.fn().mockResolvedValue({ data: storedProfile, error: null }),
    };

    await expect(
      saveOnboardingStep(client, 'user-1', {
        outputLocale: 'fr',
        onboardingStep: 3,
      }),
    ).resolves.toEqual({ ok: false, code: 'validation' });
    expect(client.upsert).not.toHaveBeenCalled();

    await saveOnboardingStep(client, 'user-1', {
      outputLocale: 'de',
      onboardingStep: 3,
    });
    expect(client.upsert).toHaveBeenCalledWith('user-1', {
      output_locale: 'de',
      onboarding_step: 3,
    });
  });
});
