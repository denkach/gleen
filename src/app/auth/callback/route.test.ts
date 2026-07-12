import { beforeEach, describe, expect, it, vi } from 'vitest';

const exchangeCodeForSession = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(async () => ({
    auth: { exchangeCodeForSession },
  })),
}));

describe('authentication callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exchanges a valid code and redirects only to an internal destination', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await import('./route');
    const response = await GET(
      new Request(
        'https://gleen.example/auth/callback?code=valid&next=https://evil.example',
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('valid');
    expect(response.headers.get('location')).toBe(
      'https://gleen.example/onboarding',
    );
  });

  it('routes recovery callbacks to password reset', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await import('./route');
    const response = await GET(
      new Request(
        'https://gleen.example/auth/callback?code=recovery&type=recovery&next=/onboarding',
      ),
    );

    expect(response.headers.get('location')).toBe(
      'https://gleen.example/reset-password',
    );
  });

  it('returns to sign in when code exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: 'expired' },
    });
    const { GET } = await import('./route');
    const response = await GET(
      new Request('https://gleen.example/auth/callback?code=expired'),
    );

    expect(response.headers.get('location')).toBe(
      'https://gleen.example/sign-in?error=callback',
    );
  });
});
