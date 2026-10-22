import type { Metadata } from 'next';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getMasterAuthorities } from '@/app/(app)/noc-matrix/actions';
import { ProjectRegistrationForm } from './project-form';
import type { ProfileItem } from '@/components/projects/project-team-dialog';

export const metadata: Metadata = {
  title: 'Register New Project',
  description: 'Admin exclusive: Initialize project scope, stakeholder contacts, and contract values.',
};

export default async function NewProjectPage() {
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
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Register New Project
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Admin exclusive: Initialize project scope, stakeholder contacts, and
          contract values.
        </p>
      </div>

      <ProjectRegistrationForm
        authorities={authRes.ok ? authRes.data : []}
        teamProfiles={teamProfiles}
      />
    </div>
  );
}
