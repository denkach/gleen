import { resolve } from 'node:path';
import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';

import { validatePublicEnv } from './src/env';

validatePublicEnv(process.env);

const productionAliases = {
  '@/components/app-shell/analyze-processing-fixture-entry':
    './src/components/app-shell/analyze-processing-fixture-production.tsx',
};

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
  webpack(config, { dev }) {
    if (!dev) {
      for (const [alias, file] of Object.entries(productionAliases)) {
        config.resolve.alias[alias] = resolve(process.cwd(), file);
      }
    }
    return config;
  },
  turbopack: {
    root: process.cwd(),
    resolveAlias:
      process.env.NODE_ENV === 'production' ? productionAliases : {},
  },
};

export default withWorkflow(nextConfig);
