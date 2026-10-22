'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser, requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { NocPayerType } from '@/types/noc';

const recordFeePaymentSchema = z.object({
  nocId: z.string().min(1, 'NOC ID is required'),
  paymentFee: z.number().min(0, 'Payment fee must be non-negative'),
  payerType: z.enum(['client', 'contractor', 'consultant_advance'] as const),
  receiptFileUrl: z.string().optional(),
});

const resubmitRevisionSchema = z.object({
  nocId: z.string().min(1, 'NOC ID is required'),
  newRevision: z.string().min(1, 'New revision is required'),
  resubmitFileName: z.string().optional(),
  previousRejectionReason: z.string().optional(),
});

const adminOverrideSchema = z.object({
  nocId: z.string().min(1, 'NOC ID is required'),
  justification: z.string().min(15, 'Justification must be at least 15 characters'),
});

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type RecordNocFeePaymentInput = {
  nocId: string;
  paymentFee: number;
  payerType: NocPayerType;
  receiptFileUrl?: string;
};

export type ResubmitNocRevisionInput = {
  nocId: string;
  newRevision: string;
  resubmitFileName?: string;
  previousRejectionReason?: string;
};

export type AdminOverridePrerequisiteSequenceInput = {
  nocId: string;
  justification: string;
};

export async function recordNocFeePayment(
  input: RecordNocFeePaymentInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCan('noc.tracker.update');

  const parsed = recordFeePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid fee payment input' };
  }

  const { nocId, paymentFee, payerType, receiptFileUrl } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (UUID_REGEX.test(nocId)) {
      const { error } = await supabase
        .from('project_nocs')
        .update({
          payment_fee: paymentFee,
          is_paid: true,
          payer_type: payerType,
          receipt_file_url: receiptFileUrl || null,
          updated_at: now,
          updated_by: user.id,
        })
        .eq('id', nocId);

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    revalidatePath('/noc-tracker');
    revalidatePath('/');
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record fee payment';
    return { ok: false, error: message };
  }
}

export async function resubmitNocRevision(
  input: ResubmitNocRevisionInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();

  const parsed = resubmitRevisionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid resubmission input' };
  }

  const { nocId, newRevision, resubmitFileName, previousRejectionReason } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (UUID_REGEX.test(nocId)) {
      // Log previous rejection into noc_resubmission_history
      const { error: histError } = await supabase.from('noc_resubmission_history').insert({
        project_noc_id: nocId,
        revision: newRevision,
        rejection_reason: previousRejectionReason || 'Authority rejection',
        rejection_date: now,
        resubmission_date: now,
        resubmitted_by: user.id,
      });

      if (histError) {
        return { ok: false, error: histError.message };
      }

      // Update project_nocs status to Not Started
      const isFileUrl = Boolean(resubmitFileName && /^https?:\/\//i.test(resubmitFileName));
      const { error: updateError } = await supabase
        .from('project_nocs')
        .update({
          current_revision: newRevision,
          status_code: 'not_started',
          file_url: isFileUrl ? resubmitFileName : null,
          remarks: null,
          updated_at: now,
          updated_by: user.id,
        })
        .eq('id', nocId);

      if (updateError) {
        return { ok: false, error: updateError.message };
      }
    }

    revalidatePath('/noc-tracker');
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to resubmit NOC revision';
    return { ok: false, error: message };
  }
}

export async function adminOverridePrerequisiteSequence(
  input: AdminOverridePrerequisiteSequenceInput
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCan('noc.sequence.override');

  const parsed = adminOverrideSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || 'Invalid override input' };
  }

  const { nocId, justification } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (UUID_REGEX.test(nocId)) {
      const { error } = await supabase
        .from('project_nocs')
        .update({
          override_reason: justification,
          overridden_by: user.id,
          overridden_at: now,
          updated_at: now,
          updated_by: user.id,
        })
        .eq('id', nocId);

      if (error) {
        return { ok: false, error: error.message };
      }
    }

    revalidatePath('/noc-tracker');
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record prerequisite override';
    return { ok: false, error: message };
  }
}
