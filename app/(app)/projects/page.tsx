import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getNocTrackerData } from '@/lib/server/noc-data';
import { can } from '@/lib/permissions';
import { ProjectsWorkspaceClient } from '@/components/projects/projects-workspace-client';
import type { ProfileItem } from '@/components/projects/project-team-dialog';
import { getMasterAuthorities } from '@/app/(app)/noc-matrix/actions';
import type { MasterAuthorityRecord } from '@/types/noc';

export const metadata: Metadata = {
  title: 'Projects Directory',
  description:
    'Multidisciplinary engineering projects portfolio, lifecycle stages, and team role assignments',
};

interface ProjectsPageProps {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ProjectsPage({ searchParams }: ProjectsPageProps) {
  const [user, sp] = await Promise.all([
    requireUser(),
    searchParams ? searchParams : Promise.resolve(undefined),
  ]);
  const { projects } = await getNocTrackerData();

  const canCreateProject = can(user.role, 'project.create');
  const canDeleteProject = can(user.role, 'project.delete');
  const canManageMembers = can(user.role, 'users.manage');
  const canViewConsultantAmount = can(user.role, 'amount.consultant.view');

  let teamProfiles: ProfileItem[] = [];
  if (canManageMembers || canCreateProject) {
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

  let authorities: MasterAuthorityRecord[] = [];
  if (canCreateProject) {
    const authRes = await getMasterAuthorities();
    if (authRes.ok && authRes.data) {
      authorities = authRes.data;
    }
  }

  const initialOpenCreate = sp?.create === 'true' || sp?.new === 'true';

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
        authorities={authorities}
        canCreateProject={canCreateProject}
        canDeleteProject={canDeleteProject}
        canManageMembers={canManageMembers}
        canViewConsultantAmount={canViewConsultantAmount}
        initialOpenCreate={initialOpenCreate}
      />
    </div>
  );
}
