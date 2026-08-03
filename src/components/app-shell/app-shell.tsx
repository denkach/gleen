'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LocaleSwitcher } from '@/components/i18n/locale-switcher';

import {
  appNavigation,
  isAppNavigationItemActive,
  type AppIdentity,
  type AppUsage,
} from '@/lib/app-shell';
import { cx } from '@/lib/cx';
import { appUsageLabel } from '@/lib/i18n/app-format';
import type { AppMessages } from '@/lib/i18n/messages/app';
import type { Locale } from '@/lib/i18n/locales';
import type { LocaleSwitcherCopy } from '@/lib/i18n/messages/shared';

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
  copy: AppMessages;
  identity: AppIdentity;
  locale: Locale;
  localeSwitcherCopy: LocaleSwitcherCopy;
  usage: AppUsage;
  pathnameOverride?: string;
}>;

function Brand({ label }: Readonly<{ label: string }>) {
  return (
    <Link className="app-brand" href="/app" aria-label={label}>
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
  copy,
  identity,
  locale,
  localeSwitcherCopy,
  usage,
  pathnameOverride,
}: AppShellProps) {
  const runtimePathname = usePathname();
  const pathname = pathnameOverride ?? runtimePathname;
  const currentItem =
    appNavigation.find((item) => isAppNavigationItemActive(pathname, item)) ??
    appNavigation[0];
  const resultVideoRoute = isResultVideoRoute(pathname);
  const usageLabel =
    usage.status === 'available'
      ? appUsageLabel(locale, copy, usage.remaining)
      : copy.shell.usageUnavailable;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#app-content">
        {copy.shell.skipToContent}
      </a>
      <span className="app-visually-hidden" id={unavailableDescriptionId}>
        {copy.shell.unavailableDescription}
      </span>

      <aside className="sidebar">
        <Brand label={copy.shell.brandHome} />
        <div className="sidebar-section-label">{copy.shell.workspace}</div>
        <nav className="side-nav" aria-label={copy.shell.applicationNavigation}>
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
                <span>{copy.shell.navigation[item.id].label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="sidebar-section-label">{copy.shell.help}</div>
        <nav className="side-nav" aria-label={copy.shell.helpNavigation}>
          <button
            className="side-link"
            type="button"
            aria-describedby={unavailableDescriptionId}
            disabled
          >
            <AppIcon name="help" />
            <span>{copy.shell.support}</span>
          </button>
        </nav>
        <div className="sidebar-bottom">
          <div className="usage-mini">{usageLabel}</div>
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
          <Brand label={copy.shell.brandHome} />
          <div className="topbar-actions">
            <LocaleSwitcher
              locale={locale}
              copy={localeSwitcherCopy}
              variant="app"
            />
            <span className="avatar">{identity.initials}</span>
          </div>
        </header>
        <header className="app-topbar">
          <div className="topbar-title">
            {copy.shell.navigation[currentItem.id].label}
          </div>
          <div className="topbar-actions">
            <div className="usage-pill">{usageLabel}</div>
            <LocaleSwitcher
              locale={locale}
              copy={localeSwitcherCopy}
              variant="app"
            />
            <UnavailableButton label={copy.shell.notifications} icon="bell" />
            <span className="avatar">{identity.initials}</span>
          </div>
        </header>
        <main className="app-content" id="app-content" tabIndex={-1}>
          {children}
        </main>
      </div>

      <nav
        className="bottom-nav"
        aria-label={copy.shell.mobileNavigation}
        data-result-video-route={resultVideoRoute || undefined}
      >
        {appNavigation.map((item) => {
          const active = isAppNavigationItemActive(pathname, item);
          return (
            <Link
              className={cx('bottom-link', active && 'active')}
              href={item.href}
              aria-label={copy.shell.navigation[item.id].label}
              aria-current={active ? 'page' : undefined}
              key={item.href}
            >
              <AppIcon name={item.icon} />
              <span>{copy.shell.navigation[item.id].mobileLabel}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
