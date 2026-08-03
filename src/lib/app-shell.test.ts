import { describe, expect, it } from 'vitest';

import {
  appNavigation,
  deriveAppIdentity,
  isAppNavigationItemActive,
  unavailableUsage,
  type AppUsage,
} from './app-shell';

describe('application shell model', () => {
  it('derives verified identity without prototype fixtures', () => {
    expect(
      deriveAppIdentity({
        email: 'alex@example.com',
        user_metadata: { full_name: 'Alex Koval' },
      }),
    ).toEqual({
      displayName: 'Alex Koval',
      email: 'alex@example.com',
      initials: 'AK',
    });

    expect(
      deriveAppIdentity({ email: 'signal@example.com', user_metadata: {} }),
    ).toEqual({
      displayName: 'signal',
      email: 'signal@example.com',
      initials: 'SI',
    });
  });

  it('defines the approved navigation order and route-aware active state', () => {
    expect(appNavigation.map(({ id, href }) => [id, href])).toEqual([
      ['new', '/app'],
      ['history', '/app/history'],
      ['subscription', '/app/subscription'],
      ['settings', '/app/settings/profile'],
    ]);
    expect(isAppNavigationItemActive('/app', appNavigation[0])).toBe(true);
    expect(isAppNavigationItemActive('/app/history', appNavigation[0])).toBe(
      false,
    );
    expect(isAppNavigationItemActive('/app/history', appNavigation[1])).toBe(
      true,
    );
    expect(
      isAppNavigationItemActive('/app/settings/security', appNavigation[3]),
    ).toBe(true);
  });

  it('uses a truthful usage state with no invented plan values', () => {
    expect(unavailableUsage).toEqual({
      status: 'unavailable',
    });
    expect(JSON.stringify(unavailableUsage)).not.toMatch(/18|25|Prism|August/);
  });

  it('accepts an available owner usage snapshot without losing billing detail', () => {
    const usage: AppUsage = {
      status: 'available',
      planName: 'Prism Pro',
      used: 18,
      remaining: 7,
      limit: 25,
      resetAt: '2026-08-01T00:00:00.000Z',
    };

    expect(usage).toEqual({
      status: 'available',
      planName: 'Prism Pro',
      used: 18,
      remaining: 7,
      limit: 25,
      resetAt: '2026-08-01T00:00:00.000Z',
    });
  });
});
