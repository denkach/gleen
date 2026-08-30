import fs from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
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

  test('preserves the approved panel geometry and responsive stacking', () => {
    const css = fs.readFileSync(
      path.join(process.cwd(), 'src/styles/app-shell-reference.css'),
      'utf8',
    );

    expect(css).toMatch(
      /\.analysis-hero\s*{(?=[^}]*padding:\s*48px 50px)(?=[^}]*min-height:\s*310px)(?=[^}]*border-radius:\s*24px)/,
    );
    expect(css).toMatch(
      /\.dashboard-grid\s*{[^}]*grid-template-columns:\s*1\.45fr 0\.55fr[^}]*gap:\s*18px[^}]*margin-top:\s*18px/,
    );
    expect(css).toMatch(
      /\.panel-head\s*{(?=[^}]*min-height:\s*57px)(?=[^}]*padding:\s*0 20px)/,
    );
    expect(css).toMatch(
      /@media\s*\(max-width:\s*720px\)[\s\S]*?\.analysis-hero\s*{(?=[^}]*padding:\s*28px 18px)(?=[^}]*min-height:\s*340px)[^}]*}[\s\S]*?\.dashboard-grid\s*{[^}]*grid-template-columns:\s*1fr/,
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
