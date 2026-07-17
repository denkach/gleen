import { z } from 'zod';

import type { TranscriptProvider, TranscriptResult } from './providers';

const maxResponseBytes = 5 * 1024 * 1024;
const supadataTranscriptUrl = 'https://api.supadata.ai/v1/transcript';

const transcriptResponseSchema = z.object({
  lang: z.string().min(1),
  content: z.array(
    z.object({
      text: z.string().min(1),
      offset: z.number().int().nonnegative().safe(),
      duration: z.number().int().positive().safe(),
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

function mapHttpError(
  status: number,
  preferredLanguage?: string,
): TranscriptResult {
  if (status === 206) {
    return { ok: false, code: 'transcript_unavailable' };
  }
  if (status === 401 || status === 402) {
    return { ok: false, code: 'provider_configuration' };
  }
  if (status === 404) {
    return {
      ok: false,
      code: preferredLanguage
        ? 'transcript_language_unavailable'
        : 'transcript_unavailable',
    };
  }
  return { ok: false, code: 'provider_unavailable' };
}

export function createSupadataProvider(
  apiKey: string,
  fetcher: Fetcher = fetch,
): TranscriptProvider {
  return {
    async getNativeTranscript(canonicalUrl, preferredLanguage) {
      const url = new URL(supadataTranscriptUrl);
      url.searchParams.set('url', canonicalUrl);
      url.searchParams.set('mode', 'native');
      url.searchParams.set('text', 'false');
      if (preferredLanguage) {
        url.searchParams.set('lang', preferredLanguage);
      }

      let response: Response;
      try {
        response = await fetcher(url, {
          headers: { 'x-api-key': apiKey },
          signal: AbortSignal.timeout(10_000),
        });
      } catch {
        return { ok: false, code: 'provider_unavailable' };
      }

      if (response.status === 206 || !response.ok) {
        return mapHttpError(response.status, preferredLanguage);
      }

      try {
        const parsed = transcriptResponseSchema.parse(
          await readBoundedJson(response),
        );
        if (parsed.content.length === 0) {
          return { ok: false, code: 'transcript_unavailable' };
        }
        return {
          ok: true,
          language: parsed.lang,
          segments: parsed.content.map((segment) => ({
            text: segment.text,
            offsetMs: segment.offset,
            durationMs: segment.duration,
          })),
        };
      } catch {
        return { ok: false, code: 'provider_unavailable' };
      }
    },
  };
}
