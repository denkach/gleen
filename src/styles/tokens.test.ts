// @vitest-environment node

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(
  new URL('../app/globals.css', import.meta.url),
  'utf8',
);

describe('design token contract', () => {
  it.each([
    '--background-deep: #0a0a0f;',
    '--background-elevated: #111018;',
    '--surface-panel: #16161f;',
    '--surface-raised: #1b1a25;',
    '--surface-hover: #201f2b;',
    '--text-primary: #f4f2ff;',
    '--text-secondary: #9a98ad;',
    '--text-muted: #696779;',
    '--border-default: rgba(255, 255, 255, 0.06);',
    '--border-hover: rgba(255, 255, 255, 0.12);',
    '--border-strong: rgba(255, 255, 255, 0.18);',
    '--artifact-summary: #ffb454;',
    '--artifact-flashcards: #c77dff;',
    '--artifact-timestamps: #5be9e9;',
    '--artifact-export: #a8e063;',
    '--radius-control: 8px;',
    '--radius-panel: 14px;',
    '--radius-feature: 22px;',
    '--shadow-panel: 0 16px 48px rgba(0, 0, 0, 0.28);',
    '--motion-micro: 160ms;',
    '--motion-interface: 280ms;',
    '--motion-narrative: 800ms;',
    '--ease-prism: cubic-bezier(0.16, 1, 0.3, 1);',
  ])('contains %s', (declaration) => {
    expect(css).toContain(declaration);
  });

  it('provides semantic color aliases', () => {
    expect(css).toContain('--color-background-deep: var(--background-deep);');
    expect(css).toContain('--color-surface-panel: var(--surface-panel);');
    expect(css).toContain('--color-text-primary: var(--text-primary);');
    expect(css).toContain('--color-border-default: var(--border-default);');
    expect(css).toContain('--color-artifact-summary: var(--artifact-summary);');
  });

  it.each([
    '--color-overlay: var(--overlay);',
    '--layer-overlay: var(--z-overlay);',
    '--layer-dialog: var(--z-dialog);',
    '--layer-tooltip: var(--z-tooltip);',
    '--dialog-max-width: var(--size-dialog-max);',
    '--tooltip-text-size: var(--font-size-tooltip);',
    '--tooltip-line-height: var(--line-height-tooltip);',
    '--dialog-entrance-scale: var(--scale-dialog-entrance);',
  ])('provides overlay semantic alias %s', (declaration) => {
    expect(css).toContain(declaration);
  });

  it('reduces motion without hiding content', () => {
    const reducedMotionRule = css.match(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)\s*{([\s\S]*?)\n}/,
    );

    expect(reducedMotionRule).not.toBeNull();
    expect(reducedMotionRule?.[1]).not.toContain('display: none');
    expect(reducedMotionRule?.[1]).toContain(
      '.ui-dialog-content {\n    animation: ui-overlay-in',
    );
  });

  it('provides and uses the semantic toast icon size token', () => {
    expect(css).toContain('--size-toast-icon: 1.25rem;');
    expect(css).toContain('--toast-icon-size: var(--size-toast-icon);');
    expect(css).toMatch(
      /\.ui-toast-icon\s*{[^}]*width:\s*var\(--toast-icon-size\);[^}]*height:\s*var\(--toast-icon-size\);/,
    );
  });

  it('accounts for every safe-area inset in the toast viewport geometry', () => {
    expect(css).toMatch(
      /\.ui-toast-viewport\s*{[^}]*right:\s*calc\(var\(--toast-viewport-gap\) \+ env\(safe-area-inset-right\)\);/,
    );
    expect(css).toMatch(
      /\.ui-toast-viewport\s*{[^}]*bottom:\s*calc\(var\(--toast-viewport-gap\) \+ env\(safe-area-inset-bottom\)\);/,
    );
    expect(css).toMatch(
      /width:\s*min\(\s*var\(--toast-max-width\),\s*calc\(\s*100vw\s*-\s*env\(safe-area-inset-left\)\s*-\s*env\(safe-area-inset-right\)\s*-\s*\(var\(--toast-viewport-gap\) \* 2\)\s*\)\s*\);/,
    );
    expect(css).toMatch(
      /max-height:\s*calc\(\s*100vh\s*-\s*env\(safe-area-inset-top\)\s*-\s*env\(safe-area-inset-bottom\)\s*-\s*\(var\(--toast-viewport-gap\) \* 2\)\s*\);/,
    );
  });
});
