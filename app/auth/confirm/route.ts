import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Server-side route handler to exchange invitation/recovery token_hash into session cookies.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = (searchParams.get('type') as EmailOtpType) || 'invite';
  const next = searchParams.get('next') ?? '/set-password';

  if (token_hash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash,
    });

    if (!error) {
      // Session cookies are written to the response; forward to password setup page
      return NextResponse.redirect(new URL(next, request.url));
    }

    console.error('Server OTP verification failed:', error.message);
  }

  // Token missing or expired; return to login with explicit error message
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set(
    'error',
    'Invitation link has expired or is invalid. Please contact your administrator for a new invite.',
  );
  return NextResponse.redirect(loginUrl);
}
