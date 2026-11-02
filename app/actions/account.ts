'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const updateProfileSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(100, 'Full name is too long.'),
});

const updatePasswordSchema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(8, 'Confirm password must be at least 8 characters.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

// Updates caller account profile display name and records compliance audit log.
export async function updateAccountProfile(input: { fullName: string }) {
  const caller = await requireUser();
  const parsed = updateProfileSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid profile data.' };
  }

  const { fullName } = parsed.data;
  const adminClient = createAdminClient();

  // Update profile record in database.
  const { error: profileError } = await adminClient
    .from('profiles')
    .update({ full_name: fullName })
    .eq('id', caller.id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  // Update auth metadata for caller session.
  await adminClient.auth.admin.updateUserById(caller.id, {
    user_metadata: { full_name: fullName },
  });

  // Record audit trail entry for profile updates.
  await adminClient.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_UPDATE',
    entity: 'profiles',
    entity_id: caller.id,
    metadata: {
      target_email: caller.email,
      previous_name: caller.full_name,
      new_name: fullName,
      self_service: true,
    },
  });

  revalidatePath('/account');
  return { ok: true };
}

// Updates caller authentication password and records security audit log.
export async function updateAccountPassword(input: { password: string; confirmPassword: string }) {
  const caller = await requireUser();
  const parsed = updatePasswordSchema.safeParse(input);

  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid password.' };
  }

  const { password } = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { ok: false, error: error.message };
  }

  const adminClient = createAdminClient();
  await adminClient.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_PASSWORD_CHANGE',
    entity: 'profiles',
    entity_id: caller.id,
    metadata: {
      target_email: caller.email,
      self_service: true,
    },
  });

  return { ok: true };
}
