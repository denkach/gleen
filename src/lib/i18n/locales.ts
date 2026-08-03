import { z } from 'zod';

export const supportedLocales = ['uk', 'ru', 'en', 'es', 'de'] as const;

export const localeSchema = z.enum(supportedLocales);

export type Locale = z.infer<typeof localeSchema>;

export const defaultLocale: Locale = 'en';

export const localeMetadata = {
  uk: { bcp47: 'uk-UA', nativeName: 'Українська' },
  ru: { bcp47: 'ru-RU', nativeName: 'Русский' },
  en: { bcp47: 'en-GB', nativeName: 'English' },
  es: { bcp47: 'es-ES', nativeName: 'Español' },
  de: { bcp47: 'de-DE', nativeName: 'Deutsch' },
} as const satisfies Record<Locale, { bcp47: string; nativeName: string }>;

export function toBcp47(locale: Locale): string {
  return localeMetadata[locale].bcp47;
}

export function parseAcceptLanguage(
  header: string | null | undefined,
): Locale | null {
  if (!header) return null;

  const candidates = header
    .split(',')
    .map((entry, index) => {
      const [languageRange, ...parameters] = entry.trim().split(';');
      const qualityParameter = parameters.find((parameter) =>
        parameter.trim().toLowerCase().startsWith('q='),
      );
      const quality = qualityParameter
        ? Number.parseFloat(qualityParameter.trim().slice(2))
        : 1;
      const locale = languageRange?.trim().toLowerCase().split('-')[0];

      return { index, locale, quality };
    })
    .filter(
      (candidate) =>
        Number.isFinite(candidate.quality) && candidate.quality > 0,
    )
    .sort(
      (left, right) => right.quality - left.quality || left.index - right.index,
    );

  for (const candidate of candidates) {
    const parsed = localeSchema.safeParse(candidate.locale);
    if (parsed.success) return parsed.data;
  }

  return null;
}
