import type { SettingsDestination } from '@/lib/settings/account-atlas';

export function SettingsIcon({
  name,
}: Readonly<{ name: SettingsDestination['icon'] }>) {
  const paths = {
    profile: (
      <>
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5.5 19c.9-4 3-6 6.5-6s5.6 2 6.5 6" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h8M16 7h4M4 17h4M12 17h8" />
        <circle cx="14" cy="7" r="2" />
        <circle cx="10" cy="17" r="2" />
      </>
    ),
    language: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M3.8 12h16.4M12 3.5c2.4 2.2 3.7 5 3.7 8.5s-1.3 6.3-3.7 8.5M12 3.5C9.6 5.7 8.3 8.5 8.3 12s1.3 6.3 3.7 8.5" />
      </>
    ),
    integration: (
      <>
        <path d="m9.7 14.3 4.6-4.6" />
        <path d="m7.1 16.9-1.2 1.2a3.5 3.5 0 0 1-5-5l3.6-3.6a3.5 3.5 0 0 1 5 0M16.9 7.1l1.2-1.2a3.5 3.5 0 0 1 5 5l-3.6 3.6a3.5 3.5 0 0 1-5 0" />
      </>
    ),
    shield: (
      <>
        <path d="M12 3 5 6v5c0 4.5 2.7 7.8 7 10 4.3-2.2 7-5.5 7-10V6l-7-3Z" />
        <path d="m9 12 2 2 4-5" />
      </>
    ),
    database: (
      <>
        <ellipse cx="12" cy="5.5" rx="7" ry="3" />
        <path d="M5 5.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6M5 11.5v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </>
    ),
  } as const;

  return (
    <svg
      className="settings-icon"
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
