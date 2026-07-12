import { NextResponse } from 'next/server';

import { safeInternalRedirect } from '@/lib/auth/redirects';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
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

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      new URL('/sign-in?error=callback', url.origin),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
