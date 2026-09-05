import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HistoryActionIcon } from './history-action-icons';

describe('HistoryActionIcon', () => {
  it('renders decorative line icons for every menu action', () => {
    for (const name of [
      'open',
      'retry',
      'rename',
      'export',
      'delete',
    ] as const) {
      const { unmount } = render(<HistoryActionIcon name={name} />);
      expect(screen.getByTestId(`history-action-icon-${name}`)).toHaveAttribute(
        'aria-hidden',
        'true',
      );
      unmount();
    }
  });
});
