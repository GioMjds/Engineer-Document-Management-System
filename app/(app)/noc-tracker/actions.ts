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

      await supabase.from('audit_log').insert({
        action: 'NOC_FEE_RECORDED',
        actor_id: user.id,
        entity: 'project_nocs',
        entity_id: nocId,
        metadata: { paymentFee, payerType, hasReceipt: Boolean(receiptFileUrl) },
      });
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

      // Update project_nocs status to applied (Submitted)
      const isFileUrl = Boolean(resubmitFileName && /^https?:\/\//i.test(resubmitFileName));
      const { error: updateError } = await supabase
        .from('project_nocs')
        .update({
          current_revision: newRevision,
          status_code: 'applied',
          apply_date: now.split('T')[0],
          file_url: isFileUrl ? resubmitFileName : null,
          remarks: null,
          updated_at: now,
          updated_by: user.id,
        })
        .eq('id', nocId);

      if (updateError) {
        return { ok: false, error: updateError.message };
      }

      await supabase.from('audit_log').insert({
        action: 'NOC_RESUBMITTED',
        actor_id: user.id,
        entity: 'project_nocs',
        entity_id: nocId,
        metadata: {
          newRevision,
          previousRejectionReason: previousRejectionReason || null,
        },
      });
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

export async function toggleProjectNocRequirement(
  requirementId: string,
  isSatisfied: boolean,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCan('noc.tracker.update');

  if (!UUID_REGEX.test(requirementId)) {
    return { ok: false, error: 'Invalid requirement ID' };
  }

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    // Verify requirement exists and check parent NOC approval lock
    const { data: reqRow, error: reqFetchErr } = await supabase
      .from('project_noc_requirements')
      .select('id, title, project_noc_id, project_nocs!inner(status_code)')
      .eq('id', requirementId)
      .maybeSingle();

    if (reqFetchErr || !reqRow) {
      return { ok: false, error: 'Requirement not found' };
    }

    const nocStatus = (reqRow.project_nocs as { status_code?: string })?.status_code;
    if (nocStatus === 'approved' && user.role !== 'admin') {
      return {
        ok: false,
        error: 'NOC is already Approved. Only Admins can modify requirements on approved NOCs.',
      };
    }

    const { error } = await supabase
      .from('project_noc_requirements')
      .update({
        is_satisfied: isSatisfied,
        updated_at: now,
        updated_by: user.id,
      })
      .eq('id', requirementId);

    if (error) {
      return { ok: false, error: error.message };
    }

    // Audit log requirement toggle
    await supabase.from('audit_log').insert({
      action: 'NOC_REQUIREMENT_TOGGLED',
      actor_id: user.id,
      entity: 'project_noc_requirements',
      entity_id: requirementId,
      metadata: {
        title: reqRow.title,
        project_noc_id: reqRow.project_noc_id,
        is_satisfied: isSatisfied,
      },
    });

    revalidatePath('/noc-tracker');
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update requirement';
    return { ok: false, error: message };
  }
}

export async function addProjectNocRequirement(
  projectNocId: string,
  title: string,
): Promise<{ ok: boolean; data?: { id: string; title: string; isSatisfied: boolean }; error?: string }> {
  const user = await requireCan('noc.tracker.update');

  if (!UUID_REGEX.test(projectNocId)) {
    return { ok: false, error: 'Invalid NOC ID' };
  }
  const cleanTitle = title.trim();
  if (!cleanTitle) {
    return { ok: false, error: 'Requirement description is required' };
  }

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    const { data: nocRow, error: nocErr } = await supabase
      .from('project_nocs')
      .select('id, status_code')
      .eq('id', projectNocId)
      .maybeSingle();

    if (nocErr || !nocRow) {
      return { ok: false, error: 'NOC not found' };
    }

    if (nocRow.status_code === 'approved' && user.role !== 'admin') {
      return {
        ok: false,
        error: 'NOC is already Approved. Only Admins can add requirements to approved NOCs.',
      };
    }

    const { data: inserted, error: insertErr } = await supabase
      .from('project_noc_requirements')
      .insert({
        project_noc_id: projectNocId,
        title: cleanTitle,
        is_satisfied: false,
        updated_at: now,
        updated_by: user.id,
      })
      .select('id, title, is_satisfied')
      .single();

    if (insertErr || !inserted) {
      return { ok: false, error: insertErr?.message || 'Failed to insert requirement' };
    }

    await supabase.from('audit_log').insert({
      action: 'NOC_REQUIREMENT_ADDED',
      actor_id: user.id,
      entity: 'project_noc_requirements',
      entity_id: inserted.id,
      metadata: {
        title: cleanTitle,
        project_noc_id: projectNocId,
      },
    });

    revalidatePath('/noc-tracker');
    return {
      ok: true,
      data: {
        id: inserted.id,
        title: inserted.title,
        isSatisfied: inserted.is_satisfied,
      },
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to add requirement';
    return { ok: false, error: message };
  }
}

export async function deleteProjectNocRequirement(
  requirementId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireCan('noc.tracker.update');

  if (!UUID_REGEX.test(requirementId)) {
    return { ok: false, error: 'Invalid requirement ID' };
  }

  try {
    const supabase = await createClient();

    const { data: reqRow, error: reqFetchErr } = await supabase
      .from('project_noc_requirements')
      .select('id, title, project_noc_id, project_nocs!inner(status_code)')
      .eq('id', requirementId)
      .maybeSingle();

    if (reqFetchErr || !reqRow) {
      return { ok: false, error: 'Requirement not found' };
    }

    const nocStatus = (reqRow.project_nocs as { status_code?: string })?.status_code;
    if (nocStatus === 'approved' && user.role !== 'admin') {
      return {
        ok: false,
        error: 'NOC is already Approved. Only Admins can delete requirements from approved NOCs.',
      };
    }

    const { error } = await supabase
      .from('project_noc_requirements')
      .delete()
      .eq('id', requirementId);

    if (error) {
      return { ok: false, error: error.message };
    }

    await supabase.from('audit_log').insert({
      action: 'NOC_REQUIREMENT_DELETED',
      actor_id: user.id,
      entity: 'project_noc_requirements',
      entity_id: requirementId,
      metadata: {
        title: reqRow.title,
        project_noc_id: reqRow.project_noc_id,
      },
    });

    revalidatePath('/noc-tracker');
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to delete requirement';
    return { ok: false, error: message };
  }
}

