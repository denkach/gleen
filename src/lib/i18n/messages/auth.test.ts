import { describe, expect, it } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

import { authErrorMessage, authMessages } from './auth';

function messagePaths(value: unknown, path = ''): string[] {
  if (typeof value === 'string' || typeof value === 'function') return [path];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    messagePaths(child, path ? `${path}.${key}` : key),
  );
}

describe('authMessages', () => {
  it('provides every authentication message for each supported locale', () => {
    const englishPaths = messagePaths(authMessages.en).sort();

    expect(Object.keys(authMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    for (const locale of supportedLocales) {
      expect(messagePaths(authMessages[locale]).sort()).toEqual(englishPaths);
    }
  });

  it('maps stable error codes to localized German messages', () => {
    expect(authErrorMessage(authMessages.de, 'email_invalid')).toBe(
      'Gib eine gültige E-Mail-Adresse ein.',
    );
    expect(authErrorMessage(authMessages.de, 'invalid_credentials')).toBe(
      'E-Mail-Adresse oder Passwort ist falsch.',
    );
    expect(authErrorMessage(authMessages.de, 'unknown_provider_code')).toBe(
      'Die Anfrage konnte nicht abgeschlossen werden. Bitte versuche es erneut.',
    );
  });
});
