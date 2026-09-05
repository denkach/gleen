import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/i18n/request-locale', () => ({
  getRequestLocale: vi.fn(async () => 'en'),
}));

import SettingsLayout from './layout';

describe('SettingsLayout', () => {
  it('provides localized Settings navigation around destination content', async () => {
    render(await SettingsLayout({ children: <p>Destination</p> }));
    expect(screen.getByText('Destination')).toBeVisible();
  });
});
