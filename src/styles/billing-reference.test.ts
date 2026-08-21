import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('billing reference stylesheet', () => {
  it('preserves the approved tokens, layout, breakpoints, and reduced motion contract', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'src/styles/billing-reference.css'),
      'utf8',
    );

    expect(css).toContain('--bg:#080a0f');
    expect(css).toMatch(
      new RegExp(
        String.raw`\.billing-plan-overview\s*\{[\s\S]*?grid-template-columns:\s*1\.65fr repeat\(3,.72fr\)`,
      ),
    );
    expect(css).toMatch(/@media\s*\(max-width:\s*1120px\)/);
    expect(css).toMatch(/@media\s*\(max-width:\s*760px\)/);
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/);
    expect(css).toMatch(/\.billing-experience \.billing-recovery-card\s*\{/);
    expect(css).toMatch(/@keyframes\s+billing-recovery-spin/);
    expect(css).toMatch(
      /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*animation:\s*none\s*!important/,
    );
    expect(css).not.toMatch(/(^|})\s*\.(?!billing-experience)/);
  });
});
