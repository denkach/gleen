import { beforeEach, describe, expect, it, vi } from 'vitest';

import { emailSchema, passwordSchema } from './schemas';
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

const requestHeaders = new Headers();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth })),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => requestHeaders),
}));

describe('auth validation and redirects', () => {
  it('accepts strong passwords and rejects weak ones', () => {
    expect(passwordSchema.safeParse('Signal42!').success).toBe(true);
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('onlyletters').success).toBe(false);
  });

  it('returns precise validation codes from the schemas', () => {
    expect(
      emailSchema.safeParse('not-an-email').error?.issues[0]?.message,
    ).toBe('email_invalid');
    expect(
      passwordSchema.safeParse('onlyletters').error?.issues[0]?.message,
    ).toBe('password_number_required');
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
    requestHeaders.delete('host');
    requestHeaders.delete('x-forwarded-host');
    requestHeaders.delete('x-forwarded-proto');
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://gleen.example');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://gleen.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  });

  it('keeps the OAuth callback on the current preview deployment', async () => {
    requestHeaders.set(
      'x-forwarded-host',
      'gleen-staging-preview-team.vercel.app',
    );
    requestHeaders.set('x-forwarded-proto', 'https');
    auth.signInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.test' },
      error: null,
    });
    const { signInWithGoogle } = await import('./actions');

    await signInWithGoogle({ status: 'idle' }, new FormData());

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo:
          'https://gleen-staging-preview-team.vercel.app/auth/callback?next=%2Fonboarding',
      },
    });
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
      email: 'alex@example.com',
    });
    expect(JSON.stringify(result)).not.toContain('Signal42!');
  });

  it('returns an email validation code without calling the provider', async () => {
    const { signInWithPassword } = await import('./actions');
    const form = new FormData();
    form.set('email', 'not-an-email');
    form.set('password', 'Signal42!');

    await expect(signInWithPassword({ status: 'idle' }, form)).resolves.toEqual(
      { status: 'error', code: 'email_invalid' },
    );
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it('returns the precise weak-password code without calling the provider', async () => {
    const { signUpWithPassword } = await import('./actions');
    const form = new FormData();
    form.set('email', 'alex@example.com');
    form.set('password', 'onlyletters');

    await expect(signUpWithPassword({ status: 'idle' }, form)).resolves.toEqual(
      {
        status: 'error',
        code: 'password_number_required',
        email: 'alex@example.com',
      },
    );
    expect(auth.signUp).not.toHaveBeenCalled();
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

  it('preserves a safe continuation for sign-up magic links', async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: null });
    const { sendMagicLink } = await import('./actions');
    const form = new FormData();
    form.set('email', 'new@example.com');
    form.set('intent', 'sign-up');
    form.set('next', '/app?continuation=normalized');
    await sendMagicLink({ status: 'idle' }, form);
    expect(auth.signInWithOtp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          emailRedirectTo:
            'https://gleen.example/auth/callback?next=%2Fapp%3Fcontinuation%3Dnormalized',
          shouldCreateUser: true,
        },
      }),
    );
  });
});
