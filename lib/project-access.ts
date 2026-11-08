import 'server-only';
import type { AuthenticatedUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Tables } from '@/types/database';

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ScopedProject = Pick<
  Tables<'projects'>,
  'id' | 'code' | 'stage' | 'milestones'
>;

// Resolves an active project by code or id; null when it is missing or the user is not on its team.
export async function getScopedProject(
  user: Pick<AuthenticatedUser, 'id' | 'role'>,
  codeOrId: string,
): Promise<ScopedProject | null> {
  const key = (codeOrId || '').trim();
  if (!key) return null;

  const admin = createAdminClient();
  const base = admin
    .from('projects')
    .select('id, code, stage, milestones')
    .is('archived_at', null);
  const { data: project } = await (
    UUID_REGEX.test(key) ? base.eq('id', key) : base.eq('code', key)
  ).maybeSingle();
  if (!project) return null;

  if (!can(user.role, 'project.viewAll')) {
    const { data: member } = await admin
      .from('project_members')
      .select('project_id')
      .eq('project_id', project.id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (!member) return null;
  }

  return project;
}
