import { describe, expect, it } from 'vitest';

import { materializeLocaleSwitcherCopy } from './locale-switcher-copy';
import { sharedMessages } from './messages/shared';

describe('materializeLocaleSwitcherCopy', () => {
  it('returns every panel string and stable error code without obsolete or function values', () => {
    const copy = materializeLocaleSwitcherCopy(sharedMessages.en);

    expect(copy.localeSwitcher).toMatchObject({
      label: 'Language',
      panelTitle: 'Language',
      panelDescription: 'Choose your interface language',
      close: 'Close language selector',
      selected: 'Selected',
      quickSwitch: 'Quick switch',
      changedTemplate: 'Language changed to {language}',
      errors: {
        invalidLocale: 'Choose a supported language.',
        profileUpdateFailed:
          'Your language was changed on this device, but could not be synchronized with your profile. Try again.',
      },
    });
    expect(copy.localeSwitcher).not.toHaveProperty('saving');
    expect(
      Object.values(copy.localeSwitcher).every(
        (value) => typeof value !== 'function',
      ),
    ).toBe(true);
  });
});
