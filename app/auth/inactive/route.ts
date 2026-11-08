import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Ends the session of a signed-in but archived account and explains why on /login.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set(
    'error',
    'This account has been archived. Contact your system administrator.',
  );
  return NextResponse.redirect(loginUrl);
}
