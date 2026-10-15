'use server';

import {
  submitResidentEngineerReview,
  type ResidentEngineerReviewInput,
} from '@/app/actions/reviews';

export { submitResidentEngineerReview, type ResidentEngineerReviewInput };

export async function submitReview(input: {
  document_id: string;
  decision: 'approved' | 'rejected';
  comment?: string;
  escalateToAreaManager?: boolean;
}): Promise<{ ok: true; newStatus?: string } | { ok: false; error: string }> {
  const result = await submitResidentEngineerReview({
    documentId: input.document_id,
    decision: input.decision === 'approved' ? 'approve' : 'reject',
    comment: input.comment,
    escalateToAreaManager: input.escalateToAreaManager,
  });

  if (!result.success) {
    return { ok: false, error: result.error || 'Failed to submit review' };
  }

  return { ok: true, newStatus: result.newStatus };
}
