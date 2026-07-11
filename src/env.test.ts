import { validatePublicEnv } from '@/env';
import { describe, expect, it } from 'vitest';

function processEnv(
  values: Partial<NodeJS.ProcessEnv> = {},
): NodeJS.ProcessEnv {
  return { NODE_ENV: 'test', ...values };
}

describe('validatePublicEnv', () => {
  it('returns a valid absolute HTTP URL unchanged', () => {
    expect(
      validatePublicEnv(
        processEnv({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' }),
      ),
    ).toEqual({ NEXT_PUBLIC_APP_URL: 'http://localhost:3000' });
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
});
