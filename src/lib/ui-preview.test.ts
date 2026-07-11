import { describe, expect, it } from 'vitest';

import { isUiPreviewEnabled } from '@/lib/ui-preview';

describe('isUiPreviewEnabled', () => {
  it.each<{
    name: string;
    env: Pick<NodeJS.ProcessEnv, 'NODE_ENV' | 'VERCEL_ENV'>;
    expected: boolean;
  }>([
    {
      name: 'disables Vercel production',
      env: { NODE_ENV: 'development', VERCEL_ENV: 'production' },
      expected: false,
    },
    {
      name: 'enables Vercel preview even with production NODE_ENV',
      env: { NODE_ENV: 'production', VERCEL_ENV: 'preview' },
      expected: true,
    },
    {
      name: 'enables Vercel development',
      env: { NODE_ENV: 'production', VERCEL_ENV: 'development' },
      expected: true,
    },
    {
      name: 'disables local production',
      env: { NODE_ENV: 'production', VERCEL_ENV: undefined },
      expected: false,
    },
    {
      name: 'enables local development',
      env: { NODE_ENV: 'development', VERCEL_ENV: undefined },
      expected: true,
    },
    {
      name: 'enables local test',
      env: { NODE_ENV: 'test', VERCEL_ENV: undefined },
      expected: true,
    },
  ])('$name', ({ env, expected }) => {
    expect(isUiPreviewEnabled(env)).toBe(expected);
  });
});
