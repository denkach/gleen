'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

import type { SettingsClientCopy } from '@/lib/i18n/messages/settings';
export function SettingsShell({
  children,
  copy,
}: Readonly<{ children: ReactNode; copy: SettingsClientCopy }>) {
  const pathname = usePathname();
  if (pathname === '/app/settings') return children;

  return (
    <div className="settings-layout">
      <Link className="settings-back-link" href="/app/settings">
        <span aria-hidden="true">←</span>
        {copy.atlas.back}
      </Link>
      <div className="settings-destination" key={pathname}>
        {children}
      </div>
    </div>
  );
}
