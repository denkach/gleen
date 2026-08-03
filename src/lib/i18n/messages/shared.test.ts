import { describe, expect, it } from 'vitest';

import { supportedLocales } from '../locales';
import { sharedMessages } from './shared';

function messageKeys(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix];

  return Object.entries(value).flatMap(([key, child]) =>
    messageKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

describe('shared localization messages', () => {
  it('keeps the complete shared copy contract in every supported locale', () => {
    const englishKeys = messageKeys(sharedMessages.en).sort();

    for (const locale of supportedLocales) {
      expect(messageKeys(sharedMessages[locale]).sort()).toEqual(englishKeys);
    }
  });

  it('provides localized cross-surface accessibility and recovery labels', () => {
    expect(sharedMessages.uk.common).toMatchObject({
      skipToContent: 'Перейти до вмісту',
      help: 'Допомога',
      unavailable: 'Недоступно',
      genericError: 'Щось пішло не так. Спробуйте ще раз.',
      loading: 'Завантаження…',
    });
    expect(sharedMessages.de.common).toMatchObject({
      skipToContent: 'Zum Inhalt springen',
      help: 'Hilfe',
      unavailable: 'Nicht verfügbar',
      genericError: 'Etwas ist schiefgelaufen. Bitte versuche es noch einmal.',
      loading: 'Wird geladen…',
    });
  });

  it('provides localized secondary-route and fixture control labels', () => {
    expect(sharedMessages.es.uiPreview).toMatchObject({
      eyebrow: 'Referencia solo para el entorno de desarrollo',
      title: 'Primitivas de interfaz de Gleen',
      showErrorToast: 'Mostrar aviso de error',
      openDialog: 'Abrir diálogo de ejemplo',
      toastActionResult: 'Resultado de la acción del aviso',
    });
  });
});
