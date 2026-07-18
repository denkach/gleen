// @vitest-environment node

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(
  new URL('./result-workspace-reference.css', import.meta.url),
  'utf8',
);

describe('DEN-25 result shell geometry', () => {
  it('keeps the source in document flow and anchors progress above controls', () => {
    expect(css).toMatch(/\.result-source-column\s*{[^}]*position:\s*static;/);
    expect(css).toMatch(/\.result-progress-wrap\s*{[^}]*bottom:\s*64px;/);
    expect(css).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.result-progress-wrap\s*{[^}]*bottom:\s*57px;/,
    );
  });

  it('collapses only the result shell at 1180px', () => {
    expect(css).toContain(
      '.app-shell:has(.result-page-layout) .sidebar .app-brand span:last-child,',
    );
    expect(css).toContain(
      '.app-shell:has(.result-page-layout) .sidebar-section-label,',
    );
    expect(css).toContain(
      '.app-shell:has(.result-page-layout) .user-chip-text',
    );
  });

  it('uses the prototype topbar without generic mobile shell chrome', () => {
    expect(css).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell:has\(\.result-page-layout\)\s*{[^}]*padding-bottom:\s*0;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.app-shell:has\(\.result-page-layout\) \.app-topbar\s*{[^}]*height:\s*62px;[^}]*display:\s*flex;/,
    );
    expect(css).toContain(
      '.app-shell:has(.result-page-layout) :is(.mobile-topbar, .bottom-nav)',
    );
  });

  it('gives coarse-pointer range controls a 44px target', () => {
    expect(css).toMatch(
      /@media \(pointer: coarse\)[\s\S]*?\.result-progress-input,[\s\S]*?\.result-volume-input\s*{[^}]*min-height:\s*44px;/,
    );
  });
});
