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

  if (!code) {
    return NextResponse.redirect(
      new URL('/sign-in?error=callback', url.origin),
    );
  }

  const response = NextResponse.redirect(new URL(next, url.origin));
  const supabase = createCallbackSupabaseClient(request, response);
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL('/sign-in?error=callback', url.origin),
    );
  }

  return response;
}
