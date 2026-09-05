export const settingsDestinations = [
  { key: 'profile', href: '/app/settings/profile', icon: 'profile' },
  {
    key: 'preferences',
    href: '/app/settings/preferences',
    icon: 'sliders',
  },
  { key: 'language', href: '/app/settings/language', icon: 'language' },
  {
    key: 'integrations',
    href: '/app/settings/integrations',
    icon: 'integration',
  },
  { key: 'security', href: '/app/settings/security', icon: 'shield' },
  { key: 'data', href: '/app/settings/data', icon: 'database' },
] as const;

export type SettingsDestination = (typeof settingsDestinations)[number];
export type SettingsDestinationKey = SettingsDestination['key'];

export type SettingsDestinationSummary = Readonly<{
  state: 'ready' | 'unavailable';
  text: string;
}>;

export type SettingsOverviewModel = Readonly<
  Record<SettingsDestinationKey, SettingsDestinationSummary>
>;
