import { afterEach, expect, test, vi } from 'vitest';

import { flushPlaybackPositionOnPageHide } from './playback-pagehide-transport';

afterEach(() => vi.unstubAllGlobals());

test('starts an authenticated same-origin keepalive request', () => {
  const fetch = vi.fn(() => new Promise<Response>(() => undefined));
  vi.stubGlobal('fetch', fetch);

  flushPlaybackPositionOnPageHide({
    analysisId: '22222222-2222-4222-8222-222222222222',
    positionMs: 12_000,
    revision: 1_752_844_800_001,
  });

  expect(fetch).toHaveBeenCalledExactlyOnceWith(
    '/api/result/playback-position',
    {
      method: 'POST',
      credentials: 'same-origin',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        analysisId: '22222222-2222-4222-8222-222222222222',
        positionMs: 12_000,
        revision: 1_752_844_800_001,
      }),
    },
  );
});
