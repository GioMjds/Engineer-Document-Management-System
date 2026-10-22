import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function proxy(request: NextRequest) {
  const { response, user } = await updateSession(request);
  const pathname = request.nextUrl.pathname;

  // Guest-only auth routes: signed-in users should redirect to dashboard
  const isGuestOnlyRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/forgot-password');

  // Allowed public or auth lifecycle routes (token verification and setting initial password)
  const isAuthLifecycleRoute =
    isGuestOnlyRoute ||
    pathname.startsWith('/confirm') ||
    pathname.startsWith('/auth/confirm') ||
    pathname.startsWith('/set-password');

  if (!user && !isAuthLifecycleRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Only redirect away from login/forgot-password or root if user is already signed in.
  // Do NOT redirect away from /set-password or /confirm so new users can set their password.
  if (user && (isGuestOnlyRoute || pathname === '/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|sw.js|offline|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
