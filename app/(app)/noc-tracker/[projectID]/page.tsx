import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getNocTrackerData } from '@/lib/server/noc-data';
import { NocTrackerClient } from '@/components/noc/noc-tracker-client';
import type { ProjectDocumentItem } from '@/types/noc';

export async function generateMetadata({
  params,
}: PageProps<'/noc-tracker/[projectID]'>): Promise<Metadata> {
  const { projectID } = await params;

  const { projects } = await getNocTrackerData();
  const project = projects.find((p) => p.code === projectID);

  if (!project) {
    return {
      title: 'Project Not Found · NOC Tracker',
    }
  }

  return {
    title: `Project ${projectID} · NOC Tracker`,
    description:
      'Authority NOC tracking, sequence dependencies, and expiration management',
  };
}

export default async function NocProjectPage({
  params,
}: PageProps<'/noc-tracker/[projectID]'>) {
  const { projectID } = await params;
  const user = await requireUser();
  const { projects, nocs } = await getNocTrackerData();

  const project = projects.find((p) => p.code === projectID);
  if (!project) notFound();

  const projectNocs = nocs.filter((n) => n.projectCode === project.code);

  // Fetch technical submittals for this project
  const supabase = await createClient();
  let projectDocs: ProjectDocumentItem[] = [];

  if (project.id) {
    const { data: rawDocs } = await supabase
      .from('documents')
      .select(
        `
        id,
        doc_number,
        title,
        discipline,
        revision,
        status,
        file_name,
        file_path,
        file_size,
        updated_at
      `,
      )
      .eq('project_id', project.id)
      .is('archived_at', null)
      .order('doc_number', { ascending: true });

    if (rawDocs) {
      projectDocs = rawDocs.map((d) => ({
        id: d.id,
        docNumber: d.doc_number,
        title: d.title,
        discipline: d.discipline,
        revision: d.revision,
        status: d.status,
        fileName: d.file_name,
        filePath: d.file_path,
        fileSize: d.file_size,
        updatedAt: d.updated_at,
      }));
    }
  }

  return (
    <div className="py-2">
      <NocTrackerClient
        key={project.code}
        project={project}
        initialNocs={projectNocs}
        projectDocuments={projectDocs}
        currentUserRole={user.role}
      />
    </div>
  );
}
