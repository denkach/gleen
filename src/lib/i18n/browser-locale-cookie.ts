import { localeSchema, type Locale } from './locales';

export const interfaceLocaleCookieName = 'gleen_locale';
export const interfaceLocaleCookieMaxAge = 31_536_000;

export function readBrowserLocaleCookie(): Locale | null {
  if (typeof document === 'undefined') return null;

  const value = document.cookie
    .split('; ')
    .find((cookie) => cookie.startsWith(`${interfaceLocaleCookieName}=`))
    ?.slice(interfaceLocaleCookieName.length + 1);
  const parsed = localeSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function writeBrowserLocaleCookie(locale: Locale): void {
  document.cookie = `${interfaceLocaleCookieName}=${locale}; Path=/; Max-Age=${interfaceLocaleCookieMaxAge}; SameSite=Lax`;
}
