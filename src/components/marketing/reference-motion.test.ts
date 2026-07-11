import { describe, expect, it } from 'vitest';

import { shouldReduceMotion } from './reference-motion';

describe('reference motion policy', () => {
  it('respects the operating-system preference', () => {
    expect(shouldReduceMotion(true)).toBe(true);
    expect(shouldReduceMotion(false)).toBe(false);
  });
});
