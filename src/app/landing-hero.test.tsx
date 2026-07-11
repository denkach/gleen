import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('approved landing hero', () => {
  it('preserves the reference hierarchy and prism geometry', () => {
    render(<HomePage />);
    expect(screen.getByRole('banner')).toBeVisible();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Watch less.Understand more.',
      }),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'YouTube URL' })).toHaveValue(
      'https://youtube.com/watch?v=knowledge',
    );
    expect(
      document.querySelector('.hero > .hero-grid > .prism-stage .prism-wrap'),
    ).not.toBeNull();
    expect(
      document.querySelector('.prism-svg path[d="M160 20 294 266 27 266Z"]'),
    ).not.toBeNull();
    expect(document.querySelectorAll('.spectrum > .ray')).toHaveLength(4);
    expect(document.querySelectorAll('.artifact-float')).toHaveLength(4);
  });
});
