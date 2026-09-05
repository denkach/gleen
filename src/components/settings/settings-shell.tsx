'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import type { SettingsClientCopy } from '@/lib/i18n/messages/settings';
import { settingsDestinations } from '@/lib/settings/account-atlas';

import { SettingsIcon } from './settings-icons';

export function SettingsShell({
  children,
  copy,
}: Readonly<{ children: ReactNode; copy: SettingsClientCopy }>) {
  const pathname = usePathname();
  if (pathname === '/app/settings') return children;

  return (
    <div className="settings-layout">
      <aside className="settings-subnav">
        <Link className="settings-back-link" href="/app/settings">
          <span aria-hidden="true">←</span>
          {copy.atlas.back}
        </Link>
        <nav aria-label={copy.atlas.navigationLabel} className="settings-nav">
          {settingsDestinations.map((destination) => {
            const active = pathname === destination.href;
            return (
              <Link
                className="settings-link"
                href={destination.href}
                aria-current={active ? 'page' : undefined}
                key={destination.key}
              >
                <SettingsIcon name={destination.icon} />
                <span>{copy.atlas.destinations[destination.key].title}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="settings-destination">{children}</div>
    </div>
  );
}
