import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getMasterAuthorities } from '@/app/(app)/noc-matrix/actions';
import { ProjectRegistrationForm } from '@/app/(app)/projects/new/project-form';
import { ProjectDialogModal } from '@/components/projects/project-dialog-modal';
import type { ProfileItem } from '@/components/projects/project-team-dialog';

export default async function InterceptedNewProjectPage() {
  await requireCan('project.create');
  const [authRes, supabase] = await Promise.all([
    getMasterAuthorities(),
    createClient(),
  ]);

  const { data: profileRows } = await supabase
    .from('profiles')
    .select('id, full_name, role, email')
    .eq('active', true)
    .order('full_name', { ascending: true });

  const teamProfiles: ProfileItem[] = (profileRows || []).map((p) => ({
    id: p.id,
    full_name: p.full_name,
    role: p.role,
    email: p.email,
  }));

  return (
    <ProjectDialogModal>
      <ProjectRegistrationForm
        authorities={authRes.ok ? authRes.data : []}
        teamProfiles={teamProfiles}
      />
    </ProjectDialogModal>
  );
}
