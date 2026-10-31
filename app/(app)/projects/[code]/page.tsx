import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getNocTrackerData } from '@/lib/server/noc-data';
import {
  ProjectDocumentsView,
  type ProjectDocumentSummary,
} from '@/components/projects/project-documents-view';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Route } from 'next';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  return {
    title: `Project ${code} · Documents`,
    description: `Engineering submittals and document records for project ${code}`,
  };
}

export default async function StandaloneProjectPage({
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
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-2">
        <Link
          href={'/projects' as Route}
          className={cn(
            buttonVariants({ variant: 'ghost', size: 'sm' }),
            'h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground',
          )}
        >
          <ArrowLeft className="mr-1.5 size-3.5" />
          Back to Projects
        </Link>
      </div>

      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
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
          isModal={false}
        />
      </div>
    </div>
  );
}
