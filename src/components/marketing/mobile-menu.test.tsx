import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { SiteHeader } from './site-header';

describe('MobileMenu', () => {
  it('opens, closes with Escape, and restores trigger focus', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);
    const trigger = screen.getByRole('button', { name: 'Open menu' });

    await user.click(trigger);
    expect(screen.getByRole('dialog', { name: 'Navigation' })).toBeVisible();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it('closes after selecting an anchor', async () => {
    const user = userEvent.setup();
    render(<SiteHeader />);

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Navigation' });
    const link = dialog.querySelector<HTMLAnchorElement>('a[href="#how"]');
    expect(link).not.toBeNull();
    expect(link).toHaveAttribute('href', '#how');
    await user.click(link!);
    expect(screen.queryByRole('dialog', { name: 'Navigation' })).toBeNull();
  });
});
