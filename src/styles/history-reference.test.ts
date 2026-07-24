// @vitest-environment node

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(
  new URL('./history-reference.css', import.meta.url),
  'utf8',
);

describe('DEN-19 History CSS contract', () => {
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
