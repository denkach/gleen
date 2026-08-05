import fs from 'node:fs';
import path from 'node:path';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { unavailableUsage } from '@/lib/app-shell';
import { writeBrowserLocaleCookie } from '@/lib/i18n/browser-locale-cookie';
import { appMessages } from '@/lib/i18n/messages/app';
import { sharedMessages } from '@/lib/i18n/messages/shared';

import { AppShell } from './app-shell';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname,
  useRouter: () => ({ refresh: vi.fn() }),
}));

const identity = {
  displayName: 'Alex Koval',
  email: 'alex@example.com',
  initials: 'AK',
} as const;

describe('AppShell', () => {
  beforeEach(() => usePathname.mockReturnValue('/app/history'));
  afterEach(() => vi.restoreAllMocks());

  test('renders the responsive navigation and account shell in German', () => {
    render(
      <AppShell
        copy={appMessages.de}
        identity={identity}
        locale="de"
        localeSwitcherCopy={sharedMessages.de}
        usage={unavailableUsage}
      >
        <h1>Verlaufsseite</h1>
      </AppShell>,
    );

    expect(
      screen.getByRole('link', { name: 'Zum Inhalt springen' }),
    ).toHaveAttribute('href', '#app-content');
    expect(
      screen.getByRole('navigation', { name: 'Anwendungsnavigation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Mobile Navigation' }),
    ).toBeInTheDocument();
    const historyLinks = screen.getAllByRole('link', { name: 'Verlauf' });
    expect(historyLinks).toHaveLength(2);
    for (const historyLink of historyLinks) {
      expect(historyLink).toHaveAttribute('aria-current', 'page');
      expect(historyLink).toHaveClass('active');
    }

    const unavailableControls = [
      screen.getByRole('button', { name: 'Support' }),
      ...screen.getAllByRole('button', { name: 'Benachrichtigungen' }),
    ];
    expect(
      screen.getAllByRole('button', { name: 'Benachrichtigungen' }),
    ).toHaveLength(2);
    for (const control of unavailableControls) {
      expect(control).toBeDisabled();
      expect(control).toHaveAttribute(
        'aria-describedby',
        'app-shell-unavailable-description',
      );
    }
    expect(
      document.getElementById('app-shell-unavailable-description'),
    ).toHaveTextContent('In dieser Version nicht verfügbar');
    expect(
      screen.getAllByRole('button', { name: 'Sprache: Deutsch' }),
    ).toHaveLength(2);
    expect(
      within(document.querySelector('.mobile-topbar') as HTMLElement).getByRole(
        'button',
        { name: 'Sprache: Deutsch' },
      ),
    ).toHaveClass('locale-switcher__trigger--compact');
    expect(
      within(document.querySelector('.mobile-topbar') as HTMLElement).getByRole(
        'button',
        { name: 'Benachrichtigungen' },
      ),
    ).toBeDisabled();
    expect(screen.getByText('Arbeitsbereich')).toBeInTheDocument();
    expect(screen.getByText('Hilfe')).toBeInTheDocument();
    expect(screen.getByText('Alex Koval')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(
      screen.queryByText(/18|25|Prism plan|August 01/),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText('Nutzung mit Abrechnung verfügbar').length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'app-content');
  });

  test.each([
    ['Meta+K', { metaKey: true }],
    ['Control+K', { ctrlKey: true }],
  ])(
    'opens only the visible language panel with %s and focuses its selection',
    (_shortcut, modifier) => {
      const emptyRects = { length: 0 } as DOMRectList;
      const visibleRects = { length: 1 } as DOMRectList;
      vi.spyOn(HTMLElement.prototype, 'getClientRects').mockImplementation(
        function getClientRects(this: HTMLElement) {
          return this.classList.contains('locale-switcher__trigger--compact')
            ? emptyRects
            : visibleRects;
        },
      );

      render(
        <AppShell
          copy={appMessages.de}
          identity={identity}
          locale="de"
          localeSwitcherCopy={sharedMessages.de}
          usage={unavailableUsage}
        >
          <h1>Verlaufsseite</h1>
        </AppShell>,
      );

      fireEvent.keyDown(window, { key: 'k', ...modifier });

      expect(screen.getAllByRole('dialog', { name: 'Sprache' })).toHaveLength(
        1,
      );
      expect(
        screen.getByRole('radio', { name: 'Deutsch German' }),
      ).toHaveFocus();
    },
  );

  test('reconciles both desktop and compact switchers when the server locale changes', () => {
    vi.spyOn(HTMLFormElement.prototype, 'requestSubmit').mockImplementation(
      () => undefined,
    );
    const { rerender } = render(
      <AppShell
        copy={appMessages.en}
        identity={identity}
        locale="en"
        localeSwitcherCopy={sharedMessages.en}
        usage={unavailableUsage}
      >
        <h1>History page</h1>
      </AppShell>,
    );

    expect(
      screen.getAllByRole('button', { name: 'Language: English' }),
    ).toHaveLength(2);

    const desktopTopbar = document.querySelector('.app-topbar') as HTMLElement;
    const mobileTopbar = document.querySelector(
      '.mobile-topbar',
    ) as HTMLElement;
    fireEvent.click(
      within(desktopTopbar).getByRole('button', {
        name: 'Language: English',
      }),
    );
    fireEvent.click(screen.getByRole('radio', { name: 'Español Spanish' }));
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    expect(
      within(desktopTopbar).getByRole('button', {
        name: 'Language: Español',
      }),
    ).toBeVisible();
    expect(
      within(mobileTopbar).getByRole('button', {
        name: 'Language: English',
      }),
    ).toHaveClass('locale-switcher__trigger--compact');

    writeBrowserLocaleCookie('de');
    rerender(
      <AppShell
        copy={appMessages.de}
        identity={identity}
        locale="de"
        localeSwitcherCopy={sharedMessages.de}
        usage={unavailableUsage}
      >
        <h1>Verlaufsseite</h1>
      </AppShell>,
    );

    expect(
      screen.getAllByRole('button', { name: 'Sprache: Deutsch' }),
    ).toHaveLength(2);
    expect(
      within(mobileTopbar).getByRole('button', { name: 'Sprache: Deutsch' }),
    ).toHaveClass('locale-switcher__trigger--compact');

    rerender(
      <AppShell
        copy={appMessages.en}
        identity={identity}
        locale="en"
        localeSwitcherCopy={sharedMessages.en}
        usage={unavailableUsage}
      >
        <h1>History page</h1>
      </AppShell>,
    );

    expect(
      screen.getAllByRole('button', { name: 'Language: English' }),
    ).toHaveLength(2);
  });

  test('preserves the approved responsive geometry and motion contracts', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/app-shell-reference.css'),
      'utf8',
    );

    expect(css).toMatch(
      /\.app-shell\s*{[^}]*grid-template-columns:\s*242px 1fr/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*980px\)[\s\S]*?grid-template-columns:\s*82px 1fr/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*720px\)[\s\S]*?\.bottom-nav\s*{[^}]*position:\s*fixed/,
    );
    expect(css).toContain('padding-bottom: env(safe-area-inset-bottom);');
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(
      /\.side-link:not\(:disabled\):hover\s*{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.025\)/,
    );
    expect(css).toMatch(
      /\.side-link\.active\s*{[^}]*background:\s*rgba\(255,\s*255,\s*255,\s*0\.045\)/,
    );
    expect(css).toMatch(
      /\.side-link\.active::before\s*{[^}]*left:\s*0[^}]*top:\s*10px[^}]*bottom:\s*10px/,
    );
    expect(css).toMatch(
      /\.side-link\.active::after\s*{[^}]*left:\s*-12px[^}]*top:\s*9px[^}]*bottom:\s*9px/,
    );
    expect(css).toMatch(
      /\.app-icon\s*{(?=[^}]*stroke:\s*currentColor)(?=[^}]*fill:\s*none)(?=[^}]*stroke-width:\s*1\.7)(?=[^}]*stroke-linecap:\s*round)(?=[^}]*stroke-linejoin:\s*round)[^}]*}/,
    );
  });

  test.each([
    '/app/video/result-den-25',
    '/app/video/result-den-25/',
    '/app-shell-fixture/app/video/result-den-25',
    '/app-shell-fixture/app/video/result-den-25/',
  ])(
    'marks the global mobile navigation hidden on result route %s',
    (pathname) => {
      usePathname.mockReturnValue(pathname);

      render(
        <AppShell
          copy={appMessages.en}
          identity={identity}
          locale="en"
          localeSwitcherCopy={sharedMessages.en}
          usage={unavailableUsage}
        >
          <h1>Result page</h1>
        </AppShell>,
      );

      expect(
        screen.getByRole('navigation', { name: 'Mobile navigation' }),
      ).toHaveAttribute('data-result-video-route', 'true');
    },
  );

  test.each([
    '/app',
    '/app/video',
    '/app/video/result-den-25/edit',
    '/app/history',
    '/app-shell-fixture/app/history',
  ])(
    'keeps the global mobile navigation on non-result route %s',
    (pathname) => {
      usePathname.mockReturnValue(pathname);

      render(
        <AppShell
          copy={appMessages.en}
          identity={identity}
          locale="en"
          localeSwitcherCopy={sharedMessages.en}
          usage={unavailableUsage}
        >
          <h1>Application page</h1>
        </AppShell>,
      );

      expect(
        screen.getByRole('navigation', { name: 'Mobile navigation' }),
      ).not.toHaveAttribute('data-result-video-route');
    },
  );

  test('hides only result-route global navigation at the mobile breakpoint', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/app-shell-reference.css'),
      'utf8',
    );

    expect(css).toMatch(
      /@media\s*\(max-width:\s*720px\)[\s\S]*?\.bottom-nav\[data-result-video-route='true'\]\s*\{[^}]*display:\s*none/,
    );
  });
});
