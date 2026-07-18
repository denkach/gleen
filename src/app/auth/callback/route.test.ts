import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, type NextResponse } from 'next/server';

const exchangeCodeForSession = vi.fn();
const createCallbackSupabaseClient = vi.fn(
  (_request: NextRequest, response: NextResponse) => ({
    auth: {
      exchangeCodeForSession: async (code: string) => {
        response.cookies.set('sb-session', 'authenticated');
        return exchangeCodeForSession(code);
      },
    },
  }),
);

vi.mock('@/lib/supabase/callback', () => ({
  createCallbackSupabaseClient,
}));

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
      new NextRequest(
        'https://gleen.example/auth/callback?code=valid&next=https://evil.example',
      ),
    );

    expect(exchangeCodeForSession).toHaveBeenCalledWith('valid');
    expect(response.headers.get('location')).toBe(
      'https://gleen.example/onboarding',
    );
    expect(response.headers.get('set-cookie')).toContain(
      'sb-session=authenticated',
    );
  });

  it('routes recovery callbacks to password reset', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest(
        'https://gleen.example/auth/callback?code=recovery&type=recovery&next=/onboarding',
      ),
    );

    expect(response.headers.get('location')).toBe(
      'https://gleen.example/reset-password',
    );
  });

  it('preserves an internal analysis continuation after email authentication', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: null });
    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest(
        'https://gleen.example/auth/callback?code=valid&next=%2Fapp%3Fcontinuation%3Dnormalized',
      ),
    );
    expect(response.headers.get('location')).toBe(
      'https://gleen.example/app?continuation=normalized',
    );
  });

  it('returns to sign in when code exchange fails', async () => {
    exchangeCodeForSession.mockResolvedValue({
      error: { message: 'expired' },
    });
    const { GET } = await import('./route');
    const response = await GET(
      new NextRequest('https://gleen.example/auth/callback?code=expired'),
    );

    expect(response.headers.get('location')).toBe(
      'https://gleen.example/sign-in?error=callback',
    );
  });
});
