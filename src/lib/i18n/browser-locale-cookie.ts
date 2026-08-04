import type { Locale } from './locales';

export const interfaceLocaleCookieName = 'gleen_locale';
export const interfaceLocaleCookieMaxAge = 31_536_000;

export function writeBrowserLocaleCookie(locale: Locale): void {
  document.cookie = `${interfaceLocaleCookieName}=${locale}; Path=/; Max-Age=${interfaceLocaleCookieMaxAge}; SameSite=Lax`;
}
