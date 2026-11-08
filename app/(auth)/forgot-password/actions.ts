'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendPasswordResetEmail } from '@/lib/email/notifications';

// Same reply for every outcome so the form cannot be used to probe which emails exist.
const GENERIC_OK = { ok: true } as const;

export async function requestPasswordReset(
  email: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.email().safeParse(email.trim());
  if (!parsed.success) {
    return { ok: false, error: 'Enter a valid email address.' };
  }

  const adminClient = createAdminClient();
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

  const { data: profile } = await adminClient
    .from('profiles')
    .select('full_name, active')
    .eq('email', parsed.data)
    .maybeSingle();

  // Unknown, deactivated, or archived accounts get no email.
  if (!profile || !profile.active) return GENERIC_OK;

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'recovery',
      email: parsed.data,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });

  const hashedToken = linkData?.properties?.hashed_token;
  if (linkError || !hashedToken) {
    console.error('Password reset link failed:', linkError?.message);
    return GENERIC_OK;
  }

  const emailResult = await sendPasswordResetEmail({
    email: parsed.data,
    fullName: profile.full_name,
    resetLink: `${siteUrl}/auth/confirm?token_hash=${hashedToken}&type=recovery&next=/reset-password`,
  });

  if (!emailResult.ok) {
    console.error('Password reset email failed:', emailResult.error);
  }

  return GENERIC_OK;
}
