import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const sources = ['dialog', 'dropdown-menu', 'tabs', 'tooltip'].map((name) =>
  readFileSync(`src/components/ui/${name}.tsx`, 'utf8'),
);

describe('Gleen primitive public API', () => {
  it('does not export raw Radix component aliases', () => {
    for (const source of sources) {
      expect(source).not.toMatch(
        /export const \w+\s*=\s*\w+Primitive\.(Root|Trigger|Close|Title|Description|Content|List|Item)/,
      );
    }
  });

  it('does not derive exported props from Radix component types', () => {
    for (const source of sources) {
      expect(source).not.toMatch(
        /export (interface|type)[\s\S]{0,160}ComponentPropsWithoutRef<\s*typeof \w+Primitive\./,
      );
    }
  });
});
