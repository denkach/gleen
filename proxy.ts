import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { protectedRouteRedirect } from '@/lib/auth/protection';
import { updateSupabaseSession } from '@/lib/supabase/proxy';

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSupabaseSession(request);
  const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  const redirectPath = protectedRouteRedirect(
    requestedPath,
    typeof user?.sub === 'string' ? user.sub : null,
  );

  if (!redirectPath) return response;
  const redirect = NextResponse.redirect(new URL(redirectPath, request.url));
  for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
  redirect.headers.set('Cache-Control', 'private, no-store');
  return redirect;
}

export const config = {
  matcher: ['/app/:path*', '/protected/:path*', '/onboarding/:path*'],
};
