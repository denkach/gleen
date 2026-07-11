import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { UiPreview } from './ui-preview';

beforeEach(() => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
});

describe('UiPreview long-content fixtures', () => {
  it('renders labeled constrained fixtures and exposes interactive long content', async () => {
    const user = userEvent.setup();
    render(<UiPreview />);

    expect(
      screen.getByRole('textbox', {
        name: 'Translated long-label example that verifies control wrapping without horizontal overflow',
      }),
    ).toHaveAccessibleDescription(
      'Long supporting guidance remains associated with the field when translated copy needs several lines. Long validation feedback remains announced and wraps without widening the page.',
    );
    expect(
      screen.getByRole('region', { name: 'Long panel content example' }),
    ).toHaveTextContent('constrained paragraph');

    await user.click(screen.getByRole('button', { name: 'Open long dialog' }));
    expect(
      screen.getByRole('dialog', {
        name: 'Long dialog title that demonstrates wrapping in a constrained overlay',
      }),
    ).toHaveAccessibleDescription(
      'Long dialog description stays readable and connected to the dialog when interface copy expands.',
    );

    await user.click(screen.getByRole('button', { name: 'Close dialog' }));
    await user.click(
      screen.getByRole('button', { name: 'Open long-content menu' }),
    );
    expect(
      screen.getByRole('menuitem', {
        name: 'Long translated menu item that remains readable inside a constrained menu',
      }),
    ).toBeVisible();

    await user.keyboard('{Escape}');
    const longTabs = screen.getByRole('tablist', {
      name: 'Long-content constrained example tabs',
    });
    await user.click(
      within(longTabs).getByRole('tab', {
        name: 'Long translated tab label that wraps safely',
      }),
    );
    expect(
      screen.getByRole('tabpanel', {
        name: 'Long translated tab label that wraps safely',
      }),
    ).toHaveTextContent('Long tab content');

    await user.click(screen.getByRole('button', { name: 'Show long toast' }));
    expect(
      screen.getByText(
        'Long toast title that verifies notification copy wrapping',
      ),
    ).toBeVisible();
    expect(
      screen.getByText(
        'Long toast description remains readable when localized interface text expands across multiple lines.',
      ),
    ).toBeVisible();
  });
});
