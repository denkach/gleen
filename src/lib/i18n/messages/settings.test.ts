import { describe, expect, it } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

import { materializeSettingsClientCopy, settingsMessages } from './settings';

describe('settings messages', () => {
  it('materializes a serializable client boundary without formatter functions', () => {
    const copy = materializeSettingsClientCopy(settingsMessages.en);

    expect(() => structuredClone(copy)).not.toThrow();
    expect(copy.atlas).not.toHaveProperty('summaries');
  });

  it('provides language-preference copy for every supported interface locale', () => {
    for (const locale of ['uk', 'ru', 'en', 'es', 'de'] as const) {
      expect(
        settingsMessages[locale].language.interface.description,
      ).toBeTruthy();
      expect(settingsMessages[locale].language.output.description).toBeTruthy();
      expect(settingsMessages[locale].language.output.description).toMatch(
        /future|майбут|будущ|futuro|künftig/i,
      );
      expect(
        Object.keys(settingsMessages[locale].summary.modes).sort(),
      ).toEqual(['balanced', 'compact', 'deep']);
      expect(
        settingsMessages[locale].language.errors.invalid_summary_mode,
      ).toBeTruthy();
      expect(settingsMessages[locale].atlas.navigationLabel).toBeTruthy();
      expect(settingsMessages[locale].atlas.back).toBeTruthy();
      expect(Object.keys(settingsMessages[locale].atlas.destinations)).toEqual([
        'profile',
        'preferences',
        'language',
        'integrations',
        'security',
        'data',
      ]);
      for (const destination of Object.values(
        settingsMessages[locale].atlas.destinations,
      )) {
        expect(destination.title).toBeTruthy();
        expect(destination.description).toBeTruthy();
        expect(destination.unavailable).toBeTruthy();
      }
    }
  });

  it('describes Compact, Balanced, and Deep natively in every locale', () => {
    for (const locale of supportedLocales) {
      for (const mode of ['compact', 'balanced', 'deep'] as const) {
        expect(settingsMessages[locale].summary.modes[mode]).toMatchObject({
          title: expect.any(String),
          description: expect.any(String),
        });
      }
    }
    expect(settingsMessages.en.summary.modes.compact.description).toBe(
      'The shortest useful version with the main conclusions and important caveats.',
    );
    expect(settingsMessages.en.summary.modes.balanced.description).toContain(
      'default',
    );
    expect(settingsMessages.en.summary.modes.deep.description).toContain(
      'study-ready',
    );
  });

  it('uses natural Spanish and German language-setting descriptions', () => {
    expect(settingsMessages.es.page.description).toBe(
      'Elige idiomas para Gleen y para los nuevos materiales.',
    );
    expect(settingsMessages.de.language.interface.description).toBe(
      'Ändert die Sprache der Gleen-Steuerelemente und der Navigation.',
    );
  });
});
