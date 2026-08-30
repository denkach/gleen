import { describe, expect, it } from 'vitest';

import { supportedLocales } from '@/lib/i18n/locales';

import { onboardingErrorMessage, onboardingMessages } from './onboarding';

function messagePaths(value: unknown, path = ''): string[] {
  if (typeof value === 'string' || typeof value === 'function') return [path];
  if (!value || typeof value !== 'object') return [];

  return Object.entries(value).flatMap(([key, child]) =>
    messagePaths(child, path ? `${path}.${key}` : key),
  );
}

describe('onboardingMessages', () => {
  it('provides every onboarding message for each supported locale', () => {
    const englishPaths = messagePaths(onboardingMessages.en).sort();

    expect(Object.keys(onboardingMessages).sort()).toEqual(
      [...supportedLocales].sort(),
    );
    for (const locale of supportedLocales) {
      expect(messagePaths(onboardingMessages[locale]).sort()).toEqual(
        englishPaths,
      );
      expect(
        Object.keys(onboardingMessages[locale].presets.summaryModes).sort(),
      ).toEqual(['balanced', 'compact', 'deep']);
    }
  });

  it('keeps representative Ukrainian onboarding copy available', () => {
    expect(onboardingMessages.uk.steps.interface.title).toBe('Мова інтерфейсу');
    expect(onboardingMessages.uk.steps.output.title).toBe('Мова результатів');
    expect(onboardingMessages.uk.presets.summaryModes.compact.title).toBe(
      'Компактний конспект',
    );
    expect(onboardingMessages.uk.presets.summaryModes.deep.title).toBe(
      'Глибокий конспект',
    );
    expect(onboardingMessages.uk.actions.continue).toBe('Продовжити');
    expect(onboardingErrorMessage(onboardingMessages.uk, 'save_failed')).toBe(
      'Не вдалося зберегти налаштування. Спробуйте ще раз.',
    );
  });

  it('describes independent defaults in native onboarding language', () => {
    expect(onboardingMessages.uk.shell.visualDescription).toBe(
      'Встановіть мову та налаштування результатів за замовчуванням, щоб Gleen працював для вас.',
    );
    expect(onboardingMessages.uk.steps.output.description).toBe(
      'Окремо виберіть мову за замовчуванням для створеного контенту.',
    );
    expect(onboardingMessages.uk.steps.preferences.description).toBe(
      'Виберіть налаштування за замовчуванням для нового аналізу. Їх можна змінювати для кожного відео.',
    );
    expect(onboardingMessages.ru.shell.visualDescription).toBe(
      'Задайте язык и параметры результатов по умолчанию, чтобы настроить Gleen под себя.',
    );
    expect(onboardingMessages.ru.steps.output.description).toBe(
      'Отдельно выберите язык создаваемого контента по умолчанию.',
    );
    expect(onboardingMessages.ru.steps.preferences.description).toBe(
      'Выберите параметры по умолчанию для нового анализа. Их можно менять для каждого видео.',
    );
    expect(onboardingMessages.es.shell.visualDescription).toBe(
      'Configura el idioma y los resultados predeterminados para adaptar Gleen a tus necesidades.',
    );
    expect(onboardingMessages.es.presets.summaryModes.deep.description).toBe(
      'Una explicación completa para estudiar, con estructura y ejemplos relevantes',
    );
    expect(onboardingMessages.es.presets.flashcards18.description).toBe(
      'Una baraja de estudio bien estructurada',
    );
    expect(onboardingMessages.de.shell.visualDescription).toBe(
      'Lege Sprache und Standardeinstellungen für Ergebnisse fest, damit Gleen zu deinem Werkzeug wird.',
    );
    expect(onboardingMessages.de.presets.flashcards18.description).toBe(
      'Ein kompakter Lernkartenstapel',
    );
  });
});
