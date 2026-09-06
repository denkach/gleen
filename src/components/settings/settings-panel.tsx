import type { ReactNode } from 'react';

import type { SettingsDestination } from '@/lib/settings/account-atlas';

import { SettingsIcon } from './settings-icons';

type SettingsPanelProps = Readonly<{
  children: ReactNode;
  description: string;
  icon: SettingsDestination['icon'];
  title: string;
}>;

export function SettingsPanel({
  children,
  description,
  icon,
  title,
}: SettingsPanelProps) {
  return (
    <article className="settings-panel" data-icon={icon}>
      <header className="settings-panel__head">
        <span className="settings-panel__icon" aria-hidden="true">
          <SettingsIcon name={icon} />
        </span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>
      <div className="settings-panel__body">{children}</div>
    </article>
  );
}

export function SettingsSaveIcon() {
  return (
    <span className="settings-button__icon" aria-hidden="true">
      <svg viewBox="0 0 24 24">
        <path d="M5 4h11l3 3v13H5z" />
        <path d="M8 4v6h8V4M8 16h8" />
      </svg>
    </span>
  );
}
