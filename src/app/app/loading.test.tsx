import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import AppLoading from './loading';

describe('AppLoading', () => {
  test('announces loading and reserves the shell content geometry', () => {
    const { container } = render(<AppLoading />);

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('Loading workspace');
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
