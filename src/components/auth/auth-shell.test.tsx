import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AuthShell } from './auth-shell';
import { AuthStatus } from './auth-status';

describe('approved authentication shell', () => {
  it('preserves the prototype hierarchy and calm prism scene', () => {
    const { container } = render(
      <AuthShell
        visualTitle="Return to the signal."
        visualDescription="Every analysis remains exactly where you left it."
      >
        <div>Access form</div>
      </AuthShell>,
    );

    expect(container.querySelector('.auth-reference.auth-page')).not.toBeNull();
    expect(container.querySelector('.auth-visual .brand')).not.toBeNull();
    expect(container.querySelector('.auth-prism .beam-in')).not.toBeNull();
    expect(
      container.querySelectorAll('.auth-prism .spectrum .ray'),
    ).toHaveLength(4);
    expect(container.querySelector('.auth-panel .auth-card')).not.toBeNull();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Return to the signal.',
    );
    expect(screen.getByText('Access form')).toBeVisible();
  });

  it('announces actionable status without relying on color', () => {
    render(<AuthStatus tone="error">Check your email address.</AuthStatus>);

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Check your email address.',
    );
    expect(screen.getByRole('alert')).toHaveAttribute('data-tone', 'error');
  });

  it('ports exact desktop, tablet, mobile, motion, and reduced-motion rules', async () => {
    const css = await readFile(
      join(process.cwd(), 'src/styles/auth-reference.css'),
      'utf8',
    );

    expect(css).toMatch(/grid-template-columns:\s*1\.08fr 0?\.92fr/);
    expect(css).toMatch(/\.auth-card\s*{[\s\S]*?width:\s*min\(440px, 100%\)/);
    expect(css).toMatch(
      /@media \(max-width:\s*980px\)[\s\S]*\.auth-page\s*{[^}]*grid-template-columns:\s*1fr/,
    );
    expect(css).toMatch(
      /@media \(max-width:\s*720px\)[\s\S]*\.auth-visual\s*{[^}]*min-height:\s*330px/,
    );
    expect(css).toMatch(/@keyframes auth-ray-breathe/);
    expect(css).toMatch(
      /@media \(prefers-reduced-motion:\s*reduce\)[\s\S]*animation-duration:\s*0\.001ms !important/,
    );
  });
});
