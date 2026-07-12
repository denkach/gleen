import type { NextConfig } from 'next';

import { validatePublicEnv } from './src/env';

validatePublicEnv(process.env);

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  turbopack: {
    root: process.cwd(),
    resolveAlias:
      process.env.NODE_ENV === 'production'
        ? {
            '@/components/app-shell/analyze-processing-fixture-entry':
              './src/components/app-shell/analyze-processing-fixture-production.tsx',
          }
        : {},
  },
};

export default nextConfig;
