import { render, screen } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';

import AppLoading from './loading';

vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'uk'),
}));

describe('AppLoading', () => {
  test('announces loading and reserves the shell content geometry', async () => {
    const { container } = render(await AppLoading());

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Завантаження робочого простору');
    expect(status).toHaveClass('app-loading');
    expect(container.querySelector('.app-loading-head')).not.toBeNull();
    expect(container.querySelector('.app-loading-hero')).not.toBeNull();
    expect(container.querySelectorAll('.app-loading-panel')).toHaveLength(2);
    expect(container.querySelectorAll('.ui-skeleton')).toHaveLength(5);
    expect(
      screen.queryByText(/18|62%|Prism|How to Learn/),
    ).not.toBeInTheDocument();
  });
});
