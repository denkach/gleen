'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  appNavigation,
  isAppNavigationItemActive,
  type AppIdentity,
  type AppUsage,
} from '@/lib/app-shell';
import { cx } from '@/lib/cx';

import { AppIcon } from './app-icon';

const unavailableDescriptionId = 'app-shell-unavailable-description';

function isResultVideoRoute(pathname: string): boolean {
  return (
    /^\/app\/video\/[^/]+\/?$/.test(pathname) ||
    /^\/app-shell-fixture\/app\/video\/[^/]+\/?$/.test(pathname)
  );
}

type AppShellProps = Readonly<{
  children: React.ReactNode;
  identity: AppIdentity;
  usage: AppUsage;
  pathnameOverride?: string;
}>;

function Brand() {
  return (
    <Link className="app-brand" href="/app" aria-label="Gleen home">
      <span className="app-brand-mark" />
      <span>Gleen</span>
    </Link>
  );
}

function UnavailableButton({
  label,
  icon,
}: Readonly<{ label: string; icon: string }>) {
  return (
    <button
      className="app-action-button"
      type="button"
      aria-label={label}
      aria-describedby={unavailableDescriptionId}
      disabled
    >
      <AppIcon name={icon} />
    </button>
  );
}

export function AppShell({
  children,
  identity,
  usage,
  pathnameOverride,
}: AppShellProps) {
  const runtimePathname = usePathname();
  const pathname = pathnameOverride ?? runtimePathname;
  const currentItem =
    appNavigation.find((item) => isAppNavigationItemActive(pathname, item)) ??
    appNavigation[0];
  const resultVideoRoute = isResultVideoRoute(pathname);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-content">
        Skip to content
      </a>
      <span className="app-visually-hidden" id={unavailableDescriptionId}>
        Unavailable in this version
      </span>

      <aside className="sidebar">
        <Brand />
        <div className="sidebar-section-label">Workspace</div>
        <nav className="side-nav" aria-label="Application navigation">
          {appNavigation.map((item) => {
            const active = isAppNavigationItemActive(pathname, item);
            return (
              <Link
                className={cx('side-link', active && 'active')}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                key={item.href}
              >
                <AppIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-section-label">Help</div>
        <nav className="side-nav" aria-label="Help navigation">
          <button
            className="side-link"
            type="button"
            aria-describedby={unavailableDescriptionId}
            disabled
          >
            <AppIcon name="help" />
            <span>Support</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-mini">{usage.label}</div>
          <Link className="user-chip" href="/app/settings/profile">
            <span className="avatar">{identity.initials}</span>
            <span className="user-chip-text">
              <strong>{identity.displayName}</strong>
              <span>{identity.email}</span>
            </span>
            <AppIcon name="chevron" className="app-icon-sm" />
          </Link>
        </div>
      </aside>

      <div className="app-main">
        <header className="mobile-topbar">
          <Brand />
          <div className="topbar-actions">
            <UnavailableButton label="Notifications" icon="bell" />
            <span className="avatar">{identity.initials}</span>
          </div>
        </header>
        <header className="app-topbar">
          <div className="topbar-title">{currentItem.label}</div>
          <div className="topbar-actions">
            <div className="usage-pill">{usage.label}</div>
            <UnavailableButton label="Change language" icon="globe" />
            <UnavailableButton label="Notifications" icon="bell" />
            <span className="avatar">{identity.initials}</span>
          </div>
        </header>
        <main className="app-content" id="app-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav
        className="bottom-nav"
        aria-label="Mobile navigation"
        data-result-video-route={resultVideoRoute || undefined}
      >
        {appNavigation.map((item) => {
          const active = isAppNavigationItemActive(pathname, item);
          return (
            <Link
              className={cx('bottom-link', active && 'active')}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              key={item.href}
            >
              <AppIcon name={item.icon} />
              <span>{item.mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
