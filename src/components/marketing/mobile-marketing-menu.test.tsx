import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { marketingMessages } from '@/lib/i18n/messages/marketing';

import { MobileMarketingMenu } from './mobile-marketing-menu';

const navigation = [
  { label: 'Product', href: '#product' },
  { label: 'Pricing', href: '#pricing' },
] as const;

describe('MobileMarketingMenu', () => {
  it('opens a localized navigation dialog with authentication destinations', async () => {
    const user = userEvent.setup();

    render(
      <MobileMarketingMenu
        navigation={navigation}
        copy={marketingMessages.en.header}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open menu' }));

    expect(
      await screen.findByRole('dialog', { name: 'Menu' }),
    ).toHaveAccessibleDescription('Navigate Gleen and access your account.');
    expect(
      screen.getByRole('navigation', { name: 'Primary navigation' }),
    ).toHaveTextContent('ProductPricing');
    expect(screen.getByRole('link', { name: 'Product' })).toHaveAttribute(
      'href',
      '#product',
    );
    expect(screen.getByRole('link', { name: 'Sign in' })).toHaveAttribute(
      'href',
      '/sign-in',
    );
    expect(screen.getByRole('link', { name: 'Start free' })).toHaveAttribute(
      'href',
      '/sign-up',
    );
  });

  it('closes after an in-page navigation selection', async () => {
    const user = userEvent.setup();

    render(
      <MobileMarketingMenu
        navigation={navigation}
        copy={marketingMessages.en.header}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Open menu' }));
    await user.click(screen.getByRole('link', { name: 'Pricing' }));

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Menu' }),
      ).not.toBeInTheDocument(),
    );
  });

  it('closes on Escape and restores focus to the trigger', async () => {
    const user = userEvent.setup();

    render(
      <MobileMarketingMenu
        navigation={navigation}
        copy={marketingMessages.en.header}
      />,
    );

    const trigger = screen.getByRole('button', { name: 'Open menu' });
    await user.click(trigger);
    await screen.findByRole('dialog', { name: 'Menu' });
    await user.keyboard('{Escape}');

    await waitFor(() =>
      expect(
        screen.queryByRole('dialog', { name: 'Menu' }),
      ).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveFocus();
  });
});
