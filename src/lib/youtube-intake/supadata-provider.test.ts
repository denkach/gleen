import { describe, expect, it, vi } from 'vitest';

import { createSupadataProvider } from './supadata-provider';

const canonicalUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';

describe('createSupadataProvider', () => {
  it('always requests a native timestamped transcript without AI fallback', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          lang: 'en',
          content: [{ text: 'Hello', offset: 0, duration: 1200 }],
        }),
        { status: 200 },
      ),
    );

    await expect(
      createSupadataProvider('secret', fetcher).getNativeTranscript(
        canonicalUrl,
        'en',
      ),
    ).resolves.toEqual({
      ok: true,
      language: 'en',
      segments: [{ text: 'Hello', offsetMs: 0, durationMs: 1200 }],
    });

    const [requestUrl, requestInit] = fetcher.mock.calls[0];
    const url = new URL(requestUrl);
    expect(url.origin).toBe('https://api.supadata.ai');
    expect(url.pathname).toBe('/v1/transcript');
    expect(url.searchParams.get('url')).toBe(canonicalUrl);
    expect(url.searchParams.get('lang')).toBe('en');
    expect(url.searchParams.get('mode')).toBe('native');
    expect(url.searchParams.get('text')).toBe('false');
    expect(url.href).not.toMatch(/auto|generate|secret/);
    expect(requestInit.headers).toEqual({ 'x-api-key': 'secret' });
    expect(requestInit.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [206, 'transcript_unavailable'],
    [401, 'provider_configuration'],
    [402, 'provider_configuration'],
    [429, 'provider_unavailable'],
    [503, 'provider_unavailable'],
  ] as const)('maps status %i to %s', async (status, code) => {
    const provider = createSupadataProvider(
      'secret',
      vi.fn().mockResolvedValue(new Response('', { status })),
    );
    await expect(provider.getNativeTranscript(canonicalUrl)).resolves.toEqual({
      ok: false,
      code,
    });
  });

  it('maps a missing requested language distinctly', async () => {
    const provider = createSupadataProvider(
      'secret',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    );
    await expect(
      provider.getNativeTranscript(canonicalUrl, 'sk'),
    ).resolves.toEqual({
      ok: false,
      code: 'transcript_language_unavailable',
    });
  });

  it.each([
    ['malformed JSON', new Response('{', { status: 200 })],
    [
      'invalid segment',
      new Response(
        JSON.stringify({
          lang: 'en',
          content: [{ text: 'Hello', offset: -1, duration: 0 }],
        }),
      ),
    ],
    ['oversized response', new Response('x'.repeat(5 * 1024 * 1024 + 1))],
  ])('maps %s to provider_unavailable', async (_name, response) => {
    const provider = createSupadataProvider(
      'secret',
      vi.fn().mockResolvedValue(response),
    );
    await expect(provider.getNativeTranscript(canonicalUrl)).resolves.toEqual({
      ok: false,
      code: 'provider_unavailable',
    });
  });

  it('maps fetch rejection and timeout to provider_unavailable', async () => {
    for (const error of [
      new Error('network'),
      new DOMException('timed out', 'TimeoutError'),
    ]) {
      const provider = createSupadataProvider(
        'secret',
        vi.fn().mockRejectedValue(error),
      );
      await expect(provider.getNativeTranscript(canonicalUrl)).resolves.toEqual(
        { ok: false, code: 'provider_unavailable' },
      );
    }
  });
});
