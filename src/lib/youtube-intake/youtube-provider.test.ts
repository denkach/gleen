import { describe, expect, it, vi } from 'vitest';

import {
  createYouTubeProvider,
  parseIsoDurationSeconds,
} from './youtube-provider';

const videoId = 'dQw4w9WgXcQ';

function youtubeResponse(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        id: videoId,
        snippet: {
          title: 'Title',
          channelTitle: 'Channel',
          thumbnails: {
            high: { url: 'https://i.ytimg.com/image.jpg' },
          },
          liveBroadcastContent: 'none',
        },
        contentDetails: { duration: 'PT1H2M3S', caption: 'true' },
        status: {
          privacyStatus: 'public',
          embeddable: true,
          uploadStatus: 'processed',
        },
        ...overrides,
      },
    ],
  };
}

describe('parseIsoDurationSeconds', () => {
  it.each([
    ['PT1H2M3S', 3723],
    ['PT45M', 2700],
    ['PT9S', 9],
    ['PT0S', 0],
  ])('parses %s', (duration, seconds) => {
    expect(parseIsoDurationSeconds(duration)).toBe(seconds);
  });

  it.each(['P1D', 'PT', 'PT1.5S', 'PT999999999999999H', ''])(
    'rejects unsupported or unsafe duration %j',
    (duration) => {
      expect(parseIsoDurationSeconds(duration)).toBeNull();
    },
  );
});

describe('createYouTubeProvider', () => {
  it('maps validated metadata and uses a fixed videos.list origin', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify(youtubeResponse()), { status: 200 }),
      );

    await expect(
      createYouTubeProvider('secret', fetcher).getVideo(videoId),
    ).resolves.toEqual({
      ok: true,
      data: {
        videoId,
        title: 'Title',
        channelTitle: 'Channel',
        durationSeconds: 3723,
        thumbnailUrl: 'https://i.ytimg.com/image.jpg',
        captionAvailable: true,
      },
    });

    const [requestUrl, requestInit] = fetcher.mock.calls[0];
    const calledUrl = new URL(requestUrl);
    expect(calledUrl.origin).toBe('https://www.googleapis.com');
    expect(calledUrl.pathname).toBe('/youtube/v3/videos');
    expect(calledUrl.searchParams.get('id')).toBe(videoId);
    expect(calledUrl.searchParams.get('part')).toBe(
      'snippet,contentDetails,status',
    );
    expect(calledUrl.href).not.toContain('secret');
    expect(requestInit.headers).toEqual({ 'X-Goog-Api-Key': 'secret' });
    expect(requestInit.signal).toBeInstanceOf(AbortSignal);
  });

  it.each([
    [401, 'provider_configuration'],
    [403, 'provider_configuration'],
    [429, 'provider_unavailable'],
    [503, 'provider_unavailable'],
  ] as const)('maps status %i to %s', async (status, code) => {
    const provider = createYouTubeProvider(
      'secret',
      vi.fn().mockResolvedValue(new Response('', { status })),
    );
    await expect(provider.getVideo(videoId)).resolves.toEqual({
      ok: false,
      code,
    });
  });

  it('maps empty results and rejected video states', async () => {
    const cases = [
      [{ items: [] }, 'video_unavailable'],
      [
        youtubeResponse({
          status: {
            privacyStatus: 'private',
            embeddable: true,
            uploadStatus: 'processed',
          },
        }),
        'video_unavailable',
      ],
      [
        youtubeResponse({
          status: {
            privacyStatus: 'public',
            embeddable: false,
            uploadStatus: 'processed',
          },
        }),
        'video_restricted',
      ],
      [
        youtubeResponse({
          snippet: {
            ...youtubeResponse().items[0].snippet,
            liveBroadcastContent: 'live',
          },
        }),
        'live_not_ready',
      ],
      [
        youtubeResponse({
          contentDetails: { duration: 'P1D', caption: 'true' },
        }),
        'unsupported_duration',
      ],
    ] as const;

    for (const [body, code] of cases) {
      const provider = createYouTubeProvider(
        'secret',
        vi
          .fn()
          .mockResolvedValue(
            new Response(JSON.stringify(body), { status: 200 }),
          ),
      );
      await expect(provider.getVideo(videoId)).resolves.toEqual({
        ok: false,
        code,
      });
    }
  });

  it.each([
    ['malformed JSON', new Response('{', { status: 200 })],
    [
      'invalid schema',
      new Response(JSON.stringify({ items: [{ id: videoId }] }), {
        status: 200,
      }),
    ],
    ['oversized response', new Response('x'.repeat(5 * 1024 * 1024 + 1))],
  ])('maps %s to provider_unavailable', async (_name, response) => {
    const provider = createYouTubeProvider(
      'secret',
      vi.fn().mockResolvedValue(response),
    );
    await expect(provider.getVideo(videoId)).resolves.toEqual({
      ok: false,
      code: 'provider_unavailable',
    });
  });

  it('maps fetch rejection and timeout to provider_unavailable', async () => {
    for (const error of [
      new Error('network'),
      new DOMException('timed out', 'TimeoutError'),
    ]) {
      const provider = createYouTubeProvider(
        'secret',
        vi.fn().mockRejectedValue(error),
      );
      await expect(provider.getVideo(videoId)).resolves.toEqual({
        ok: false,
        code: 'provider_unavailable',
      });
    }
  });
});
