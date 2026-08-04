import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const styles = readFileSync(
  resolve(process.cwd(), 'src/app/globals.css'),
  'utf8',
);

describe('language panel prototype contract', () => {
  it('keeps dynamic feedback out of switcher layout flow', () => {
    expect(styles).toMatch(
      /\.locale-switcher__status\s*\{[^}]*position:\s*fixed/,
    );
    expect(styles).toMatch(
      /\.locale-language-toast\s*\{[^}]*position:\s*fixed/,
    );
  });

  it('matches the approved desktop geometry and entrance motion', () => {
    expect(styles).toMatch(/\.locale-language-panel\s*\{[^}]*width:\s*390px/);
    expect(styles).toMatch(
      /\.locale-language-panel\s*\{[^}]*border-radius:\s*18px/,
    );
    expect(styles).toMatch(
      /\.locale-switcher__trigger\s*\{[^}]*anchor-name:\s*--locale-language-trigger/,
    );
    expect(styles).toMatch(
      /\.locale-language-panel\s*\{[^}]*position-anchor:\s*--locale-language-trigger/,
    );
    expect(styles).toMatch(/opacity\s+190ms/);
    expect(styles).toMatch(/transform\s+260ms/);
    expect(styles).toMatch(
      /\.locale-language-panel::before\s*\{[^}]*width:\s*2px[^}]*transform\s+580ms[^}]*90ms/,
    );
    expect(styles).toMatch(/nth-child\(1\)[^}]*70ms/);
    expect(styles).toMatch(/nth-child\(2\)[^}]*105ms/);
    expect(styles).toMatch(/nth-child\(3\)[^}]*140ms/);
    expect(styles).toMatch(/nth-child\(4\)[^}]*175ms/);
    expect(styles).toMatch(/nth-child\(5\)[^}]*210ms/);
    expect(styles).toMatch(
      /\.locale-language-panel__selected\s*\{[^}]*locale-language-selected-opacity-in\s+180ms[^}]*locale-language-selected-transform-in\s+220ms/,
    );
    expect(styles).toMatch(
      /\.locale-language-toast\s*\{[^}]*locale-language-toast-opacity-in\s+180ms[^}]*locale-language-toast-transform-in\s+240ms/,
    );
  });

  it('turns into the approved viewport-safe bottom sheet', () => {
    const mobile = styles.slice(styles.indexOf('@media (max-width: 980px)'));

    expect(styles).toMatch(/@media \(max-width:\s*980px\)/);
    expect(mobile).toMatch(
      /\.locale-language-panel\s*\{[^}]*left:\s*12px[^}]*right:\s*12px[^}]*bottom:\s*12px/,
    );
    expect(mobile).toMatch(
      /max-height:\s*min\(690px,\s*calc\(100svh - 24px\)\)/,
    );
    expect(mobile).toMatch(/border-radius:\s*24px/);
    expect(mobile).toMatch(
      /\.locale-language-panel::after\s*\{[^}]*width:\s*42px[^}]*height:\s*4px/,
    );
    expect(mobile).toMatch(
      /\.locale-language-panel__options\s*\{[^}]*overflow-y:\s*auto[^}]*overscroll-behavior:\s*contain/,
    );
    expect(mobile).toMatch(
      /body:has\(\.locale-language-panel\[data-state='open'\]\)\s*\{[^}]*overflow:\s*hidden/,
    );
  });

  it('keeps narrow rows exact and hides only the selected pill', () => {
    const narrow = styles.slice(styles.indexOf('@media (max-width: 560px)'));

    expect(narrow).toMatch(
      /\.locale-language-panel__(?:header|options|footer)[\s\S]*padding-inline:\s*22px/,
    );
    expect(narrow).toMatch(
      /\.locale-language-panel__option\s*\{[^}]*min-height:\s*78px/,
    );
    expect(narrow).toMatch(
      /\.locale-language-panel__selected\s*\{[^}]*display:\s*none/,
    );
    expect(narrow).not.toMatch(
      /\.locale-language-panel__radio\s*\{[^}]*display:\s*none/,
    );
  });

  it('makes every panel motion effectively instant when motion is reduced', () => {
    const reduced = styles.slice(
      styles.lastIndexOf('@media (prefers-reduced-motion: reduce)'),
    );

    expect(styles).toMatch(/@media \(prefers-reduced-motion:\s*reduce\)/);
    expect(reduced).toContain('.locale-language-panel__scrim');
    expect(reduced).toContain('.locale-language-panel::before');
    expect(reduced).toContain('.locale-language-panel__option');
    expect(reduced).toContain('.locale-language-panel__radio');
    expect(reduced).toContain('.locale-switcher__chevron');
    expect(reduced).toContain('.locale-language-toast');
    expect(reduced).toContain('transition-duration: 0.01ms !important');
    expect(reduced).toContain('animation-duration: 0.01ms !important');
  });
});
