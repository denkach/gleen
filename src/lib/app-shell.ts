export type AppIdentity = Readonly<{
  displayName: string;
  email: string;
  initials: string;
}>;

export type AppUsage = Readonly<{
  status: 'unavailable';
  label: string;
}>;

export type AppNavigationItem = Readonly<{
  label: 'New analysis' | 'History' | 'Subscription' | 'Settings';
  mobileLabel: 'New' | 'History' | 'Plan' | 'Profile';
  href: string;
  icon: 'plus' | 'history' | 'credit' | 'settings';
  match: 'exact' | 'prefix';
}>;

export const appNavigation: readonly AppNavigationItem[] = [
  {
    label: 'New analysis',
    mobileLabel: 'New',
    href: '/app',
    icon: 'plus',
    match: 'exact',
  },
  {
    label: 'History',
    mobileLabel: 'History',
    href: '/app/history',
    icon: 'history',
    match: 'prefix',
  },
  {
    label: 'Subscription',
    mobileLabel: 'Plan',
    href: '/app/subscription',
    icon: 'credit',
    match: 'prefix',
  },
  {
    label: 'Settings',
    mobileLabel: 'Profile',
    href: '/app/settings/profile',
    icon: 'settings',
    match: 'prefix',
  },
] as const;

export const unavailableUsage: AppUsage = Object.freeze({
  status: 'unavailable',
  label: 'Usage available with billing',
});

type IdentitySource = Readonly<{
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
}>;

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    words.length > 1
      ? `${words[0][0]}${words[words.length - 1][0]}`
      : words[0]?.slice(0, 2) || 'GL';
  return initials.toLocaleUpperCase('en');
}

export function deriveAppIdentity(user: IdentitySource): AppIdentity {
  const email = user.email?.trim() || 'Account';
  const metadata = user.user_metadata ?? {};
  const candidate = [metadata.full_name, metadata.name].find(
    (value): value is string =>
      typeof value === 'string' && value.trim() !== '',
  );
  const displayName = candidate?.trim() || email.split('@')[0] || 'Account';
  return { displayName, email, initials: initialsFor(displayName) };
}

export function isAppNavigationItemActive(
  pathname: string,
  item: AppNavigationItem,
): boolean {
  const matchHref =
    item.label === 'Settings' ? item.href.replace(/\/[^/]+$/, '') : item.href;

  return item.match === 'exact'
    ? pathname === matchHref
    : pathname === matchHref || pathname.startsWith(`${matchHref}/`);
}
