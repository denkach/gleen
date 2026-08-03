import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getUser, upsert } = vi.hoisted(() => ({
  getUser: vi.fn(),
  upsert: vi.fn(),
}));
const { upsertInterfaceLocale } = vi.hoisted(() => ({
  upsertInterfaceLocale: vi.fn(),
}));
const { cookieStore } = vi.hoisted(() => ({ cookieStore: { set: vi.fn() } }));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { getUser },
    from: vi.fn(() => ({
      upsert: (...args: unknown[]) => upsert(...args),
    })),
  })),
}));
vi.mock('@/lib/onboarding/supabase-storage', () => ({
  createSupabaseOnboardingStorage: vi.fn(() => ({ upsertInterfaceLocale })),
}));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }));

import { setInterfaceLocale } from '@/lib/i18n/actions';
import { setOutputLocale } from './actions';

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
});
