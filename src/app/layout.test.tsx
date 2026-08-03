import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getRequestLocale } = vi.hoisted(() => ({
  getRequestLocale: vi.fn(),
}));

vi.mock('@/lib/i18n/request-locale', () => ({ getRequestLocale }));

describe('root metadata', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://gleen.example');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://gleen-test.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
    getRequestLocale.mockResolvedValue('de');
  });

  it('describes and canonicalizes the approved landing page', async () => {
    const { metadata } = await import('./layout');

    expect(metadata.title).toBe('Gleen — Watch less. Understand more.');
    expect(metadata.description).toBe(
      'Turn any YouTube video into a structured summary, smart flashcards, precise timestamps, and export-ready knowledge.',
    );
    expect(metadata.alternates).toEqual({ canonical: '/' });
    expect(metadata.robots).toEqual({ index: true, follow: true });
    expect(metadata.metadataBase).toEqual(new URL('https://gleen.example'));
  });

  it('sets the document language from the resolved interface locale', async () => {
    const { default: RootLayout } = await import('./layout');
    const layout = await RootLayout({ children: <p>Child</p> });

    expect(layout.props.lang).toBe('de-DE');
  });
});
