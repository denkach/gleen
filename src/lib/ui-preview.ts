export function isUiPreviewEnabled(
  env: Pick<NodeJS.ProcessEnv, 'NODE_ENV' | 'VERCEL_ENV'> = {
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  },
): boolean {
  if (env.VERCEL_ENV !== undefined) {
    return env.VERCEL_ENV !== 'production';
  }

  return env.NODE_ENV !== 'production';
}
