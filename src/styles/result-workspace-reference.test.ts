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

  it('keeps landscape sheet safe-area insets asymmetric', () => {
    expect(css).toMatch(
      /\.result-sheet\s*{[^}]*--result-sheet-inline-start:\s*max\(12px,\s*env\(safe-area-inset-left\)\);[^}]*--result-sheet-inline-end:\s*max\(12px,\s*env\(safe-area-inset-right\)\);/,
    );
    expect(css).toMatch(
      /\.result-sheet\s*{[^}]*right:\s*var\(--result-sheet-inline-end\);[^}]*left:\s*var\(--result-sheet-inline-start\);/,
    );
  });

  it('gives coarse-pointer range controls a 44px target', () => {
    expect(css).toMatch(
      /@media \(pointer: coarse\)[\s\S]*?\.result-progress-input,[\s\S]*?\.result-volume-input\s*{[^}]*min-height:\s*44px;/,
    );
  });

  it('gives coarse-pointer artifact edit, source, copy, and timestamp controls a 44px target', () => {
    expect(css).toMatch(
      /@media \(pointer: coarse\)[\s\S]*?\.result-summary-actions button,[\s\S]*?\.result-artifact-edit-button,[\s\S]*?\.result-summary-(?:overview|title-input|point-input)[\s\S]*?{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/,
    );
    expect(css).toMatch(
      /@media \(pointer: coarse\)[\s\S]*?\.result-moment-thumb,[\s\S]*?\.result-moment-time,[\s\S]*?\.result-moment-copy input,[\s\S]*?\.result-moment-copy textarea\s*{[^}]*min-width:\s*44px;[^}]*min-height:\s*44px;/,
    );
  });

  it('keeps the custom player surface and complete controls inside fullscreen', () => {
    expect(css).toContain(':is(:fullscreen, :-webkit-full-screen)');
    expect(css).toMatch(
      /\.result-player-stage:is\(:fullscreen, :-webkit-full-screen\)\s*{[^}]*width:\s*100%;[^}]*height:\s*100%;[^}]*aspect-ratio:\s*auto;[^}]*margin:\s*0;[^}]*overflow:\s*hidden;/,
    );
    expect(css).toMatch(
      /\.result-player-stage:is\(:fullscreen, :-webkit-full-screen\)\s+\.result-player-controls\s*{[^}]*top:\s*auto;[^}]*bottom:\s*0;[^}]*overflow-x:\s*auto;/,
    );
    expect(css).toMatch(
      /\.result-player-stage:is\(:fullscreen, :-webkit-full-screen\)\s+\.result-progress-wrap\s*{[^}]*bottom:\s*64px;/,
    );
    expect(css).toMatch(
      /\.result-player-stage:is\(:fullscreen, :-webkit-full-screen\)[^}]*\.result-speed-control,[\s\S]*?\.result-player-stage:is\(:fullscreen, :-webkit-full-screen\)[^}]*\.result-volume-input\s*{[^}]*display:\s*block;/,
    );
  });

  it('matches the result-only 860px and 620px prototype transitions', () => {
    expect(css).toMatch(
      /@media \(max-width: 860px\)[\s\S]*?body:has\(\.result-page-layout\) \.app-topbar\s*{[^}]*padding-inline:\s*14px;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 860px\)[\s\S]*?body:has\(\.result-page-layout\) \.usage-pill\s*{[^}]*display:\s*none;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?body:has\(\.result-page-layout\) \.result-source-actions\s*{[^}]*display:\s*none;/,
    );
  });

  it('clamps the result statement to the approved desktop and mobile limits', () => {
    expect(css).toMatch(
      /\.result-overview-outcome\s*{[^}]*-webkit-line-clamp:\s*3;/,
    );
    expect(css).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.result-overview-outcome\s*{[^}]*-webkit-line-clamp:\s*4;/,
    );
  });

  it('collapses Overview metrics to one column at the mobile transition', () => {
    expect(css).toMatch(
      /@media \(max-width: 620px\)[\s\S]*?\.result-overview-metrics\s*{[^}]*grid-template-columns:\s*1fr;/,
    );
  });

  it('limits card hover and pressed feedback to available cards', () => {
    expect(css).toContain(".artifact-link-card[aria-disabled='false']:hover");
    expect(css).toContain(".artifact-link-card[aria-disabled='false']:active");
    expect(css).not.toMatch(/\.artifact-link-card:hover/);
    expect(css).not.toMatch(/\.artifact-link-card:active/);
  });

  it('limits Continue and Recommendation hover and pressed feedback to available actions', () => {
    expect(css).toContain(
      ".result-overview-continue-action[aria-disabled='false']:hover",
    );
    expect(css).toContain(
      ".result-overview-continue-action[aria-disabled='false']:active",
    );
    expect(css).toContain(
      ".result-overview-recommendation > button[aria-disabled='false']:hover",
    );
    expect(css).toContain(
      ".result-overview-recommendation > button[aria-disabled='false']:active",
    );
    expect(css).not.toMatch(/\.result-overview-continue-action:hover/);
    expect(css).not.toMatch(/\.result-overview-recommendation > button:hover/);
    expect(css).not.toMatch(/\.result-overview-continue-action:active/);
    expect(css).not.toMatch(/\.result-overview-recommendation > button:active/);
  });

  it('keeps Export controls lime-led without a permanent spectral action gradient', () => {
    const activeDestination = css.match(
      /\.result-export-destination\[data-active='true'\]\s*{[^}]*}/,
    )?.[0];
    const destinationIcon = css.match(
      /\.result-export-destination-icon\s*{[^}]*}/,
    )?.[0];
    const previewAccent = css.match(
      /\.result-export-preview::after\s*{[^}]*}/,
    )?.[0];
    const action = css.match(/\.result-export-action\s*{[^}]*}/)?.[0];

    for (const rule of [
      activeDestination,
      destinationIcon,
      previewAccent,
      action,
    ]) {
      expect(rule).toContain('var(--artifact-export)');
      expect(rule).not.toContain('var(--artifact-flashcards)');
      expect(rule).not.toContain('var(--artifact-timestamps)');
    }
    expect(action).not.toContain('linear-gradient');
  });
});
