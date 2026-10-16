import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { DocumentUploadModal } from './document-upload-modal';
import {
  DocumentTableClient,
  type DocumentItem,
} from './document-table-client';

export const metadata: Metadata = {
  title: 'Documents',
  description:
    'Manage and track engineering documents across assigned projects',
};

export default async function DocumentsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const isDC = can(user.role, 'document.edit');
  const canUpload = can(user.role, 'document.upload');

  // Fetch projects visible to this user
  let projects: Array<{ id: string; name: string; code: string }> = [];

  if (can(user.role, 'project.viewAll')) {
    const { data: allProjects } = await supabase
      .from('projects')
      .select('id, description, code')
      .order('code', { ascending: true });

    projects = (allProjects || []).map((p) => ({
      id: p.id,
      name: p.description,
      code: p.code,
    }));
  } else {
    const { data: memberProjects } = await supabase
      .from('project_members')
      .select('project:projects(id, description, code)')
      .eq('user_id', user.id);

    projects = (memberProjects || [])
      .map(
        (m) =>
          m.project as { id: string; description: string; code: string } | null,
      )
      .filter(
        (p): p is { id: string; description: string; code: string } => !!p,
      )
      .map((p) => ({
        id: p.id,
        name: p.description,
        code: p.code,
      }));
  }

  // Fetch active documents in scope (RLS filters automatically)
  const { data: documents } = await supabase
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
      file_size,
      created_at,
      uploaded_by,
      projects (
        id,
        code,
        description
      ),
      reviews:document_reviews (
        decision,
        comment,
        level,
        created_at,
        reviewer:profiles (
          full_name
        )
      )
    `,
    )
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  const mappedDocuments: DocumentItem[] = (documents || []).map((d) => {
    const proj = d.projects as {
      id: string;
      code: string;
      description: string;
    } | null;
    const revs = d.reviews as
      | {
          decision: 'approve' | 'reject';
          comment: string | null;
          level?: string;
          created_at: string;
          reviewer?: {
            full_name?: string | null;
          } | null;
        }[]
      | null;

    return {
      id: d.id,
      project_id: d.project_id,
      doc_number: d.doc_number,
      title: d.title,
      description: d.description,
      discipline: d.discipline as DocumentItem['discipline'],
      revision: d.revision || 'R00',
      status: d.status,
      file_name: d.file_name,
      file_size: d.file_size,
      created_at: d.created_at,
      uploaded_by: d.uploaded_by,
      projectName: proj?.description,
      projectCode: proj?.code,
      reviews: (revs || []).map((rev) => ({
        decision: rev.decision,
        comment: rev.comment,
        level: rev.level,
        reviewerName: rev.reviewer?.full_name || undefined,
        created_at: rev.created_at,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            Document Library
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage drawings, revisions, and engineering document records across
            assigned projects.
          </p>
        </div>

        {canUpload && projects.length > 0 && (
          <DocumentUploadModal projects={projects} />
        )}
      </div>

      <DocumentTableClient
        documents={mappedDocuments}
        projects={projects}
        isDC={isDC}
        currentUserRole={user.role}
        currentUserId={user.id}
      />
    </div>
  );
}
