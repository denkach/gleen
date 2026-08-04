import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { requestLocale, receivedCopy } = vi.hoisted(() => ({
  requestLocale: { value: 'en' },
  receivedCopy: vi.fn(),
}));

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: () => Promise.resolve(requestLocale.value),
}));
vi.mock('./ui-preview', () => ({
  UiPreview: ({
    copy,
  }: {
    copy: {
      exampleTabs: Readonly<Record<string, string>>;
    };
  }) => {
    receivedCopy(copy);
    return (
      <>
        {Object.values(copy.exampleTabs).map((label) => (
          <div aria-label={label} key={label} />
        ))}
      </>
    );
  },
}));

import UiPreviewPage from './page';

const accents = [
  'neutral',
  'summary',
  'flashcards',
  'timestamps',
  'export',
] as const;

const expectedPrefixes = {
  uk: 'Приклад вкладок: ',
  ru: 'Пример вкладок: ',
  en: '',
  es: 'Pestañas de ejemplo: ',
  de: 'Beispielregister: ',
} as const;

describe('UiPreviewPage client boundary', () => {
  afterEach(() => {
    requestLocale.value = 'en';
    vi.clearAllMocks();
  });

  it.each(Object.entries(expectedPrefixes))(
    'materializes serializable localized tab labels for %s',
    async (locale, prefix) => {
      requestLocale.value = locale;
      render(await UiPreviewPage());

      const expected = Object.fromEntries(
        accents.map((accent) => [
          accent,
          locale === 'en' ? `${accent} example tabs` : `${prefix}${accent}`,
        ]),
      );
      expect(receivedCopy).toHaveBeenCalledWith(
        expect.objectContaining({ exampleTabs: expected }),
      );
      expect(
        Object.values(receivedCopy.mock.lastCall![0]).every(
          (value) => typeof value !== 'function',
        ),
      ).toBe(true);
      for (const label of Object.values(expected)) {
        expect(screen.getByLabelText(label)).toBeInTheDocument();
      }
    },
  );
});
