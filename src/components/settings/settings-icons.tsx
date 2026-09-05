import type { SettingsDestination } from '@/lib/settings/account-atlas';

export function SettingsIcon({
  name,
}: Readonly<{ name: SettingsDestination['icon'] }>) {
  const paths = {
    profile: (
      <>
        <circle cx="12" cy="8" r="3" />
        <path d="M5.5 19c.8-3.4 3-5 6.5-5s5.7 1.6 6.5 5" />
      </>
    ),
    sliders: (
      <>
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10" />
        <circle cx="16" cy="7" r="2" />
        <circle cx="8" cy="17" r="2" />
      </>
    ),
    language: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M4 12h16M12 4c2 2.2 3 4.9 3 8s-1 5.8-3 8M12 4c-2 2.2-3 4.9-3 8s1 5.8 3 8" />
      </>
    ),
    integration: (
      <>
        <path d="M8 4v4H4M16 20v-4h4M5 8a8 8 0 0 1 13-2M19 16A8 8 0 0 1 6 18" />
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
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}
