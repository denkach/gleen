import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  resolve(process.cwd(), 'src/styles/app-shell-reference.css'),
  'utf8',
);

describe('app shell locale switcher layout', () => {
  it('centers desktop and mobile triggers beside their neighboring controls', () => {
    expect(styles).toMatch(
      /\.app-topbar \.locale-switcher\s*\{[^}]*display:\s*inline-flex[^}]*align-items:\s*center/,
    );
    expect(styles).toMatch(
      /\.app-topbar \.locale-switcher__trigger\s*\{[^}]*height:\s*36px[^}]*min-height:\s*36px/,
    );
    expect(styles).toMatch(
      /\.mobile-topbar \.locale-switcher\s*\{[^}]*display:\s*inline-flex[^}]*align-items:\s*center/,
    );
    expect(styles).toMatch(
      /\.mobile-topbar \.locale-switcher__trigger--compact[^}]*height:\s*40px[^}]*min-height:\s*40px/,
    );
    expect(styles).not.toMatch(
      /\.mobile-topbar \.locale-switcher__status\s*\{/,
    );
  });
});

describe('new analysis interaction polish', () => {
  it('scopes hover, pressed, focus, and recent row states to the intake page', () => {
    expect(styles).toMatch(/\.analysis-hero \.btn:not\(:disabled\):hover/);
    expect(styles).toMatch(/\.analysis-hero \.btn:not\(:disabled\):active/);
    expect(styles).toMatch(/\.analysis-hero \.btn:focus-visible/);
    expect(styles).toMatch(/\.recent-analysis-row:hover/);
  });

  it('removes intake movement for reduced motion', () => {
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.analysis-hero \.btn/,
    );
  });
});
