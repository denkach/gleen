import fs from 'node:fs';
import path from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import { NewAnalysisHome } from './new-analysis-home';

describe('NewAnalysisHome', () => {
  test('renders active intake with profile defaults and empty analysis states', () => {
    render(
      <NewAnalysisHome
        profileDefaults={{
          outputLocale: 'de',
          summaryPreset: 'detailed',
          flashcardPreset: 30,
        }}
      />,
    );

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Turn a video into something useful.',
      }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('YouTube URL')).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Analyze video' })).toBeEnabled();
    expect(
      screen.getByText(/Summary, Timestamps, Transcript/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Recent analyses' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No analyses yet')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Usage and study metrics become available after your first analysis.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /View history/ })).toHaveAttribute(
      'href',
      '/app/history',
    );
    expect(screen.getByRole('link', { name: 'Manage plan' })).toHaveAttribute(
      'href',
      '/app/subscription',
    );
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
