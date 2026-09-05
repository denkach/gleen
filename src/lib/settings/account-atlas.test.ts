import { describe, expect, it } from 'vitest';

import { settingsDestinations } from './account-atlas';

describe('settingsDestinations', () => {
  it('defines the six Account Atlas destinations in stable order', () => {
    expect(settingsDestinations.map(({ key, href }) => [key, href])).toEqual([
      ['profile', '/app/settings/profile'],
      ['preferences', '/app/settings/preferences'],
      ['language', '/app/settings/language'],
      ['integrations', '/app/settings/integrations'],
      ['security', '/app/settings/security'],
      ['data', '/app/settings/data'],
    ]);
  });

  it('uses a distinct icon identity for every destination', () => {
    expect(new Set(settingsDestinations.map(({ icon }) => icon)).size).toBe(6);
  });
});
