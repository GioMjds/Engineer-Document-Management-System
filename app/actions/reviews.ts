'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export interface ResidentEngineerReviewInput {
  documentId: string;
  revisionId?: string;
  decision: 'approve' | 'reject';
  escalateToAreaManager?: boolean;
  comment?: string;
}

const reviewInputSchema = z
  .object({
    documentId: z.string().uuid(),
    revisionId: z.string().optional(),
    decision: z.enum(['approve', 'reject']),
    escalateToAreaManager: z.boolean().optional(),
    comment: z.string().trim().optional(),
  })
  .refine(
    (val) => {
      if (val.decision === 'reject') {
        return !!val.comment && val.comment.trim().length >= 5;
      }
      return true;
    },
    {
      message: 'A rejection comment must be at least 5 characters.',
      path: ['comment'],
    },
  );

/**
 * Checks if user is assigned to project or holds global project view role.
 */
async function canAccessProject(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  role: string | null | undefined,
  projectId: string | null | undefined,
): Promise<boolean> {
  if (!projectId) return true;
  if (role === 'admin' || role === 'ceo' || role === 'area_manager') {
    return true;
  }
  const { data } = await supabase
    .from('project_members')
    .select('id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!data;
}

/**
 * First-level drawing review decision action by Resident Engineer or Admin.
 */
export async function submitResidentEngineerReview(
  input: ResidentEngineerReviewInput,
): Promise<{ success: boolean; newStatus?: string; error?: string }> {
  // 1. Require review.decide capability
  const user = await requireCan('review.decide');

  // 2. Validate input payload
  const parsed = reviewInputSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid review submission data',
    };
  }

  const supabase = await createClient();

  // 3. Query document and verify project access
  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, project_id, status, revision')
    .eq('id', parsed.data.documentId)
    .maybeSingle();

  if (fetchError || !doc) {
    return { success: false, error: 'Document not found or access denied.' };
  }

  const allowed = await canAccessProject(supabase, user.id, user.role, doc.project_id);
  if (!allowed) {
    return { success: false, error: 'Access denied: Project is not assigned to your account.' };
  }

  // 4. Verify document is in submitted status
  if (doc.status !== 'submitted') {
    return { success: false, error: `Document cannot be reviewed in status '${doc.status}'.` };
  }

  // 5. Compute target status
  let newStatus: 'rejected' | 'escalated' | 'ready_for_authority';
  if (parsed.data.decision === 'reject') {
    newStatus = 'rejected';
  } else if (parsed.data.escalateToAreaManager) {
    newStatus = 'escalated';
  } else {
    newStatus = 'ready_for_authority';
  }

  // 6. Update document status
  const { error: updateError } = await supabase
    .from('documents')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', doc.id);

  if (updateError) {
    return { success: false, error: updateError.message };
  }

  // 7. Insert review audit record into document_reviews
  const reviewLevel: 're' | 'am' | 'admin' =
    user.role === 'admin'
      ? 'admin'
      : user.role === 'area_manager'
        ? 'am'
        : 're';

  const { error: reviewError } = await supabase.from('document_reviews').insert({
    document_id: doc.id,
    revision_label: doc.revision || 'R00',
    reviewer_id: user.id,
    level: reviewLevel,
    decision: parsed.data.decision,
    comment: parsed.data.comment?.trim() || null,
  });

  if (reviewError) {
    return { success: false, error: reviewError.message };
  }

  // 8. Revalidate paths
  revalidatePath('/review');
  revalidatePath('/reviews');
  revalidatePath('/documents');

  return { success: true, newStatus };
}
