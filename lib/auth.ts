import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import {
  type AppRole,
  type Capability,
  can,
  normalizeRole,
} from '@/lib/permissions';

export type Role = AppRole;

export interface AuthenticatedUser {
  id: string;
  email: string;
  full_name: string;
  role: AppRole;
}

export const getCurrentUser = cache(
  async (): Promise<AuthenticatedUser | null> => {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name, role, active')
      .eq('id', user.id)
      .maybeSingle();

    // Strict check: if no profile or profile inactive, deny role escalation
    if (!profile || profile.active === false) {
      return null;
    }

    const normalized = normalizeRole(profile.role);
    if (!normalized) {
      return null;
    }

    return {
      id: profile.id,
      email: user.email ?? '',
      full_name: profile.full_name || user.email?.split('@')[0] || 'User',
      role: normalized,
    };
  },
);

export async function requireUser(): Promise<AuthenticatedUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

export async function requireRole(
  allowed: (AppRole | string)[],
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  const normalizedAllowed = allowed
    .map((r) => normalizeRole(r))
    .filter((r): r is AppRole => r !== null);

  if (!normalizedAllowed.includes(user.role)) {
    redirect('/documents');
  }
  return user;
}

export async function requireCan(
  capability: Capability,
): Promise<AuthenticatedUser> {
  const user = await requireUser();
  if (!can(user.role, capability)) {
    throw new Error(
      `Unauthorized: Role '${user.role}' lacks capability '${capability}'`,
    );
  }
  return user;
}
