import { describe, expect, it } from 'vitest';

import { settingsMessages } from './settings';

describe('settings messages', () => {
  it('provides language-preference copy for every supported interface locale', () => {
    for (const locale of ['uk', 'ru', 'en', 'es', 'de'] as const) {
      expect(
        settingsMessages[locale].language.interface.description,
      ).toBeTruthy();
      expect(settingsMessages[locale].language.output.description).toBeTruthy();
      expect(settingsMessages[locale].language.output.description).toMatch(
        /future|майбут|будущ|futuro|künftig/i,
      );
    }
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
