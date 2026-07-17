const videoIdPattern = /^[A-Za-z0-9_-]{11}$/;
const longHosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com']);

export type YouTubeUrlResult =
  | Readonly<{ ok: true; videoId: string; canonicalUrl: string }>
  | Readonly<{ ok: false; code: 'invalid_url' }>;

export function parseYouTubeUrl(raw: string): YouTubeUrlResult {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { ok: false, code: 'invalid_url' };
  }

  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    (!longHosts.has(url.hostname) && url.hostname !== 'youtu.be')
  ) {
    return { ok: false, code: 'invalid_url' };
  }

  const segments = url.pathname.split('/').filter(Boolean);
  const pathId =
    url.hostname === 'youtu.be'
      ? segments.length === 1
        ? segments[0]
        : undefined
      : segments.length === 2 &&
          ['shorts', 'embed', 'live'].includes(segments[0])
        ? segments[1]
        : undefined;
  const queryIds = url.searchParams.getAll('v');
  const distinctQueryIds = new Set(queryIds);
  const queryId =
    longHosts.has(url.hostname) && url.pathname === '/watch'
      ? queryIds[0]
      : undefined;
  const videoId = pathId ?? queryId;
  const conflictingQuery = pathId && queryIds.some((id) => id !== pathId);

  if (
    !videoIdPattern.test(videoId ?? '') ||
    distinctQueryIds.size > 1 ||
    conflictingQuery
  ) {
    return { ok: false, code: 'invalid_url' };
  }

  return {
    ok: true,
    videoId: videoId!,
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
  };
}
