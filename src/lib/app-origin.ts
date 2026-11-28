export function trustedAppOrigin(
  headers: Pick<Headers, 'get'>,
  appUrl: string,
): string {
  const canonical = new URL(appUrl).origin;
  const host = headers.get('x-forwarded-host') ?? headers.get('host');
  for (const domain of [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ]) {
    if (!domain) continue;
    const origin = `https://${domain}`;
    if (host === domain || (!host && headers.get('origin') === origin))
      return origin;
  }
  return canonical;
}
