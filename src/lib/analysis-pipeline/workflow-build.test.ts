import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Workflow production build integration', () => {
  it('externalizes the queue runtime and uses the compatible Webpack build', () => {
    const root = process.cwd();
    const nextConfig = readFileSync(join(root, 'next.config.ts'), 'utf8');
    const packageJson = JSON.parse(
      readFileSync(join(root, 'package.json'), 'utf8'),
    ) as { scripts?: Record<string, string> };

    expect(nextConfig).toContain("serverExternalPackages: ['@vercel/queue']");
    expect(packageJson.scripts?.build).toBe('next build --webpack');
  });
});
