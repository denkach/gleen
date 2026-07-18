import { parseYouTubeUrl } from './url';

const unsafePathCharacters = /[\\\u0000-\u001f]/;

export function buildAnalysisContinuation(rawUrl: string): string | null {
  if (unsafePathCharacters.test(rawUrl)) return null;

  const parsed = parseYouTubeUrl(rawUrl);
  if (!parsed.ok) return null;

  return `/app?continuation=${encodeURIComponent(parsed.canonicalUrl)}`;
}

export function parseAnalysisContinuation(
  candidate: string | null,
): { rawUrl: string } | null {
  if (!candidate || unsafePathCharacters.test(candidate)) return null;

  const parsed = parseYouTubeUrl(candidate);
  if (!parsed.ok || parsed.canonicalUrl !== candidate) return null;

  return { rawUrl: parsed.canonicalUrl };
}
