import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import HomePage from './page';

describe('HomePage', () => {
  it('shows the approved landing heading', () => {
    render(<HomePage />);

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Watch less.Understand more.',
      }),
    ).toBeVisible();
  });
});
