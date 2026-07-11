import { describe, expect, it } from 'vitest';

import { isHeaderScrolled } from './reference-header';

describe('isHeaderScrolled', () => {
  it('uses the exact reference threshold', () => {
    expect(isHeaderScrolled(18)).toBe(false);
    expect(isHeaderScrolled(19)).toBe(true);
  });
});
