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

  it('defines the responsive account settings composition without overflow', () => {
    expect(styles).toMatch(/\.settings-account-layout\s*\{/);
    expect(styles).toMatch(/\.settings-language-card\s*\{/);
    expect(styles).toMatch(/\.settings-note-card\s*\{/);
    expect(styles).toMatch(/\.settings-preference-row\s*\{/);
    expect(styles).toMatch(/\.settings-preference-row[^}]*min-width:\s*0/);
    expect(styles).toMatch(
      /@media\s*\(max-width:\s*720px\)[\s\S]*\.settings-preference-row\s*\{[^}]*display:\s*block/,
    );
  });
});
