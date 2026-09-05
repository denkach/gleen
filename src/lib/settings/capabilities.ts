export type CapabilityAction =
  | Readonly<{ kind: 'link'; href: string; label?: string }>
  | Readonly<{ kind: 'unavailable' }>;

export type Capability = Readonly<{
  key: string;
  title: string;
  detail: string;
  action: CapabilityAction;
}>;

export function buildIntegrationCapabilities(): readonly Capability[] {
  return ['notion', 'obsidian', 'notebooklm'].map((key) => ({
    key,
    title: key,
    detail: 'unavailable',
    action: { kind: 'unavailable' } as const,
  }));
}

function titleCase(value: string): string {
  const normalized = value.trim() || 'email';
  return `${normalized.charAt(0).toLocaleUpperCase('en')}${normalized.slice(1)}`;
}

export function buildSecurityCapabilities(
  provider?: string,
): readonly Capability[] {
  return [
    {
      key: 'method',
      title: 'method',
      detail: titleCase(provider ?? 'email'),
      action: { kind: 'unavailable' },
    },
    {
      key: 'recovery',
      title: 'recovery',
      detail: 'available',
      action: { kind: 'link', href: '/forgot-password' },
    },
  ];
}

export function buildDataCapabilities(): readonly Capability[] {
  return [
    {
      key: 'history',
      title: 'history',
      detail: 'available',
      action: { kind: 'link', href: '/app/history' },
    },
    {
      key: 'export',
      title: 'export',
      detail: 'result-owned',
      action: { kind: 'unavailable' },
    },
    {
      key: 'deletion',
      title: 'deletion',
      detail: 'unavailable',
      action: { kind: 'unavailable' },
    },
  ];
}
