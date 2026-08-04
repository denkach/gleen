import type { LocaleSwitcherCopy } from './messages/shared';

export function materializeLocaleSwitcherCopy(
  copy: LocaleSwitcherCopy,
): LocaleSwitcherCopy {
  return {
    localeSwitcher: {
      label: copy.localeSwitcher.label,
      menuLabel: copy.localeSwitcher.menuLabel,
      saving: copy.localeSwitcher.saving,
      errors: {
        invalidLocale: copy.localeSwitcher.errors.invalidLocale,
        profileUpdateFailed: copy.localeSwitcher.errors.profileUpdateFailed,
      },
    },
  };
}
