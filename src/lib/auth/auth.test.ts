import { beforeEach, describe, expect, it, vi } from 'vitest';

import { passwordSchema } from './schemas';
import { safeInternalRedirect } from './redirects';

const auth = {
  signInWithOtp: vi.fn(),
  signUp: vi.fn(),
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signInWithOAuth: vi.fn(),
  signOut: vi.fn(),
};

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth })),
}));

describe('auth validation and redirects', () => {
  it('accepts strong passwords and rejects weak ones', () => {
    expect(passwordSchema.safeParse('Signal42!').success).toBe(true);
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('onlyletters').success).toBe(false);
  });

  it('allows only internal redirect paths', () => {
    expect(safeInternalRedirect('/onboarding?step=2')).toBe(
      '/onboarding?step=2',
    );
    expect(safeInternalRedirect('https://evil.example')).toBe('/onboarding');
    expect(safeInternalRedirect('//evil.example')).toBe('/onboarding');
    expect(safeInternalRedirect('/\\evil.example')).toBe('/onboarding');
    expect(safeInternalRedirect(null)).toBe('/onboarding');
  });
});

describe('auth actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://gleen.example');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://gleen.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  });

  it('preserves email but never returns a submitted password on error', async () => {
    auth.signInWithPassword.mockResolvedValue({
      data: { user: null },
      error: {
        message: 'Invalid login credentials',
        code: 'invalid_credentials',
      },
    });
    const { signInWithPassword } = await import('./actions');
    const form = new FormData();
    form.set('email', 'alex@example.com');
    form.set('password', 'Signal42!');

    const result = await signInWithPassword({ status: 'idle' }, form);

    expect(result).toEqual({
      status: 'error',
      code: 'invalid_credentials',
      message: 'Email or password is incorrect.',
      email: 'alex@example.com',
    });
    expect(JSON.stringify(result)).not.toContain('Signal42!');
  });

  it('uses an allowlisted callback for magic links', async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    const { sendMagicLink } = await import('./actions');
    const form = new FormData();
    form.set('email', 'alex@example.com');
    form.set('next', 'https://evil.example');

    await expect(
      sendMagicLink({ status: 'idle' }, form),
    ).resolves.toMatchObject({ status: 'success', email: 'alex@example.com' });
    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'alex@example.com',
      options: {
        emailRedirectTo:
          'https://gleen.example/auth/callback?next=%2Fonboarding',
        shouldCreateUser: false,
      },
    });
  });
});
