import { describe, expect, it, vi } from 'vitest';

import {
  defineMessages,
  selectMessages,
  type MissingTranslationEvent,
} from '@/lib/i18n/catalog';

const messages = defineMessages({
  en: {
    save: 'Save',
    count: (value: number) => `${value} items`,
    nested: { cancel: 'Cancel' },
  },
  uk: {
    save: 'Зберегти',
    count: (value: number) => `${value} елементів`,
    nested: { cancel: 'Скасувати' },
  },
  ru: {
    save: 'Сохранить',
    count: (value: number) => `${value} элементов`,
    nested: { cancel: 'Отмена' },
  },
  es: {
    save: 'Guardar',
    count: (value: number) => `${value} elementos`,
    nested: { cancel: 'Cancelar' },
  },
  de: {
    save: 'Speichern',
    count: (value: number) => `${value} Elemente`,
    nested: { cancel: 'Abbrechen' },
  },
});

describe('typed message catalogs', () => {
  it('selects a locale while retaining nested messages and interpolation signatures', () => {
    const selected = selectMessages(messages, 'de', 'test');

    expect(selected.save).toBe('Speichern');
    expect(selected.nested.cancel).toBe('Abbrechen');
    expect(selected.count(2)).toBe('2 Elemente');
  });

  it('throws a visible error for a missing locale catalog outside production', () => {
    const missingGerman = {
      ...messages,
      de: undefined,
    } as unknown as typeof messages;

    expect(() => selectMessages(missingGerman, 'de', 'shared')).toThrow(
      'Missing translation: shared (de)',
    );
  });

  it('reports a missing production catalog and recovers with canonical English', () => {
    const missingGerman = {
      ...messages,
      de: undefined,
    } as unknown as typeof messages;
    const reports: MissingTranslationEvent[] = [];

    vi.stubEnv('NODE_ENV', 'production');
    try {
      const selected = selectMessages(
        missingGerman,
        'de',
        'shared',
        (event) => {
          reports.push(event);
        },
      );

      expect(selected.save).toBe('Save');
      expect(reports).toEqual([
        { event: 'missing_translation', namespace: 'shared', locale: 'de' },
      ]);
    } finally {
      vi.unstubAllEnvs();
    }
  });
});

const typedMessages = defineMessages({
  en: { save: 'Save', count: (value: number) => `${value} items` },
  uk: { save: 'Зберегти', count: (value: number) => `${value} елементів` },
  ru: { save: 'Сохранить', count: (value: number) => `${value} элементов` },
  es: { save: 'Guardar', count: (value: number) => `${value} elementos` },
  de: { save: 'Speichern', count: (value: number) => `${value} Elemente` },
});

const catalogWithMissingKey = defineMessages({
  en: { save: 'Save', count: (value: number) => `${value} items` },
  // @ts-expect-error Every locale must implement the English message shape.
  uk: { save: 'Зберегти' },
  ru: { save: 'Сохранить', count: (value: number) => `${value} элементов` },
  es: { save: 'Guardar', count: (value: number) => `${value} elementos` },
  de: { save: 'Speichern', count: (value: number) => `${value} Elemente` },
});

const widenedString: string = typedMessages.en.save;
const preservedSignature: (value: number) => string = typedMessages.en.count;

// @ts-expect-error English string literals are intentionally widened.
const literalString: 'Save' = typedMessages.en.save;
// @ts-expect-error Message functions retain their interpolation parameters.
const wrongSignature: (value: string) => string = typedMessages.en.count;

void widenedString;
void preservedSignature;
void literalString;
void wrongSignature;
void catalogWithMissingKey;
