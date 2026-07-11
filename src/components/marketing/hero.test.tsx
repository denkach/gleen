import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from '@/app/page';

describe('landing hero', () => {
  it('renders the approved semantic header and hero contract', () => {
    render(<HomePage />);

    expect(screen.getByRole('banner')).toBeVisible();
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toBeVisible();
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Watch less. Understand more.',
      }),
    ).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'YouTube URL' })).toBeRequired();
    expect(
      screen.getByRole('button', { name: 'Transform video' }),
    ).toBeVisible();
    expect(document.querySelector('.prism-stage')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('provides a skip link to the main content', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('link', { name: 'Skip to content' }),
    ).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content');
  });
});
