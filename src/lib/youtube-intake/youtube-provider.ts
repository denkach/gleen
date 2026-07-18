import { z } from 'zod';

import type { VideoMetadataProvider, VideoMetadataResult } from './providers';

const maxResponseBytes = 5 * 1024 * 1024;
const youtubeVideosUrl = 'https://www.googleapis.com/youtube/v3/videos';

const youtubeResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      snippet: z.object({
        title: z.string().min(1),
        channelTitle: z.string().min(1),
        thumbnails: z.object({
          high: z.object({ url: z.url() }),
        }),
        liveBroadcastContent: z.enum(['none', 'upcoming', 'live']).optional(),
      }),
      contentDetails: z.object({
        duration: z.string().min(1),
        caption: z.enum(['true', 'false']),
      }),
      status: z.object({
        privacyStatus: z.string().min(1),
        embeddable: z.boolean(),
        uploadStatus: z.string().min(1),
      }),
    }),
  ),
});

type Fetcher = typeof fetch;

async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = response.headers.get('content-length');
  if (declaredLength !== null && Number(declaredLength) > maxResponseBytes) {
    throw new Error('Provider response exceeds size limit');
  }

  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > maxResponseBytes) {
    throw new Error('Provider response exceeds size limit');
  }
  return JSON.parse(text) as unknown;
}

export function parseIsoDurationSeconds(duration: string): number | null {
  const match = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
  if (!match || (!match[1] && !match[2] && !match[3])) {
    return null;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  const total = hours * 3600 + minutes * 60 + seconds;
  return Number.isSafeInteger(total) ? total : null;
}

function mapHttpError(status: number): VideoMetadataResult {
  if (status === 401 || status === 403) {
    return { ok: false, code: 'provider_configuration' };
  }
  if (status === 404) {
    return { ok: false, code: 'video_unavailable' };
  }
  return { ok: false, code: 'provider_unavailable' };
}

export function createYouTubeProvider(
  apiKey: string,
  fetcher: Fetcher = fetch,
): VideoMetadataProvider {
  return {
    async getVideo(videoId) {
      const url = new URL(youtubeVideosUrl);
      url.searchParams.set('part', 'snippet,contentDetails,status');
      url.searchParams.set('id', videoId);

      let response: Response;
      try {
        response = await fetcher(url, {
          headers: { 'X-Goog-Api-Key': apiKey },
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        return { ok: false, code: 'provider_unavailable' };
      }

      if (!response.ok) {
        return mapHttpError(response.status);
      }

      try {
        const parsed = youtubeResponseSchema.parse(
          await readBoundedJson(response),
        );
        const video = parsed.items[0];
        if (!video) {
          return { ok: false, code: 'video_unavailable' };
        }
        if (video.id !== videoId) {
          return { ok: false, code: 'provider_unavailable' };
        }
        if (video.status.privacyStatus !== 'public') {
          return { ok: false, code: 'video_unavailable' };
        }
        if (!video.status.embeddable) {
          return { ok: false, code: 'video_restricted' };
        }
        if (
          video.snippet.liveBroadcastContent === 'live' ||
          video.snippet.liveBroadcastContent === 'upcoming'
        ) {
          return { ok: false, code: 'live_not_ready' };
        }
        if (video.status.uploadStatus !== 'processed') {
          return { ok: false, code: 'video_unavailable' };
        }

        const durationSeconds = parseIsoDurationSeconds(
          video.contentDetails.duration,
        );
        if (durationSeconds === null) {
          return { ok: false, code: 'unsupported_duration' };
        }

        return {
          ok: true,
          data: {
            videoId: video.id,
            title: video.snippet.title,
            channelTitle: video.snippet.channelTitle,
            durationSeconds,
            thumbnailUrl: video.snippet.thumbnails.high.url,
            captionAvailable: video.contentDetails.caption === 'true',
          },
        };
      } catch {
        return { ok: false, code: 'provider_unavailable' };
      }
    },
  };
}
