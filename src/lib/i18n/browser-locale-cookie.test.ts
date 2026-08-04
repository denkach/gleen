import { expect, it, vi } from 'vitest';

import { writeBrowserLocaleCookie } from './browser-locale-cookie';

it('writes the validated one-year current-device locale cookie', () => {
  writeBrowserLocaleCookie('de');
  expect(document.cookie).toContain('gleen_locale=de');
});

it('uses the same path, max age, and SameSite policy as the server action', () => {
  const setter = vi.spyOn(Document.prototype, 'cookie', 'set');
  writeBrowserLocaleCookie('es');
  expect(setter).toHaveBeenCalledWith(
    'gleen_locale=es; Path=/; Max-Age=31536000; SameSite=Lax',
  );
});
