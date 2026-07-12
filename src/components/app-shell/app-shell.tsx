import type { AppIdentity, AppUsage } from '@/lib/app-shell';

type AppShellProps = Readonly<{
  children: React.ReactNode;
  identity: AppIdentity;
  usage: AppUsage;
}>;

export function AppShell({ children, identity }: AppShellProps) {
  return (
    <div>
      <span>{identity.displayName}</span>
      {children}
    </div>
  );
}
