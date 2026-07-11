import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('root metadata', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://gleen.example');
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
});
