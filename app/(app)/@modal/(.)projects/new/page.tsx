import { requireCan } from '@/lib/auth';
import { getMasterAuthorities } from '@/app/(app)/noc-matrix/actions';
import { ProjectRegistrationForm } from '@/app/(app)/projects/new/project-form';
import { ProjectDialogModal } from '@/components/projects/project-dialog-modal';

export default async function InterceptedNewProjectPage() {
  await requireCan('project.create');
  const authRes = await getMasterAuthorities();

  return (
    <ProjectDialogModal>
      <ProjectRegistrationForm authorities={authRes.ok ? authRes.data : []} />
    </ProjectDialogModal>
  );
}
