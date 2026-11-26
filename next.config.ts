import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';

import { validatePublicEnv } from './src/env';

validatePublicEnv(process.env);

const fixtureCatalogEnabled =
  process.env.NODE_ENV === 'development' &&
  !process.env.VERCEL_ENV &&
  process.env.PLAYWRIGHT_AUTH_FIXTURE_MODE === '1' &&
  process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://gleen-test.supabase.co';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  serverExternalPackages: ['@vercel/queue'],
  async headers() {
    return [
      {
        source: '/share/:path*',
        headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }],
      },
    ];
  },
  turbopack: {
    root: process.cwd(),
    resolveAlias: fixtureCatalogEnabled
      ? { '@/data/pricing': './test/public-catalog.ts' }
      : {},
  },
};

export default withWorkflow(nextConfig);
