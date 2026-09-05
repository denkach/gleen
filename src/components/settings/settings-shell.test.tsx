import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { settingsMessages } from '@/lib/i18n/messages/settings';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname }));

import { SettingsShell } from './settings-shell';

describe('SettingsShell', () => {
  beforeEach(() => usePathname.mockReturnValue('/app/settings/profile'));

  it('renders all destinations and marks the active route', () => {
    render(
      <SettingsShell copy={settingsMessages.en}>
        <p>Profile content</p>
      </SettingsShell>,
    );

    expect(
      screen.getByRole('navigation', { name: 'Settings sections' }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(7);
    expect(screen.getByRole('link', { name: 'Profile' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByText('Profile content')).toBeVisible();
  });

  it('keeps the overview free of duplicate sub-navigation', () => {
    usePathname.mockReturnValue('/app/settings');
    render(
      <SettingsShell copy={settingsMessages.en}>
        <p>Atlas content</p>
      </SettingsShell>,
    );

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByText('Atlas content')).toBeVisible();
  });
});
