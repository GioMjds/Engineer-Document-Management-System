import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getNocTrackerData } from '@/lib/server/noc-data';
import { can } from '@/lib/permissions';
import { ProjectsWorkspaceClient } from '@/components/projects/projects-workspace-client';
import type { ProfileItem } from '@/components/projects/project-team-dialog';

export const metadata: Metadata = {
  title: 'Projects Directory',
  description:
    'Multidisciplinary engineering projects portfolio, lifecycle stages, and team role assignments',
};

export default async function ProjectsPage() {
  const user = await requireUser();
  const { projects } = await getNocTrackerData();

  let teamProfiles: ProfileItem[] = [];
  if (can(user.role, 'users.manage')) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name, role, email')
      .eq('active', true)
      .order('full_name', { ascending: true });

    if (data) {
      teamProfiles = data.map((d) => ({
        id: d.id,
        full_name: d.full_name,
        role: d.role,
        email: d.email,
      }));
    }
  }

  const canCreateProject = can(user.role, 'project.create');
  const canManageMembers = can(user.role, 'users.manage');
  const canViewConsultantAmount = can(user.role, 'amount.consultant.view');

  return (
    <div className="py-2">
      <ProjectsWorkspaceClient
        projects={projects}
        currentUser={{
          id: user.id,
          role: user.role,
          name: user.full_name || user.email,
        }}
        teamProfiles={teamProfiles}
        canCreateProject={canCreateProject}
        canManageMembers={canManageMembers}
        canViewConsultantAmount={canViewConsultantAmount}
      />
    </div>
  );
}
