import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { settingsMessages } from '@/lib/i18n/messages/settings';
import { ProfileSettings } from './profile-settings';

describe('profile settings', () => {
  it('shows editable name, initials, read-only verified email, and no upload control', () => {
    render(
      <ProfileSettings
        copy={settingsMessages.en}
        displayName="Ada Lovelace"
        email="ada@example.com"
        emailVerified
        initials="AL"
      />,
    );
    expect(screen.getByText('AL')).toBeVisible();
    expect(screen.getByRole('textbox', { name: 'Display name' })).toHaveValue(
      'Ada Lovelace',
    );
    expect(screen.getByLabelText('Email')).toHaveValue('ada@example.com');
    expect(screen.getByLabelText('Email')).toHaveAttribute('readonly');
    expect(screen.getByText('Verified')).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /upload/i }),
    ).not.toBeInTheDocument();
  });
});
