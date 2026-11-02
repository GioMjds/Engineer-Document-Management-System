import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { can } from '@/lib/permissions';
import { AccountWorkspace, type AssignedProjectItem } from './account-workspace';

export const metadata: Metadata = {
  title: 'Account Settings & Profile',
  description: 'Manage professional engineering credentials, profile identity, and project assignments.',
};

export default async function AccountPage() {
  const user = await requireUser();
  const supabase = await createClient();

  // Load user profile details.
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, office, active, created_at')
    .eq('id', user.id)
    .single();

  const hasGlobalProjectScope = can(user.role, 'project.viewAll');

  // Load project assignments from project_members table.
  const { data: memberRows } = await supabase
    .from('project_members')
    .select(`
      discipline,
      projects (
        id,
        code,
        description,
        stage
      )
    `)
    .eq('user_id', user.id);

  let assignedProjects: AssignedProjectItem[] = [];

  if (memberRows && memberRows.length > 0) {
    assignedProjects = memberRows
      .filter((m) => m.projects !== null)
      .map((m) => {
        const proj = m.projects as {
          id: string;
          code: string;
          description: string;
          stage: string;
        };
        return {
          id: proj.id,
          code: proj.code,
          description: proj.description,
          stage: proj.stage,
          discipline: m.discipline,
        };
      });
  } else if (hasGlobalProjectScope) {
    // If administrative role with firm-wide access, display active portfolio projects.
    const { data: firmProjects } = await supabase
      .from('projects')
      .select('id, code, description, stage')
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(6);

    assignedProjects = (firmProjects || []).map((p) => ({
      id: p.id,
      code: p.code,
      description: p.description,
      stage: p.stage,
      discipline: 'Firm-wide Oversight',
    }));
  }

  return (
    <AccountWorkspace
      profile={{
        id: user.id,
        email: user.email,
        full_name: profile?.full_name || user.full_name,
        role: user.role,
        office: profile?.office || 'Dubai HQ',
        active: profile?.active ?? true,
        created_at: profile?.created_at || new Date().toISOString(),
        specialty: user.specialty,
      }}
      assignedProjects={assignedProjects}
      hasGlobalProjectScope={hasGlobalProjectScope}
    />
  );
}
