import type { NextConfig } from 'next';

import { validatePublicEnv } from './src/env';

validatePublicEnv(process.env);

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
};

export default nextConfig;
