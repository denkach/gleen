export type AppIdentity = Readonly<{
  displayName: string;
  email: string;
  initials: string;
}>;

export type AppUsage =
  | Readonly<{
      status: 'unavailable';
    }>
  | Readonly<{
      status: 'available';
      planName: string;
      used: number;
      remaining: number;
      limit: number;
      resetAt: string;
    }>;

export type AppNavigationItem = Readonly<{
  id: 'new' | 'history' | 'subscription' | 'settings';
  href: string;
  icon: 'plus' | 'history' | 'credit' | 'settings';
  match: 'exact' | 'prefix';
}>;

export const appNavigation: readonly AppNavigationItem[] = [
  {
    id: 'new',
    href: '/app',
    icon: 'plus',
    match: 'exact',
  },
  {
    id: 'history',
    href: '/app/history',
    icon: 'history',
    match: 'prefix',
  },
  {
    id: 'subscription',
    href: '/app/subscription',
    icon: 'credit',
    match: 'prefix',
  },
  {
    id: 'settings',
    href: '/app/settings',
    icon: 'settings',
    match: 'prefix',
  },
] as const;

export const unavailableUsage: AppUsage = Object.freeze({
  status: 'unavailable',
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
  const email = user.email?.trim() || 'Gleen';
  const metadata = user.user_metadata ?? {};
  const candidate = [metadata.full_name, metadata.name].find(
    (value): value is string =>
      typeof value === 'string' && value.trim() !== '',
  );
  const displayName = candidate?.trim() || email.split('@')[0] || 'Gleen';
  return { displayName, email, initials: initialsFor(displayName) };
}

export function isAppNavigationItemActive(
  pathname: string,
  item: AppNavigationItem,
): boolean {
  return item.match === 'exact'
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(`${item.href}/`);
}
