import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { settingsMessages } from '@/lib/i18n/messages/settings';

const { usePathname } = vi.hoisted(() => ({ usePathname: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname }));

import { SettingsShell } from './settings-shell';

describe('SettingsShell', () => {
  beforeEach(() => usePathname.mockReturnValue('/app/settings/profile'));

  it('keeps destination pages focused with a single route-aware back link', () => {
    render(
      <SettingsShell copy={settingsMessages.en}>
        <p>Profile content</p>
      </SettingsShell>,
    );

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link')).toHaveLength(1);
    expect(
      screen.getByRole('link', { name: 'Back to Settings' }),
    ).toHaveAttribute('href', '/app/settings');
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
