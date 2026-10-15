import type { Metadata } from 'next';
import { requireCan } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { ReviewQueueTable } from '@/components/review/review-queue-table';
import type { ReviewDocument } from '@/components/review/drawing-review-modal';

export const metadata: Metadata = {
  title: 'Review Queue',
  description: 'First-level technical review of submitted engineering drawings',
};

export default async function ReviewPage() {
  const user = await requireCan('review.queue');
  const supabase = await createClient();

  // If user does not have global project visibility, restrict to assigned projects
  let assignedProjectIds: string[] | null = null;
  if (!can(user.role, 'project.viewAll')) {
    const { data: members } = await supabase
      .from('project_members')
      .select('project_id')
      .eq('user_id', user.id);

    assignedProjectIds = (members || []).map((m) => m.project_id);
  }

  // Base query for submitted drawings
  let query = supabase
    .from('documents')
    .select(`
      id,
      project_id,
      doc_number,
      title,
      description,
      discipline,
      revision,
      file_name,
      file_size,
      created_at,
      uploaded_by,
      projects (
        id,
        code,
        description
      ),
      uploader:profiles!documents_uploaded_by_fkey (
        full_name
      ),
      reviews:document_reviews (
        id,
        revision_label,
        level,
        decision,
        comment,
        created_at,
        reviewer:profiles!document_reviews_reviewer_id_fkey (
          full_name
        )
      )
    `)
    .eq('status', 'submitted')
    .order('created_at', { ascending: true });

  if (assignedProjectIds !== null) {
    if (assignedProjectIds.length === 0) {
      // User is not assigned to any projects; return empty queue
      return (
        <div className="space-y-6">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Review Queue
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Technical compliance evaluation for submitted drawings.
            </p>
          </div>
          <div className="p-8 text-center text-sm text-muted-foreground border rounded-lg bg-card">
            You are not currently assigned to any active engineering projects.
          </div>
        </div>
      );
    }
    query = query.in('project_id', assignedProjectIds);
  }

  const { data: pending, error } = await query;

  if (error) {
    console.error('Failed to fetch review queue:', error.message);
  }

  const mappedDocuments: ReviewDocument[] = (pending || []).map((d) => {
    const proj = d.projects as { id: string; code: string; description: string } | null;
    const uploader = d.uploader as { full_name: string } | null;
    const revs = d.reviews as Array<{
      id: string;
      revision_label: string;
      level: string;
      decision: string;
      comment: string | null;
      created_at: string;
      reviewer: { full_name: string } | null;
    }> | null;

    return {
      id: d.id,
      project_id: d.project_id,
      doc_number: d.doc_number,
      title: d.title,
      description: d.description,
      discipline: d.discipline as ReviewDocument['discipline'],
      revision: d.revision || 'R00',
      file_name: d.file_name,
      file_size: d.file_size,
      projectName: proj?.description,
      projectCode: proj?.code,
      authorName: uploader?.full_name || 'Engineer',
      createdAt: d.created_at,
      reviews: (revs || []).map((r) => ({
        id: r.id,
        revision_label: r.revision_label,
        level: r.level,
        decision: r.decision,
        comment: r.comment,
        created_at: r.created_at,
        reviewerName: r.reviewer?.full_name,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <span>Review Queue</span>
            {mappedDocuments.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-[#02a9d3]/15 text-[#02a9d3] font-semibold">
                {mappedDocuments.length} pending
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Technical compliance evaluation for submitted drawings across assigned projects.
          </p>
        </div>
      </div>

      <ReviewQueueTable documents={mappedDocuments} />
    </div>
  );
}
