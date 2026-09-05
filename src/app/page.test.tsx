import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

const { requestLocale, receivedLocaleSwitcherCopy } = vi.hoisted(() => ({
  requestLocale: { value: 'de' },
  receivedLocaleSwitcherCopy: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: () => Promise.resolve(requestLocale.value),
}));
vi.mock('@/components/i18n/locale-switcher', () => ({
  LocaleSwitcher: ({
    copy,
    locale,
  }: {
    copy: {
      localeSwitcher: { label: string };
    };
    locale: 'uk' | 'ru' | 'en' | 'es' | 'de';
  }) => {
    receivedLocaleSwitcherCopy(copy);
    const nativeName = {
      uk: 'Українська',
      ru: 'Русский',
      en: 'English',
      es: 'Español',
      de: 'Deutsch',
    }[locale];
    return (
      <button
        type="button"
        aria-label={`${copy.localeSwitcher.label}: ${nativeName}`}
      />
    );
  },
}));

import HomePage, { generateMetadata } from './page';

describe('HomePage', () => {
  afterEach(() => {
    requestLocale.value = 'de';
    vi.clearAllMocks();
  });

  it.each([
    ['uk', 'Українська'],
    ['ru', 'Русский'],
    ['en', 'English'],
    ['es', 'Español'],
    ['de', 'Deutsch'],
  ] as const)(
    'passes only exact serializable locale-switcher strings for %s',
    async (locale, nativeName) => {
      requestLocale.value = locale;
      render(await HomePage());

      const received = receivedLocaleSwitcherCopy.mock.lastCall![0];
      expect(Object.keys(received)).toEqual(['localeSwitcher']);
      expect(Object.keys(received.localeSwitcher).sort()).toEqual([
        'changedTemplate',
        'close',
        'errors',
        'label',
        'panelDescription',
        'panelTitle',
        'quickSwitch',
        'selected',
      ]);
      expect(
        Object.values(received.localeSwitcher).every(
          (value) => typeof value !== 'function',
        ),
      ).toBe(true);
      expect(
        screen.getByRole('button', { name: new RegExp(nativeName) }),
      ).toBeVisible();
    },
  );

  it('renders the complete German marketing surface selected on the server', async () => {
    const user = userEvent.setup();
    render(await HomePage());

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Weniger schauen.Mehr verstehen.',
      }),
    ).toBeVisible();
    expect(screen.getByRole('navigation')).toHaveTextContent('Produkt');
    expect(screen.getByRole('navigation')).toHaveTextContent(
      'So funktioniert es',
    );
    expect(screen.getByRole('navigation')).toHaveTextContent('Beispiele');
    expect(screen.getByRole('navigation')).toHaveTextContent('Preise');
    const header = screen.getByRole('banner');
    expect(
      within(header).getByRole('button', { name: 'Sprache: Deutsch' }),
    ).toBeVisible();
    expect(
      within(header).getByRole('link', { name: 'Kostenlos starten' }),
    ).toHaveAttribute('href', '/sign-up');
    await user.click(
      within(header).getByRole('button', { name: 'Menü öffnen' }),
    );
    const menu = await screen.findByRole('dialog', { name: 'Menü' });
    expect(
      within(menu).getByRole('link', { name: 'Anmelden' }),
    ).toHaveAttribute('href', '/sign-in');
    expect(
      within(menu).getByRole('link', { name: 'Kostenlos starten' }),
    ).toHaveAttribute('href', '/sign-up');
    await user.keyboard('{Escape}');
    expect(screen.getByText('Der Prisma-Workflow')).toBeVisible();
    expect(screen.getByText('Zusammenfassung mit Struktur')).toBeVisible();
    expect(screen.getByText('Interaktive Karteikarten')).toBeVisible();
    expect(screen.getByText('Klickbare Zeitstempel')).toBeVisible();
    expect(screen.getByText('Wissen für den Export')).toBeVisible();
    expect(screen.getByText('Einfache Pläne')).toBeVisible();
    expect(screen.getByRole('contentinfo')).toHaveTextContent(
      'KI-generierte Inhalte sollten mit der Originalquelle abgeglichen werden.',
    );
    expect(screen.getByRole('textbox', { name: 'YouTube-URL' })).toBeVisible();
  });

  it('uses the selected locale for document metadata', async () => {
    const metadata = await generateMetadata();

    expect(metadata.title).toBe('Gleen — Weniger schauen. Mehr verstehen.');
    expect(metadata.description).toBe(
      'Verwandle jedes YouTube-Video in eine strukturierte Zusammenfassung, intelligente Karteikarten, präzise Zeitstempel und exportfertiges Wissen.',
    );
  });

  it('keeps the Ukrainian native language name, CTA, and menu available for the compact header layout', async () => {
    requestLocale.value = 'uk';
    render(await HomePage());

    const header = screen.getByRole('banner');
    expect(
      within(header).getByRole('button', { name: 'Мова: Українська' }),
    ).toBeVisible();
    expect(
      within(header).getByRole('link', { name: 'Почати безкоштовно' }),
    ).toBeVisible();
    expect(
      within(header).getByRole('button', { name: 'Відкрити меню' }),
    ).toHaveClass('btn-icon');
  });
});
