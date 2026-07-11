import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import HomePage from './page';

describe('HomePage', () => {
  it('shows the approved landing heading', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Watch less. Understand more.',
      }),
    ).toBeVisible();
    expect(
      screen.queryByText('Gleen frontend foundation'),
    ).not.toBeInTheDocument();
  });
});
