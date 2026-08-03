import { beforeEach, describe, expect, it, vi } from 'vitest';

const { cookieStore, getUser, storage } = vi.hoisted(() => ({
  cookieStore: { set: vi.fn() },
  getUser: vi.fn(),
  storage: {
    upsertInterfaceLocale: vi.fn(),
  },
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock('@/lib/onboarding/supabase-storage', () => ({
  createSupabaseOnboardingStorage: vi.fn(() => storage),
}));

import { persistInterfaceLocale, setInterfaceLocale } from './actions';

describe('interface locale persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getUser.mockResolvedValue({ data: { user: { id: 'user-1' } } });
    storage.upsertInterfaceLocale.mockResolvedValue({
      data: { interface_locale: 'de' },
      error: null,
    });
  });

  it('updates only the authenticated profile interface locale before setting the cookie', async () => {
    await expect(persistInterfaceLocale('de')).resolves.toEqual({
      ok: true,
      locale: 'de',
    });

    expect(storage.upsertInterfaceLocale).toHaveBeenCalledWith('user-1', 'de');
    expect(cookieStore.set).toHaveBeenCalledWith('gleen_locale', 'de', {
      maxAge: 31_536_000,
      path: '/',
      sameSite: 'lax',
    });
    expect(storage.upsertInterfaceLocale.mock.calls.flat()).not.toContain(
      'output_locale',
    );
  });

  it('keeps the existing cookie and output preference unchanged when a profile update fails', async () => {
    storage.upsertInterfaceLocale.mockResolvedValue({
      data: null,
      error: { message: 'storage unavailable' },
    });

    await expect(persistInterfaceLocale('de')).resolves.toEqual({
      ok: false,
      code: 'profile_update_failed',
    });

    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(storage.upsertInterfaceLocale.mock.calls.flat()).not.toContain(
      'output_locale',
    );
  });

  it('keeps the existing cookie when an authenticated profile update affects no row', async () => {
    storage.upsertInterfaceLocale.mockResolvedValue({
      data: null,
      error: null,
    });

    await expect(persistInterfaceLocale('de')).resolves.toEqual({
      ok: false,
      code: 'profile_update_failed',
    });

    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  it('validates switcher input and returns a stable error code without presentation copy', async () => {
    const formData = new FormData();
    formData.set('locale', 'fr');

    await expect(
      setInterfaceLocale({ status: 'idle' }, formData),
    ).resolves.toEqual({ status: 'error', code: 'invalid_locale' });
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(storage.upsertInterfaceLocale).not.toHaveBeenCalled();
  });

  it('persists a guest selection in the cookie without touching profile storage', async () => {
    getUser.mockResolvedValue({ data: { user: null } });

    await expect(persistInterfaceLocale('es')).resolves.toEqual({
      ok: true,
      locale: 'es',
    });

    expect(cookieStore.set).toHaveBeenCalledWith('gleen_locale', 'es', {
      maxAge: 31_536_000,
      path: '/',
      sameSite: 'lax',
    });
    expect(storage.upsertInterfaceLocale).not.toHaveBeenCalled();
  });
});
