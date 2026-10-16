import { requireCan } from '@/lib/auth';
import { getMasterAuthorities } from '@/app/(app)/noc-matrix/actions';
import { ProjectRegistrationForm } from './project-form';

export default async function NewProjectPage() {
  await requireCan('project.create');
  const authRes = await getMasterAuthorities();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">Register New Project</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Admin exclusive: Initialize project scope, stakeholder contacts, and contract values.
        </p>
      </div>

      <ProjectRegistrationForm authorities={authRes.ok ? authRes.data : []} />
    </div>
  );
}
