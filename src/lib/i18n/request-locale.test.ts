import { describe, expect, it } from 'vitest';

import { resolveInterfaceLocale } from './request-locale';

describe('resolveInterfaceLocale', () => {
  it('uses a valid profile locale before every request fallback', () => {
    expect(
      resolveInterfaceLocale({ profile: 'ru', cookie: 'de', header: 'es' }),
    ).toBe('ru');
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
