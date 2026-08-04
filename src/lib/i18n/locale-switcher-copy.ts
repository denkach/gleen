import type { LocaleSwitcherCopy } from './messages/shared';

export function materializeLocaleSwitcherCopy(
  copy: LocaleSwitcherCopy,
): LocaleSwitcherCopy {
  return {
    localeSwitcher: {
      label: copy.localeSwitcher.label,
      panelTitle: copy.localeSwitcher.panelTitle,
      panelDescription: copy.localeSwitcher.panelDescription,
      close: copy.localeSwitcher.close,
      selected: copy.localeSwitcher.selected,
      quickSwitch: copy.localeSwitcher.quickSwitch,
      changedTemplate: copy.localeSwitcher.changedTemplate,
      errors: {
        invalidLocale: copy.localeSwitcher.errors.invalidLocale,
        profileUpdateFailed: copy.localeSwitcher.errors.profileUpdateFailed,
      },
    },
  };
}
