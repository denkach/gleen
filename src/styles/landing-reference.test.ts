import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  resolve(process.cwd(), 'src/styles/landing-reference.css'),
  'utf8',
);

describe('landing reference compact header layout', () => {
  it('keeps the locale switcher centered without flow-based feedback', () => {
    expect(styles).toMatch(
      /\.landing-reference \.header-actions \.locale-switcher\s*\{[^}]*display:\s*inline-flex[^}]*align-items:\s*center/,
    );
    expect(styles).toMatch(
      /\.landing-reference \.header-actions \.locale-switcher__trigger\s*\{[^}]*min-height:\s*36px/,
    );
    expect(styles).not.toMatch(
      /\.landing-reference[^}]*\.locale-switcher__status\s*\{[^}]*position:\s*(?:static|relative)/,
    );
  });

  it('moves full locale and CTA controls below the brand at 320px while retaining the 42px menu', () => {
    const compactHeader = styles.slice(
      styles.indexOf('@media (max-width: 420px)'),
    );

    expect(compactHeader).toContain('height: 118px');
    expect(compactHeader).toContain('grid-column: 1 / -1');
    expect(compactHeader).toContain(
      'grid-template-columns: minmax(0, 1fr) auto',
    );
    expect(compactHeader).toContain('width: 42px');
    expect(compactHeader).toContain('min-width: 0');
  });
});
