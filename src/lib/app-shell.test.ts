import { describe, expect, it } from 'vitest';

import {
  appNavigation,
  deriveAppIdentity,
  isAppNavigationItemActive,
  unavailableUsage,
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
    expect(appNavigation.map(({ label, href }) => [label, href])).toEqual([
      ['New analysis', '/app'],
      ['History', '/app/history'],
      ['Subscription', '/app/subscription'],
      ['Settings', '/app/settings/profile'],
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
      label: 'Usage available with billing',
    });
    expect(JSON.stringify(unavailableUsage)).not.toMatch(/18|25|Prism|August/);
  });
});
