import {
  validateAnalysisProviderEnv,
  validateProviderEnv,
  validatePublicEnv,
  validateStripePortalEnv,
  validateStripePublicEnv,
  validateStripeServerEnv,
  validateSupabaseAdminEnv,
} from '@/env';
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

describe('validateProviderEnv', () => {
  it('requires both server-only provider keys and trims valid values', () => {
    expect(() => validateProviderEnv({ NODE_ENV: 'test' })).toThrow(
      'YOUTUBE_DATA_API_KEY is required',
    );
    expect(() =>
      validateProviderEnv({ NODE_ENV: 'test', YOUTUBE_DATA_API_KEY: 'yt' }),
    ).toThrow('SUPADATA_API_KEY is required');
    expect(
      validateProviderEnv({
        NODE_ENV: 'test',
        YOUTUBE_DATA_API_KEY: ' yt ',
        SUPADATA_API_KEY: ' supadata ',
      }),
    ).toEqual({
      YOUTUBE_DATA_API_KEY: 'yt',
      SUPADATA_API_KEY: 'supadata',
    });
  });
});

describe('validateAnalysisProviderEnv', () => {
  it('requires and trims server-only OpenRouter configuration', () => {
    expect(() => validateAnalysisProviderEnv({ NODE_ENV: 'test' })).toThrow(
      'OPENROUTER_API_KEY is required',
    );
    expect(() =>
      validateAnalysisProviderEnv({
        NODE_ENV: 'test',
        OPENROUTER_API_KEY: 'secret',
      }),
    ).toThrow('OPENROUTER_MODEL is required');
    expect(
      validateAnalysisProviderEnv({
        NODE_ENV: 'test',
        OPENROUTER_API_KEY: ' secret ',
        OPENROUTER_MODEL: ' vendor/model ',
      }),
    ).toEqual({
      OPENROUTER_API_KEY: 'secret',
      OPENROUTER_MODEL: 'vendor/model',
    });
  });
});

describe('validateSupabaseAdminEnv', () => {
  it('requires and trims a server-only Supabase secret', () => {
    expect(() =>
      validateSupabaseAdminEnv(
        processEnv({
          NEXT_PUBLIC_SUPABASE_URL: 'https://gleen.supabase.co',
        }),
      ),
    ).toThrow('SUPABASE_SECRET_KEY is required');

    expect(
      validateSupabaseAdminEnv(
        processEnv({
          NEXT_PUBLIC_SUPABASE_URL: ' https://gleen.supabase.co ',
          SUPABASE_SECRET_KEY: ' sb_secret_test ',
        }),
      ),
    ).toEqual({
      NEXT_PUBLIC_SUPABASE_URL: 'https://gleen.supabase.co',
      SUPABASE_SECRET_KEY: 'sb_secret_test',
    });
  });

  it('requires an absolute HTTPS Supabase URL', () => {
    expect(() =>
      validateSupabaseAdminEnv(
        processEnv({
          NEXT_PUBLIC_SUPABASE_URL: 'http://gleen.supabase.co',
          SUPABASE_SECRET_KEY: 'sb_secret_test',
        }),
      ),
    ).toThrow('NEXT_PUBLIC_SUPABASE_URL must be an absolute HTTPS URL');
  });
});

describe('validateStripePublicEnv', () => {
  it('requires the Stripe publishable key', () => {
    expect(() => validateStripePublicEnv({})).toThrow(
      'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is required',
    );
  });

  it('trims the Stripe publishable key', () => {
    expect(
      validateStripePublicEnv({
        NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: ' pk_test_123 ',
      }),
    ).toEqual({ NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: 'pk_test_123' });
  });
});

describe('validateStripeServerEnv', () => {
  it('requires and trims server-only Stripe configuration', () => {
    expect(() => validateStripeServerEnv({})).toThrow(
      'STRIPE_SECRET_KEY is required',
    );
    expect(() =>
      validateStripeServerEnv({ STRIPE_SECRET_KEY: 'sk_test_123' }),
    ).toThrow('STRIPE_WEBHOOK_SECRET is required');
    expect(
      validateStripeServerEnv({
        STRIPE_SECRET_KEY: ' sk_test_123 ',
        STRIPE_WEBHOOK_SECRET: ' whsec_123 ',
      }),
    ).toEqual({
      STRIPE_SECRET_KEY: 'sk_test_123',
      STRIPE_WEBHOOK_SECRET: 'whsec_123',
    });
  });
});

describe('validateStripePortalEnv', () => {
  it('requires a Portal configuration ID', () => {
    expect(() => validateStripePortalEnv({})).toThrow(
      'STRIPE_PORTAL_CONFIGURATION_ID is required',
    );
  });

  it('rejects malformed Portal configuration IDs', () => {
    expect(() =>
      validateStripePortalEnv({
        STRIPE_PORTAL_CONFIGURATION_ID: 'pc_test_prorated',
      }),
    ).toThrow('STRIPE_PORTAL_CONFIGURATION_ID must start with bpc_');
  });

  it('trims a valid Portal configuration ID', () => {
    expect(
      validateStripePortalEnv({
        STRIPE_PORTAL_CONFIGURATION_ID: ' bpc_test_prorated ',
      }),
    ).toEqual({
      STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_test_prorated',
    });
  });
});
