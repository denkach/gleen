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
    expect(marketingMessages.en.header).toMatchObject({
      menuTitle: 'Menu',
      menuDescription: 'Navigate Gleen and access your account.',
      closeMenu: 'Close menu',
    });
    expect(marketingMessages.ru.header.closeMenu).toBe('Закрыть меню');
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

  it('keeps canonical plan names in localized pricing copy', () => {
    expect(marketingMessages.ru.pricing.spectrum.name).toBe(
      'Погрузитесь глубже',
    );

    for (const locale of supportedLocales) {
      const pricing = marketingMessages[locale].pricing;

      expect([
        pricing.free.label,
        pricing.prism.label,
        pricing.spectrum.label,
      ]).toEqual(['Free', 'Prism', 'Spectrum']);
      expect([
        pricing.free.cta,
        pricing.prism.cta,
        pricing.spectrum.cta,
      ]).toEqual([
        expect.stringContaining('Free'),
        expect.stringContaining('Prism'),
        expect.stringContaining('Spectrum'),
      ]);
    }
  });

  it('uses native product register in the audited marketing journeys', () => {
    expect(marketingMessages.uk.workflow.signal.title).toBe('Опрацюйте відео');
    expect(marketingMessages.uk.pricing.prism.description).toBe(
      'Для студентів, дослідників і тих, хто навчається постійно.',
    );
    expect(marketingMessages.uk.facets.export.body).toBe(
      'Оберіть призначення та збережіть структуру. Експортуйте в Notion, Obsidian, NotebookLM або чистий Markdown без зайвих кроків.',
    );
    expect(marketingMessages.ru).toMatchObject({
      metadata: {
        description:
          'Превращайте любое видео YouTube в структурированный конспект, умные карточки, точные временные метки и знания, готовые к экспорту.',
      },
      hero: {
        caption:
          'Банковская карта не нужна · Попробуйте пример · Первый анализ бесплатный',
        description:
          'Превращайте любое видео YouTube в структурированный конспект, умные карточки, точные временные метки и знания, готовые к экспорту.',
        summaryFloat: 'Конспект',
      },
      workflow: { signal: { title: 'Разберите видео' } },
      facets: {
        summary: {
          kicker: 'Структурированный конспект',
          title: 'Увидьте структуру аргумента.',
          cta: 'Открыть конспект',
          demoTopbar: 'КОНСПЕКТ / СОХРАНЕНО АВТОМАТИЧЕСКИ',
        },
        flashcards: {
          body: 'Изучайте важнейшие понятия видео в удобной колоде. Переворачивайте, оценивайте, редактируйте и переходите прямо к источнику.',
        },
        timestamps: {
          firstBody: 'Почему ощущение знакомости можно спутать с пониманием.',
        },
        export: {
          body: 'Выберите назначение и сохраните структуру. Экспортируйте в Notion, Obsidian, NotebookLM или чистый Markdown без лишних шагов.',
        },
      },
      pricing: {
        prism: {
          description:
            'Для студентов, исследователей и тех, кто постоянно учится.',
        },
        description:
          'Начните бесплатно, храните каждый результат в истории и обновляйте план, только когда вашему процессу нужно больше возможностей.',
      },
    });
    expect(marketingMessages.es.workflow.signal.title).toBe('Analiza el vídeo');
    expect(marketingMessages.es.facets.summary.body).toContain(
      'conclusiones prácticas',
    );
    expect(marketingMessages.es.facets.flashcards.body).toBe(
      'Estudia los conceptos más importantes del vídeo en una baraja bien estructurada. Da la vuelta a las tarjetas, valóralas, edítalas y salta directamente a la fuente.',
    );
    expect(marketingMessages.de.workflow.signal.title).toBe('Video auswerten');
    expect(marketingMessages.de.facets.flashcards.body).toBe(
      'Lerne die wichtigsten Konzepte des Videos mit einem übersichtlichen Kartensatz. Drehe die Karten um, bewerte und bearbeite sie und springe direkt zur Quelle.',
    );
    expect(marketingMessages.de.facets.timestamps.title).toBe(
      'Navigiere nach Inhalten statt nach Minuten.',
    );
    expect(marketingMessages.de.facets.export.body).toBe(
      'Wähle das Ziel und behalte die Struktur. Exportiere direkt nach Notion, Obsidian oder NotebookLM – oder als sauberes Markdown.',
    );
  });
});
