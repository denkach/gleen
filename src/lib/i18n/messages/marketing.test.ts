import { describe, expect, it } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

import { marketingMessages } from './marketing';

function messagePaths(value: unknown, path = ''): string[] {
  if (typeof value === 'string') return [path];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    messagePaths(child, path ? `${path}.${key}` : key),
  );
}

describe('marketingMessages', () => {
  it('provides every marketing message for each supported locale', () => {
    const englishPaths = messagePaths(marketingMessages.en).sort();

    expect(Object.keys(marketingMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    for (const locale of supportedLocales) {
      expect(messagePaths(marketingMessages[locale]).sort()).toEqual(
        englishPaths,
      );
    }
  });

  it('keeps representative native marketing copy available', () => {
    expect(marketingMessages.uk.hero.titleStart).toBe('Дивіться менше.');
    expect(marketingMessages.uk.hero.titleEnd).toBe('Розумійте більше.');
    expect(
      `${marketingMessages.uk.hero.titleStart} ${marketingMessages.uk.hero.titleEnd}`,
    ).toBe('Дивіться менше. Розумійте більше.');
    expect(marketingMessages.uk.hero).not.toHaveProperty('title');
    expect(marketingMessages.ru.header.signIn).toBe('Войти');
    expect(marketingMessages.es.header.pricing).toBe('Precios');
    expect(marketingMessages.de.hero.submit).toBe('Video umwandeln');
  });
});
