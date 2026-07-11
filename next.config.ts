import type { NextConfig } from 'next';

import { validatePublicEnv } from './src/env';

validatePublicEnv(process.env);

const nextConfig: NextConfig = {};

export default nextConfig;
