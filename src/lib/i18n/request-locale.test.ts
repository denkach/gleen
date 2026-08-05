import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  cookieStore,
  createServerSupabaseClient,
  getUser,
  readInterfaceLocale,
  requestHeaders,
} = vi.hoisted(() => ({
  cookieStore: { get: vi.fn() },
  createServerSupabaseClient: vi.fn(),
  getUser: vi.fn(),
  readInterfaceLocale: vi.fn(),
  requestHeaders: new Headers(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
  headers: vi.fn(async () => requestHeaders),
}));
vi.mock('@/lib/supabase/server', () => ({ createServerSupabaseClient }));
vi.mock('@/lib/onboarding/repository', () => ({ readInterfaceLocale }));
vi.mock('@/lib/onboarding/supabase-storage', () => ({
  createSupabaseOnboardingStorage: vi.fn(() => ({})),
}));

import { getRequestLocale, resolveInterfaceLocale } from './request-locale';

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.get.mockReturnValue(undefined);
  createServerSupabaseClient.mockResolvedValue({ auth: { getUser } });
  getUser.mockResolvedValue({ data: { user: null } });
  readInterfaceLocale.mockResolvedValue(null);
  requestHeaders.delete('accept-language');
});

describe('resolveInterfaceLocale', () => {
  it('uses a valid profile locale when the current-device cookie is absent', () => {
    expect(
      resolveInterfaceLocale({ profile: 'ru', cookie: null, header: 'es' }),
    ).toBe('ru');
  });

  it('uses the explicit current-device cookie before a stale profile locale', () => {
    expect(
      resolveInterfaceLocale({ profile: 'ru', cookie: 'de', header: 'es' }),
    ).toBe('de');
  });

  it('uses a valid locale cookie when the profile has no locale', () => {
    expect(
      resolveInterfaceLocale({ profile: null, cookie: 'de', header: 'es' }),
    ).toBe('de');
  });

  it('uses the first supported Accept-Language locale after profile and cookie', () => {
    expect(
      resolveInterfaceLocale({ profile: null, cookie: null, header: 'es-ES' }),
    ).toBe('es');
  });

  it('falls back to English when request locale values are unsupported', () => {
    expect(
      resolveInterfaceLocale({ profile: null, cookie: 'xx', header: 'fr' }),
    ).toBe('en');
  });
});

describe('getRequestLocale', () => {
  it('returns a valid current-device cookie without waiting for Supabase', async () => {
    cookieStore.get.mockReturnValue({ value: 'de' });
    requestHeaders.set('accept-language', 'es-ES');

    await expect(getRequestLocale()).resolves.toBe('de');

    expect(createServerSupabaseClient).not.toHaveBeenCalled();
    expect(getUser).not.toHaveBeenCalled();
    expect(readInterfaceLocale).not.toHaveBeenCalled();
  });
});
