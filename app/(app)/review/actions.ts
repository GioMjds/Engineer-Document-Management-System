'use server';

import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  submitResidentEngineerReview,
  submitAreaManagerReview,
  type ResidentEngineerReviewInput,
  type AreaManagerReviewInput,
} from '@/app/actions/reviews';

export {
  submitResidentEngineerReview,
  submitAreaManagerReview,
  type ResidentEngineerReviewInput,
  type AreaManagerReviewInput,
};

export async function submitReview(input: {
  document_id: string;
  decision: 'approved' | 'rejected';
  comment?: string;
  escalateToAreaManager?: boolean;
}): Promise<{ ok: true; newStatus?: string } | { ok: false; error: string }> {
  const user = await requireCan('review.decide');
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from('documents')
    .select('id, status, project_id')
    .eq('id', input.document_id)
    .maybeSingle();

  if (!doc) {
    return { ok: false, error: 'Document not found.' };
  }

  const decision = input.decision === 'approved' ? 'approve' : 'reject';

  // Area Manager or escalated drawing routes to Area Manager review
  if (user.role === 'area_manager' || doc.status === 'escalated') {
    const result = await submitAreaManagerReview({
      documentId: input.document_id,
      decision,
      comment: input.comment,
    });

    if (!result.success) {
      return { ok: false, error: result.error || 'Area Manager review failed.' };
    }
    return { ok: true, newStatus: result.newStatus };
  }

  // Resident Engineer or Admin reviewing submitted drawing
  const result = await submitResidentEngineerReview({
    documentId: input.document_id,
    decision,
    comment: input.comment,
    escalateToAreaManager: input.escalateToAreaManager,
  });

  if (!result.success) {
    return { ok: false, error: result.error || 'Failed to submit review' };
  }

  return { ok: true, newStatus: result.newStatus };
}
