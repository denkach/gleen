import type { NextConfig } from 'next';
import { withWorkflow } from 'workflow/next';

import { validatePublicEnv } from './src/env';

validatePublicEnv(process.env);

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  serverExternalPackages: ['@vercel/queue'],
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

export default withWorkflow(nextConfig);
