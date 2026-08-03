import { describe, expect, it } from 'vitest';

import {
  defaultLocale,
  localeMetadata,
  localeSchema,
  parseAcceptLanguage,
  supportedLocales,
  toBcp47,
} from '@/lib/i18n/locales';

describe('locale primitives', () => {
  it('exposes the five approved locales and their metadata', () => {
    expect(supportedLocales).toEqual(['uk', 'ru', 'en', 'es', 'de']);
    expect(defaultLocale).toBe('en');
    expect(localeSchema.parse('es')).toBe('es');
    expect(localeSchema.safeParse('fr').success).toBe(false);
    expect(localeMetadata.uk.nativeName).toBe('Українська');
    expect(toBcp47('uk')).toBe('uk-UA');
    expect(toBcp47('en')).toBe('en-GB');
  });

  it('chooses the highest-priority supported language from Accept-Language', () => {
    expect(parseAcceptLanguage('fr-CA, de-DE;q=0.9, en;q=0.8')).toBe('de');
    expect(parseAcceptLanguage('ES-mx;q=0.4, ru;q=0.8')).toBe('ru');
  });

  it('returns null when Accept-Language has no supported language', () => {
    expect(parseAcceptLanguage('fr-CA')).toBeNull();
    expect(parseAcceptLanguage(null)).toBeNull();
  });
});
