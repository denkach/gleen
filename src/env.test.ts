import { validatePublicEnv } from '@/env';
import { describe, expect, it } from 'vitest';

function processEnv(
  values: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    NEXT_PUBLIC_SUPABASE_URL: 'https://gleen.supabase.co',
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    ...values,
  };
}

describe('validatePublicEnv', () => {
  it('returns a valid absolute HTTP URL unchanged', () => {
    expect(
      validatePublicEnv(
        processEnv({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
      ),
    ).toEqual({
      NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
      NEXT_PUBLIC_SUPABASE_URL: 'https://gleen.supabase.co',
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    });
  });

  it('throws when NEXT_PUBLIC_APP_URL is missing', () => {
    expect(() => validatePublicEnv(processEnv())).toThrow(
      'NEXT_PUBLIC_APP_URL is required',
    );
  });

  it('throws when NEXT_PUBLIC_APP_URL is relative or non-HTTP', () => {
    for (const value of ['/app', 'ftp://example.com']) {
      expect(() =>
        validatePublicEnv(processEnv({ NEXT_PUBLIC_APP_URL: value })),
      ).toThrow('NEXT_PUBLIC_APP_URL must be an absolute HTTP(S) URL');
    }
  });

  it('requires an absolute HTTPS Supabase URL', () => {
    expect(() =>
      validatePublicEnv(
        processEnv({
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
          NEXT_PUBLIC_SUPABASE_URL: '',
        }),
      ),
    ).toThrow('NEXT_PUBLIC_SUPABASE_URL is required');

    expect(() =>
      validatePublicEnv(
        processEnv({
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
          NEXT_PUBLIC_SUPABASE_URL: 'http://gleen.supabase.co',
        }),
      ),
    ).toThrow('NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTPS URL');
  });

  it('requires a Supabase publishable key', () => {
    expect(() =>
      validatePublicEnv(
        processEnv({
          NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '',
        }),
      ),
    ).toThrow('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required');
  });
});
