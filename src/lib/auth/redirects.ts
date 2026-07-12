const defaultAuthenticatedPath = '/onboarding';

export function safeInternalRedirect(
  candidate: FormDataEntryValue | string | null | undefined,
  fallback = defaultAuthenticatedPath,
): string {
  if (typeof candidate !== 'string') return fallback;
  if (!candidate.startsWith('/') || candidate.startsWith('//')) return fallback;
  if (candidate.includes('\\') || /[\u0000-\u001f]/.test(candidate))
    return fallback;

  try {
    const parsed = new URL(candidate, 'https://gleen.internal');
    if (parsed.origin !== 'https://gleen.internal') return fallback;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
