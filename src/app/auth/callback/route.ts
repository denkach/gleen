import { type NextRequest, NextResponse } from 'next/server';

import { safeInternalRedirect } from '@/lib/auth/redirects';
import { createCallbackSupabaseClient } from '@/lib/supabase/callback';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const recovery = url.searchParams.get('type') === 'recovery';
  const next = recovery
    ? '/reset-password'
    : safeInternalRedirect(url.searchParams.get('next'));

  const destination = new URL(next, url.origin);
  const failure = new URL('/sign-in?error=callback', url.origin);
  if (next !== '/onboarding') failure.searchParams.set('next', next);
  const response = NextResponse.redirect(code ? destination : failure);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  if (!code) return response;

  const supabase = createCallbackSupabaseClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) response.headers.set('Location', failure.href);
  return response;
}
