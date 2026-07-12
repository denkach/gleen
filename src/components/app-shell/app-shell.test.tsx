import fs from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { unavailableUsage } from '@/lib/app-shell';

import { AppShell } from './app-shell';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname }));

const identity = {
  displayName: 'Alex Koval',
  email: 'alex@example.com',
  initials: 'AK',
} as const;

describe('AppShell', () => {
  beforeEach(() => usePathname.mockReturnValue('/app/history'));

  test('renders the responsive navigation and account shell', () => {
    render(
      <AppShell identity={identity} usage={unavailableUsage}>
        <h1>History page</h1>
      </AppShell>,
    );

    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#app-content');
    expect(
      screen.getByRole('navigation', { name: 'Application navigation' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('navigation', { name: 'Mobile navigation' }),
    ).toBeInTheDocument();
    const historyLinks = screen.getAllByRole('link', { name: 'History' });
    expect(historyLinks).toHaveLength(2);
    for (const historyLink of historyLinks) {
      expect(historyLink).toHaveAttribute('aria-current', 'page');
      expect(historyLink).toHaveClass('active');
    }

    const unavailableControls = [
      screen.getByRole('button', { name: 'Support' }),
      screen.getByRole('button', { name: 'Change language' }),
      ...screen.getAllByRole('button', { name: 'Notifications' }),
    ];
    for (const control of unavailableControls) {
      expect(control).toBeDisabled();
      expect(control).toHaveAttribute(
        'aria-describedby',
        'app-shell-unavailable-description',
      );
    }
    expect(
      document.getElementById('app-shell-unavailable-description'),
    ).toHaveTextContent('Unavailable in this version');
    expect(screen.getByText('Alex Koval')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(
      screen.queryByText(/18|25|Prism plan|August 01/),
    ).not.toBeInTheDocument();
    expect(
      screen.getAllByText('Usage available with billing').length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole('main')).toHaveAttribute('id', 'app-content');
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
});
