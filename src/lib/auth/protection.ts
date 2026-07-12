import { safeInternalRedirect } from './redirects';

export function protectedRouteRedirect(
  requestedPath: string,
  userId: string | null,
): string | null {
  if (userId) return null;

  const next = safeInternalRedirect(requestedPath, '/protected');
  return `/sign-in?next=${encodeURIComponent(next)}`;
}
