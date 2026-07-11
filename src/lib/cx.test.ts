import { describe, expect, it } from 'vitest';

import { cx } from '@/lib/cx';

describe('cx', () => {
  it('joins truthy class names with spaces', () => {
    expect(cx('button', false, undefined, 'button--primary', null)).toBe(
      'button button--primary',
    );
  });
});
