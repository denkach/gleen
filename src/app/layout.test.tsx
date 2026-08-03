import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRequestLocale } = vi.hoisted(() => ({
  getRequestLocale: vi.fn(),
}));

vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));

describe('root metadata', () => {
  const germanDescription =
    'Verwandle jedes YouTube-Video in eine strukturierte Zusammenfassung, intelligente Karteikarten, präzise Zeitstempel und exportfertiges Wissen.';

  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://gleen.example');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://gleen-test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    getRequestLocale.mockResolvedValue('de');
  });

  it('describes and canonicalizes the approved landing page in the request locale', async () => {
    const { generateMetadata } = await import('./layout');
    const metadata = await generateMetadata();

    expect(metadata.title).toBe('Gleen — Weniger schauen. Mehr verstehen.');
    expect(metadata.description).toBe(germanDescription);
    expect(metadata.alternates).toEqual({ canonical: '/' });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.metadataBase).toEqual(new URL('https://gleen.example'));
    expect(metadata.openGraph).toMatchObject({
      title: 'Gleen — Weniger schauen. Mehr verstehen.',
      description: germanDescription,
    });
    expect(metadata.twitter).toMatchObject({
      title: 'Gleen — Weniger schauen. Mehr verstehen.',
      description: germanDescription,
    });
  });

  it('sets the document language from the resolved interface locale', async () => {
    const { default: RootLayout } = await import('./layout');
    const layout = await RootLayout({ children: <p>Child</p> });

    expect(layout.props.lang).toBe('de-DE');
  });
});
