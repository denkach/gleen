import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, upsert } = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
}));
const { updateUser } = vi.hoisted(() => ({ updateUser: vi.fn() }));
const { saveOnboardingStep } = vi.hoisted(() => ({
  saveOnboardingStep: vi.fn(),
}));
const { upsertInterfaceLocale } = vi.hoisted(() => ({
  upsertInterfaceLocale: vi.fn(),
}));
const { cookieStore } = vi.hoisted(() => ({ cookieStore: { set: vi.fn() } }));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser, updateUser },
    from: vi.fn(() => ({
      upsert: (...args: unknown[]) => upsert(...args),
    })),
  })),
}));
vi.mock('@/lib/onboarding/supabase-storage', () => ({
  createSupabaseOnboardingStorage: vi.fn(() => ({ upsertInterfaceLocale })),
}));
vi.mock('@/lib/onboarding/repository', () => ({ saveOnboardingStep }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }));

import { setInterfaceLocale } from '@/lib/i18n/actions';
import {
  setDisplayName,
  setFlashcardPreset,
  setOutputLocale,
  setSummaryMode,
} from './actions';

describe('output locale persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    upsertInterfaceLocale.mockResolvedValue({
      data: { interface_locale: 'de' },
      error: null,
    });
    upsert.mockReturnValue({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({ data: {}, error: null }),
      })),
    });
    updateUser.mockResolvedValue({ data: {}, error: null });
    saveOnboardingStep.mockResolvedValue({ ok: true, data: {} });
  });

  it('validates and saves a trimmed display name through auth metadata only', async () => {
    const invalid = new FormData();
    invalid.set('displayName', '   ');
    await expect(setDisplayName({ status: 'idle' }, invalid)).resolves.toEqual({
      status: 'error',
      code: 'invalid_display_name',
      value: '   ',
    });

    const tooLong = new FormData();
    tooLong.set('displayName', 'x'.repeat(101));
    await expect(
      setDisplayName({ status: 'idle' }, tooLong),
    ).resolves.toMatchObject({
      status: 'error',
      code: 'invalid_display_name',
    });

    const valid = new FormData();
    valid.set('displayName', '  Ada Lovelace  ');
    await expect(setDisplayName({ status: 'idle' }, valid)).resolves.toEqual({
      status: 'success',
      value: 'Ada Lovelace',
    });
    expect(updateUser).toHaveBeenCalledWith({
      data: { full_name: 'Ada Lovelace' },
    });
  });

  it('saves flashcard count without sending a summary default', async () => {
    const formData = new FormData();
    formData.set('flashcardPreset', '30');

    await expect(
      setFlashcardPreset({ status: 'idle' }, formData),
    ).resolves.toEqual({ status: 'success', count: 30 });
    expect(saveOnboardingStep).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      { flashcardPreset: 30 },
    );
    expect(saveOnboardingStep).not.toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      expect.objectContaining({ summaryPreset: expect.anything() }),
    );
  });

  it('writes exactly the selected output locale without changing interface locale', async () => {
    const formData = new FormData();
    formData.set('locale', 'es');

    await expect(
      setOutputLocale({ status: 'idle' }, formData),
    ).resolves.toEqual({
      status: 'success',
      locale: 'es',
    });

    expect(upsert).toHaveBeenCalledWith(
      { user_id: 'user-1', output_locale: 'es' },
      { onConflict: 'user_id' },
    );
    expect(upsert.mock.calls.flat()).not.toContain('interface_locale');
  });

  it('keeps the interface action isolated to the interface locale field', async () => {
    const formData = new FormData();
    formData.set('locale', 'de');

    await expect(
      setInterfaceLocale({ status: 'idle' }, formData),
    ).resolves.toEqual({
      status: 'success',
      locale: 'de',
    });

    expect(upsertInterfaceLocale).toHaveBeenCalledWith('user-1', 'de');
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects locales outside the five approved choices without writing a profile', async () => {
    const formData = new FormData();
    formData.set('locale', 'fr');

    await expect(
      setOutputLocale({ status: 'idle' }, formData),
    ).resolves.toEqual({
      status: 'error',
      code: 'invalid_locale',
    });

    expect(upsert).not.toHaveBeenCalled();
  });

  it('saves a canonical account summary mode', async () => {
    const formData = new FormData();
    formData.set('summaryMode', 'deep');

    await expect(setSummaryMode({ status: 'idle' }, formData)).resolves.toEqual(
      {
        status: 'success',
        mode: 'deep',
      },
    );
    expect(saveOnboardingStep).toHaveBeenCalledWith(
      expect.any(Object),
      'user-1',
      { summaryPreset: 'deep' },
    );
  });

  it('rejects legacy summary modes at the account write boundary', async () => {
    const formData = new FormData();
    formData.set('summaryMode', 'detailed');

    await expect(setSummaryMode({ status: 'idle' }, formData)).resolves.toEqual(
      {
        status: 'error',
        code: 'invalid_summary_mode',
      },
    );
    expect(upsert).not.toHaveBeenCalled();
  });

  it('maps summary mode authentication and storage failures to safe codes', async () => {
    const formData = new FormData();
    formData.set('summaryMode', 'compact');
    getUser.mockResolvedValueOnce({ data: { user: null } });

    await expect(setSummaryMode({ status: 'idle' }, formData)).resolves.toEqual(
      { status: 'error', code: 'session_expired' },
    );

    getUser.mockResolvedValueOnce({ data: { user: { id: 'user-1' } } });
    saveOnboardingStep.mockResolvedValueOnce({ ok: false, code: 'storage' });

    await expect(setSummaryMode({ status: 'idle' }, formData)).resolves.toEqual(
      { status: 'error', code: 'profile_update_failed' },
    );
  });
});
