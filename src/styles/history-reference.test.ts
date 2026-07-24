// @vitest-environment node

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(
  new URL('./history-reference.css', import.meta.url),
  'utf8',
);

describe('DEN-19 History CSS contract', () => {
  it('renders the duplicate play emblem and desktop action hierarchy', () => {
    const desktopCss = css.split('@media (max-width: 980px)')[0] ?? '';

    expect(desktopCss).toMatch(
      /\.history-duplicate-banner__play\s*{[^}]*display:\s*grid;[^}]*place-items:\s*center;[^}]*border:\s*1px solid var\(--border-hover\);[^}]*border-radius:\s*50%;/,
    );
    expect(desktopCss).toMatch(
      /\.history-duplicate-banner__play::before\s*{[^}]*border-left:\s*[^;]+ solid currentColor;[^}]*content:\s*'';/,
    );
    expect(desktopCss).toMatch(
      /\.history-duplicate-banner__primary\s*{[^}]*border-color:\s*var\(--text-primary\);[^}]*background:\s*var\(--text-primary\);[^}]*color:\s*var\(--background-deep\);/,
    );
    expect(desktopCss).toMatch(
      /\.history-duplicate-banner__secondary\s*{[^}]*border:\s*1px solid var\(--border-hover\);[^}]*background:\s*transparent;[^}]*color:\s*var\(--text-primary\);/,
    );
  });

  it('centers the duplicate emblem and makes the mobile secondary action quiet', () => {
    const mobileCss = css.slice(
      css.indexOf('@media (max-width: 720px)'),
      css.indexOf('@media (max-width: 360px)'),
    );

    expect(mobileCss).toMatch(
      /\.history-duplicate-banner__play\s*{[^}]*justify-self:\s*center;/,
    );
    expect(mobileCss).toMatch(
      /\.history-duplicate-banner__secondary\s*{[^}]*border:\s*0;[^}]*background:\s*transparent;[^}]*color:\s*var\(--text-secondary\);/,
    );
    expect(mobileCss).not.toMatch(
      /\.history-duplicate-banner__secondary\s*{[^}]*border:\s*1px/,
    );
  });

  it('shows a tokenized keyboard focus treatment on status options', () => {
    expect(css).toMatch(
      /\.history-filters__status-option:has\(input:focus-visible\)\s*{[^}]*outline:\s*2px solid var\(--artifact-timestamps\);[^}]*outline-offset:\s*2px;/,
    );
  });

  it('clamps desktop row titles to two lines outside responsive overrides', () => {
    const desktopCss = css.split('@media (max-width: 980px)')[0] ?? '';
    expect(desktopCss).toMatch(
      /\.history-row__title\s*{[^}]*display:\s*-webkit-box;[^}]*overflow:\s*hidden;[^}]*-webkit-box-orient:\s*vertical;[^}]*-webkit-line-clamp:\s*2;/,
    );
  });

  it('fully removes History portal motion when reduced motion is requested', () => {
    const reducedMotion = css.match(
      /@media \(prefers-reduced-motion: reduce\)\s*{([\s\S]*)\}\s*$/,
    )?.[1];

    expect(reducedMotion).toContain(
      'body:has(.history-workspace) > .ui-dialog-overlay',
    );
    expect(reducedMotion).toContain(
      'body:has(.history-workspace) > .ui-dialog-content',
    );
    expect(reducedMotion).toContain(
      'body:has(.history-workspace) > .ui-dropdown-menu-content',
    );
    expect(reducedMotion).toContain('animation: none');
    expect(reducedMotion).toContain('transition: none');
    expect(reducedMotion).not.toContain('0.01ms');
  });
});
