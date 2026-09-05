import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { settingsMessages } from '@/lib/i18n/messages/settings';
import type { SettingsOverviewModel } from '@/lib/settings/account-atlas';

import { SettingsOverview } from './settings-overview';

const summaries: SettingsOverviewModel = {
  profile: { state: 'ready', text: 'Alex · Verified email' },
  preferences: { state: 'ready', text: 'Balanced · 18 cards' },
  language: { state: 'ready', text: 'English · Українська output' },
  integrations: {
    state: 'unavailable',
    text: 'Integration status unavailable',
  },
  security: { state: 'ready', text: 'Email sign-in' },
  data: { state: 'ready', text: 'History and exports' },
};

describe('SettingsOverview', () => {
  it('renders six whole-card links with truthful independent summaries', () => {
    const { container } = render(
      <SettingsOverview copy={settingsMessages.en} summaries={summaries} />,
    );

    expect(screen.getAllByTestId('settings-destination-card')).toHaveLength(6);
    expect(
      screen.getByRole('navigation', { name: 'Settings sections' }),
    ).toBeVisible();
    expect(screen.getByRole('link', { name: /Profile/ })).toHaveAttribute(
      'href',
      '/app/settings/profile',
    );
    expect(screen.getByText('Integration status unavailable')).toBeVisible();
    expect(screen.getByText('Balanced · 18 cards')).toBeVisible();
    expect(
      container.querySelectorAll('.settings-destination-card button'),
    ).toHaveLength(0);
  });
});
