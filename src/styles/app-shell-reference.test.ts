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

describe('Account Atlas settings presentation', () => {
  it('uses a responsive three-column atlas with complete control states', () => {
    expect(styles).toMatch(
      /\.settings-atlas__grid\s*\{[^}]*grid-template-columns:\s*repeat\(3,/,
    );
    expect(styles).toMatch(/\.settings-destination-card:hover/);
    expect(styles).toMatch(/\.settings-destination-card:active/);
    expect(styles).toMatch(/\.settings-destination-card:focus-visible/);
    expect(styles).toMatch(
      /\.settings-destination-card[^}]*min-height:\s*(?:44|1[0-9]{2})px/,
    );
    expect(styles).toMatch(
      /\.settings-section :is\(button, select, input\):disabled/,
    );
    expect(styles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.settings-atlas__grid\s*\{[^}]*grid-template-columns:\s*1fr/,
    );
  });

  it('removes non-essential settings movement for reduced motion', () => {
    expect(styles).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.settings-destination-card/,
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
