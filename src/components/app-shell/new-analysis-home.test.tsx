import fs from 'node:fs';
import path from 'node:path';

import { render, screen, within } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { appMessages } from '@/lib/i18n/messages/app';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { NewAnalysisHome } from './new-analysis-home';

describe('NewAnalysisHome', () => {
  test('renders active intake with profile defaults and empty analysis states', () => {
    render(
      <NewAnalysisHome
        copy={appMessages.uk}
        profileDefaults={{
          outputLocale: 'de',
          summaryPreset: 'deep',
          flashcardPreset: 30,
        }}
      />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Перетворіть відео на щось корисне.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('URL-адреса YouTube')).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'Аналізувати відео' }),
    ).toBeEnabled();
    expect(
      screen.getByText(/Конспект, Таймкоди, Транскрипт/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Останні аналізи' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Аналізів ще немає')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Дані про використання й навчання з’являться після першого аналізу.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /Переглянути історію/ }),
    ).toHaveAttribute('href', '/app/history');
    expect(
      screen.getByRole('link', { name: 'Керувати тарифом' }),
    ).toHaveAttribute('href', '/app/subscription');
    expect(
      screen.queryByText('How to Learn Anything Faster'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/18|62%|11|Prism/)).not.toBeInTheDocument();
  });

  test('renders truthful monthly usage with an accessible interactive chart', () => {
    render(
      <NewAnalysisHome
        copy={appMessages.en}
        monthlyUsage={{
          kind: 'ready',
          used: 22,
          limit: 50,
          canUpgrade: true,
          trend: { direction: 'up', value: '+12%', label: 'vs last month' },
          points: [
            {
              key: '2026-09-05',
              dateLabel: 'Sep 5',
              count: 1,
              countLabel: '1 analysis',
            },
            {
              key: '2026-09-06',
              dateLabel: 'Sep 6',
              count: 3,
              countLabel: '3 analyses',
            },
          ],
        }}
      />,
    );

    const monthly = screen.getByRole('complementary', {
      name: 'This month',
    });
    expect(within(monthly).getByText('22')).toBeVisible();
    expect(within(monthly).getByText('/ 50')).toBeVisible();
    expect(
      within(monthly).getByRole('button', { name: 'Sep 6: 3 analyses' }),
    ).toBeVisible();
    expect(
      within(monthly).getByRole('link', { name: /Upgrade plan/u }),
    ).toHaveAttribute('href', '/app/subscription');
    expect(
      within(monthly).queryByText(appMessages.en.newAnalysis.monthly.empty),
    ).not.toBeInTheDocument();
  });

  test('preserves the approved panel geometry and responsive stacking', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/app-shell-reference.css'),
      'utf8',
    );

    expect(css).toMatch(
      /\.analysis-hero\s*{(?=[^}]*padding:\s*48px 50px)(?=[^}]*min-height:\s*310px)(?=[^}]*border-radius:\s*24px)/,
    );
    expect(css).toMatch(
      /\.dashboard-grid\s*{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) 330px[^}]*gap:\s*18px[^}]*margin-top:\s*18px/,
    );
    expect(css).toMatch(
      /\.new-analysis-panel__head\s*{(?=[^}]*height:\s*64px)(?=[^}]*padding:\s*0 20px)/,
    );
    expect(css).toMatch(
      /\.recent-analysis-row\s*{(?=[^}]*grid-template-columns:\s*116px minmax\(0,\s*1fr\) auto)(?=[^}]*padding:\s*14px 18px)/,
    );
    expect(css).toMatch(
      /\.analysis-options \.language-list\s*{(?=[^}]*display:\s*grid)(?=[^}]*grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\))(?=[^}]*gap:\s*8px)/,
    );
    expect(css).toMatch(
      /\.analysis-options \.language-option\s*{(?=[^}]*min-height:\s*70px)(?=[^}]*padding:\s*12px)(?=[^}]*flex-direction:\s*column)/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*720px\)[\s\S]*?\.analysis-hero\s*{(?=[^}]*padding:\s*28px 18px)(?=[^}]*min-height:\s*340px)[^}]*}[\s\S]*?\.analysis-options \.language-list\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\)[\s\S]*?\.dashboard-grid\s*{[^}]*grid-template-columns:\s*1fr[\s\S]*?\.recent-analysis-row\s*{(?=[^}]*grid-template-columns:\s*88px minmax\(0,\s*1fr\))(?=[^}]*padding:\s*12px)/,
    );
    expect(css).toMatch(/\.app-beam-form\s*{[^}]*display:\s*flex/);
    expect(css).not.toMatch(/\.app-beam-form\s*{[^}]*flex-wrap:/);
    const analysisOptionsCss = css.match(/\.analysis-options\s*{([^}]*)}/)?.[1];
    const duplicateBannerCss = css.match(/\.duplicate-banner\s*{([^}]*)}/)?.[1];
    expect(analysisOptionsCss).not.toContain('rgba(');
    expect(analysisOptionsCss).toContain('box-shadow: var(--shadow-panel)');
    expect(duplicateBannerCss).not.toContain('rgba(');
  });
});
