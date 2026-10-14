'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const reviewSchema = z
  .object({
    document_id: z.string().uuid(),
    decision: z.enum(['approved', 'rejected']),
    comment: z.string().trim().max(1000).optional(),
  })
  .refine((v) => v.decision === 'approved' || !!v.comment, {
    message: 'A comment is required when rejecting.',
    path: ['comment'],
  });

export async function submitReview(input: {
  document_id: string;
  decision: 'approved' | 'rejected';
  comment?: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireCan('review.decide');

  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0].message };
  }

  const supabase = await createClient();

  // Only review documents that are still awaiting a decision
  const { data: doc } = await supabase
    .from('documents')
    .select('id, status')
    .eq('id', parsed.data.document_id)
    .single();

  if (!doc) return { ok: false, error: 'Document not found.' };
  if (doc.status !== 'submitted') {
    return { ok: false, error: 'This document was already reviewed.' };
  }

  const { error } = await supabase.from('reviews').insert({
    document_id: parsed.data.document_id,
    reviewer_id: user.id,
    decision: parsed.data.decision,
    comment: parsed.data.comment || null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath('/review');
  revalidatePath('/documents');
  return { ok: true };
}
