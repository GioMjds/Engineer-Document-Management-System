import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getNocTrackerData } from '@/lib/server/noc-data';
import { ProjectDocumentsModalDialog } from '@/components/projects/project-documents-modal-dialog';
import {
  ProjectDocumentsView,
  type ProjectDocumentSummary,
} from '@/components/projects/project-documents-view';

export default async function InterceptedProjectPage({
  params,
}: PageProps<'/projects/[code]'>) {
  const { code } = await params;
  await requireUser();

  const { projects } = await getNocTrackerData();
  const project = projects.find((p) => p.code === code);
  if (!project) notFound();

  const supabase = await createClient();
  let documents: ProjectDocumentSummary[] = [];

  let projectId = project.id;
  if (!projectId) {
    const { data: dbProj } = await supabase
      .from('projects')
      .select('id')
      .eq('code', code)
      .maybeSingle();
    if (dbProj?.id) projectId = dbProj.id;
  }

  if (projectId) {
    const { data: rawDocs } = await supabase
      .from('documents')
      .select(
        `
        id,
        project_id,
        doc_number,
        title,
        description,
        discipline,
        revision,
        status,
        file_name,
        file_path,
        file_size,
        created_at,
        updated_at,
        uploaded_by
      `,
      )
      .eq('project_id', projectId)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (rawDocs) {
      documents = rawDocs.map((d) => ({
        id: d.id,
        project_id: d.project_id,
        doc_number: d.doc_number,
        title: d.title,
        description: d.description,
        discipline: d.discipline,
        revision: d.revision || 'R00',
        status: d.status,
        file_name: d.file_name,
        file_path: d.file_path,
        file_size: d.file_size,
        created_at: d.created_at,
        updated_at: d.updated_at,
        uploaded_by: d.uploaded_by,
      }));
    }
  }

  return (
    <ProjectDocumentsModalDialog>
      <ProjectDocumentsView
        project={{
          id: projectId,
          code: project.code,
          name: project.name,
          description: project.name,
          masterAuthority: project.masterAuthority,
          lifecycleStage: project.lifecycleStage,
        }}
        documents={documents}
        isModal={true}
      />
    </ProjectDocumentsModalDialog>
  );
}
