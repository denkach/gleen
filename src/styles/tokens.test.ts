// @vitest-environment node

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(
  new URL('../app/globals.css', import.meta.url),
  'utf8',
);

describe('design token contract', () => {
  it('adds tokenized separation above the protected preferences link', () => {
    const page = readFileSync(
      new URL('../app/protected/page.tsx', import.meta.url),
      'utf8',
    );

    expect(page).toContain('ui-button protected-preferences-link');
    expect(css).toMatch(
      /\.protected-preferences-link\s*{[\s\S]*?margin-block-start:\s*var\(--space-6\)/,
    );
  });

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

  it.each([
    '--color-background-deep: var(--background-deep);',
    '--color-surface-panel: var(--surface-panel);',
    '--color-text-primary: var(--text-primary);',
    '--color-border-default: var(--border-default);',
    '--color-artifact-summary: var(--artifact-summary);',
    '--color-artifact-flashcards: var(--artifact-flashcards);',
    '--color-artifact-timestamps: var(--artifact-timestamps);',
    '--color-artifact-export: var(--artifact-export);',
  ])('provides semantic color alias %s', (declaration) => {
    expect(css).toContain(declaration);
  });

  it.each([
    '--preview-max-width: 76rem;',
    '--preview-heading-min: 2rem;',
    '--preview-heading-fluid: 6vw;',
    '--preview-heading-max: 4rem;',
    '--preview-copy-max-width: 42rem;',
    '--preview-eyebrow-tracking: 0.08em;',
    '--preview-fixture-gap: 1.5rem;',
    '--preview-section-gap: 2.5rem;',
    '--preview-swatch-size: 7rem;',
    '--preview-panel-max-width: 40rem;',
    '--preview-section-heading-size: 1.5rem;',
    '--preview-token-chip-size: 2.5rem;',
  ])('provides preview layout token %s', (declaration) => {
    expect(css).toContain(declaration);
  });

  it('uses preview layout tokens for reviewed constrained fixtures', () => {
    expect(css).toContain('width: min(100%, var(--preview-max-width));');
    expect(css).toContain(
      'font-size: clamp(\n    var(--preview-heading-min),\n    var(--preview-heading-fluid),\n    var(--preview-heading-max)\n  );',
    );
    expect(css).toContain('max-width: var(--preview-copy-max-width);');
    expect(css).toContain('letter-spacing: var(--preview-eyebrow-tracking);');
    expect(css).toContain('gap: var(--preview-fixture-gap);');
    expect(css).toContain('padding-block: var(--preview-section-gap);');
    expect(css).toContain('min-height: var(--preview-swatch-size);');
    expect(css).toContain('max-width: var(--preview-panel-max-width);');
    expect(css).toContain('font-size: var(--preview-section-heading-size);');
    expect(css).toContain(
      'grid-template-columns: var(--preview-token-chip-size) minmax(0, 1fr);',
    );
    expect(css).toContain('width: var(--preview-token-chip-size);');
    expect(css).toContain('height: var(--preview-token-chip-size);');
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
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*?animation-duration:\s*0\.01ms !important;[\s\S]*?transition-duration:\s*0\.01ms !important;[\s\S]*?\.ui-skeleton::after,[\s\S]*?animation:\s*none;[\s\S]*?\.ui-toast,[\s\S]*?transition:\s*none;/,
    );
  });

  it('provides and uses the semantic toast icon size token', () => {
    expect(css).toContain('--size-toast-icon: 1.25rem;');
    expect(css).toContain('--toast-icon-size: var(--size-toast-icon);');
    expect(css).toMatch(
      /\.ui-toast-icon\s*{[^}]*width:\s*var\(--toast-icon-size\);[^}]*height:\s*var\(--toast-icon-size\);/,
    );
  });

  it('raises compact button targets to a tokenized minimum for coarse pointers', () => {
    expect(css).toContain('--control-touch-target-min: 2.75rem;');
    expect(css).toMatch(
      /@media\s*\(pointer:\s*coarse\)\s*{[\s\S]*?\.ui-button\[data-size='sm'\]\s*{[^}]*min-width:\s*var\(--control-touch-target-min\);[^}]*min-height:\s*var\(--control-touch-target-min\);/,
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
