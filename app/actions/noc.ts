'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { StageMilestoneDates, ProjectLifecycleStage } from '@/types/noc';
import { canUserAdvanceStage, canUserModifyMilestones } from '@/lib/project-lifecycle';
import type { Json } from '@/types/database';


const feePaymentSchema = z.object({
  amount: z.number().nonnegative('Amount must be non-negative'),
  payer: z.enum(['client', 'contractor'] as const),
  receiptNumber: z.string().trim().min(1, 'Receipt number is required'),
  receiptFileUrl: z.string().optional(),
});

const submitNocSchema = z.object({
  authorityReference: z.string().trim().min(1, 'Authority reference number is required'),
  submittedAt: z.string().trim().min(1, 'Submission date is required'),
  submissionProofUrl: z.string().optional(),
  statutoryWaiverReason: z.string().optional(),
});

const authorityDecisionSchema = z
  .object({
    decision: z.enum(['obtained', 'rejected'] as const),
    expiryDate: z.string().optional(),
    rejectionReason: z.string().optional(),
    officialDocumentUrl: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.decision === 'obtained') {
        if (!data.expiryDate) return false;
        const exp = new Date(data.expiryDate);
        return !isNaN(exp.getTime()) && exp.getTime() > Date.now();
      }
      return true;
    },
    {
      message: 'Future expiry date is required when NOC is obtained',
      path: ['expiryDate'],
    },
  )
  .refine(
    (data) => {
      if (data.decision === 'rejected') {
        return Boolean(data.rejectionReason && data.rejectionReason.trim().length >= 5);
      }
      return true;
    },
    {
      message: 'Rejection reason must be at least 5 characters',
      path: ['rejectionReason'],
    },
  );

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Submits an application to statutory authority */
export async function submitNocApplication(
  nocId: string,
  input: {
    authorityReference: string;
    submittedAt: string;
    submissionProofUrl?: string;
    statutoryWaiverReason?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const user = await requireCan('noc.tracker.update');

  const parsed = submitNocSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid submission input' };
  }

  const { authorityReference, submittedAt, submissionProofUrl, statutoryWaiverReason } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (!UUID_REGEX.test(nocId)) {
      // Mock / seed project fallback: revalidate and return success for client-side state update
      revalidatePath('/noc-tracker');
      revalidatePath('/');
      return { success: true };
    }

    const { data: currentNoc, error: fetchErr } = await supabase
        .from('project_nocs')
        .select('id, project_id, blocking_sequence_no, override_reason')
        .eq('id', nocId)
        .maybeSingle();

      if (fetchErr || !currentNoc) {
        return { success: false, error: fetchErr?.message || 'NOC not found' };
      }

      if (currentNoc.blocking_sequence_no && !currentNoc.override_reason) {
        const { data: prereq } = await supabase
          .from('project_nocs')
          .select('id, status_code, sequence_no')
          .eq('project_id', currentNoc.project_id)
          .eq('sequence_no', currentNoc.blocking_sequence_no)
          .maybeSingle();

        if (prereq && prereq.status_code !== 'obtained' && prereq.status_code !== 'approved') {
          return {
            success: false,
            error: `Prerequisite NOC (Seq #${currentNoc.blocking_sequence_no}) not yet obtained.`,
          };
        }
      }

      // Strict Validation: enforce all statutory checklist requirements are satisfied
      const { data: requirements, error: reqErr } = await supabase
        .from('project_noc_requirements')
        .select('id, title, is_satisfied')
        .eq('project_noc_id', nocId);

      if (reqErr) {
        return { success: false, error: reqErr.message };
      }

      const pendingReqs = (requirements || []).filter((r) => !r.is_satisfied);
      if (pendingReqs.length > 0) {
        const isAdmin = user.role === 'admin';
        const trimmedWaiver = statutoryWaiverReason?.trim() || '';
        const hasValidWaiver = isAdmin && trimmedWaiver.length >= 15;

        if (!hasValidWaiver) {
          const pendingTitles = pendingReqs.map((r) => `"${r.title}"`).slice(0, 3).join(', ');
          const extra = pendingReqs.length > 3 ? ` and ${pendingReqs.length - 3} more` : '';
          return {
            success: false,
            error: `Statutory submission blocked: ${pendingReqs.length} requirement(s) unsatisfied (${pendingTitles}${extra}). Complete all checklist items or provide documented Admin waiver (min 15 chars).`,
          };
        }
      }

      const { error: updateError } = await supabase
        .from('project_nocs')
        .update({
          reference_no: authorityReference,
          apply_date: submittedAt,
          status_code: 'applied',
          receipt_file_url: submissionProofUrl || null,
          override_reason: statutoryWaiverReason?.trim() || currentNoc.override_reason,
          updated_at: now,
          updated_by: user.id,
        })
        .eq('id', nocId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      await supabase.from('audit_log').insert({
        action: 'NOC_SUBMITTED',
        actor_id: user.id,
        entity: 'project_nocs',
        entity_id: nocId,
        metadata: {
          authorityReference,
          submittedAt,
          statutoryWaiverReason: statutoryWaiverReason?.trim() || null,
          pendingRequirementsCount: pendingReqs.length,
        },
      });

    revalidatePath('/noc-tracker');
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to submit NOC application';
    return { success: false, error: message };
  }
}

/** Records authority decision (Obtained or Rejected) */
export async function recordAuthorityDecision(
  nocId: string,
  input: {
    decision: 'obtained' | 'rejected';
    expiryDate?: string;
    rejectionReason?: string;
    officialDocumentUrl?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const user = await requireCan('noc.tracker.update');

  const parsed = authorityDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid decision input' };
  }

  const { decision, expiryDate, rejectionReason, officialDocumentUrl } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (!UUID_REGEX.test(nocId)) {
      // Mock / seed project fallback: revalidate and return success for client-side state update
      revalidatePath('/noc-tracker');
      revalidatePath('/');
      return { success: true };
    }

    const { data: currentNoc } = await supabase
        .from('project_nocs')
        .select('id, current_revision')
        .eq('id', nocId)
        .maybeSingle();

      if (!currentNoc) {
        return { success: false, error: 'NOC not found' };
      }

      if (decision === 'obtained') {
        const trimmedDoc = officialDocumentUrl?.trim();
        const isHttpUrl = Boolean(trimmedDoc && /^https?:\/\//i.test(trimmedDoc));
        const fileUrl = isHttpUrl ? trimmedDoc : null;
        const certRemark = trimmedDoc && !isHttpUrl ? `Certificate #${trimmedDoc}` : null;

        const { error: updateError } = await supabase
          .from('project_nocs')
          .update({
            status_code: 'approved',
            expiry_date: expiryDate!,
            receive_date: now.split('T')[0],
            file_url: fileUrl,
            remarks: certRemark,
            updated_at: now,
            updated_by: user.id,
          })
          .eq('id', nocId);

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        await supabase.from('audit_log').insert({
          action: 'NOC_OBTAINED',
          actor_id: user.id,
          entity: 'project_nocs',
          entity_id: nocId,
          metadata: { decision, expiryDate, officialDocumentUrl: trimmedDoc || null },
        });
      } else {
        const currentRev = currentNoc.current_revision || 'R00';
        const match = currentRev.match(/^R(\d+)$/i);
        const nextNum = match ? parseInt(match[1], 10) + 1 : 1;
        const nextRevision = `R${String(nextNum).padStart(2, '0')}`;

        await supabase.from('noc_resubmission_history').insert({
          project_noc_id: nocId,
          revision: nextRevision,
          rejection_reason: rejectionReason!,
          rejection_date: now,
          resubmission_date: now,
          resubmitted_by: user.id,
        });

        const { error: updateError } = await supabase
          .from('project_nocs')
          .update({
            status_code: 'rejected',
            remarks: rejectionReason!,
            current_revision: nextRevision,
            updated_at: now,
            updated_by: user.id,
          })
          .eq('id', nocId);

        if (updateError) {
          return { success: false, error: updateError.message };
        }

        await supabase.from('audit_log').insert({
          action: 'NOC_REJECTED',
          actor_id: user.id,
          entity: 'project_nocs',
          entity_id: nocId,
          metadata: { decision, rejectionReason, nextRevision },
        });
      }

    revalidatePath('/noc-tracker');
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record authority decision';
    return { success: false, error: message };
  }
}

/** Records fee payment for a NOC */
export async function recordNocFeePayment(
  nocId: string,
  input: {
    amount: number;
    payer: 'client' | 'contractor';
    receiptNumber: string;
    receiptFileUrl?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const user = await requireCan('noc.tracker.update');

  const parsed = feePaymentSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Invalid fee payment input' };
  }

  const { amount, payer, receiptNumber, receiptFileUrl } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (!UUID_REGEX.test(nocId)) {
      return {
        success: false,
        error: 'Recording fee payments requires a persisted database NOC. Please select an active project.',
      };
    }

    const { error } = await supabase
      .from('project_nocs')
      .update({
        payment_fee: amount,
        is_paid: true,
        payer_type: payer,
        receipt_file_url: receiptFileUrl || null,
        remarks: `Receipt #${receiptNumber}`,
        updated_at: now,
        updated_by: user.id,
      })
      .eq('id', nocId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/noc-tracker');
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to record fee payment';
    return { success: false, error: message };
  }
}

/**
 * Updates NOC matrix requirement with mandatory justification.
 * Propagates only to unobtained project NOCs.
 */
export async function updateNocMatrixItem(
  matrixItemId: string,
  updates: Record<string, unknown>,
  justification: string,
): Promise<{ success: boolean; revisionId?: string; error?: string }> {
  const user = await requireCan('noc.matrix.edit');

  if (!justification || justification.trim().length < 10) {
    return {
      success: false,
      error: 'Written justification must be at least 10 characters long.',
    };
  }

  try {
    const supabase = await createClient();
    const isUuid = UUID_REGEX.test(matrixItemId);
    let createdRevisionId: string | undefined;

    if (isUuid) {
      const { data: existing } = await supabase
        .from('noc_matrix_items')
        .select('*')
        .eq('id', matrixItemId)
        .maybeSingle();

      if (!existing) {
        return { success: false, error: 'Matrix item not found.' };
      }

      type MatrixItemUpdatePayload = {
        description?: string;
        default_fee?: number;
        validity_days?: number;
        blocking_sequence_no?: number | null;
        updated_at: string;
      };
      const updateData: MatrixItemUpdatePayload = {
        updated_at: new Date().toISOString(),
      };
      if (typeof updates.description === 'string') updateData.description = updates.description;
      if (typeof updates.defaultFee === 'number') updateData.default_fee = updates.defaultFee;
      if (typeof updates.validityDays === 'number') updateData.validity_days = updates.validityDays;
      if (typeof updates.blockingSequenceNo === 'number' || updates.blockingSequenceNo === null) {
        updateData.blocking_sequence_no = updates.blockingSequenceNo;
      }

      const { error: updateError } = await supabase
        .from('noc_matrix_items')
        .update(updateData)
        .eq('id', matrixItemId);

      if (updateError) {
        return { success: false, error: updateError.message };
      }

      type ProjectNocUpdatePayload = {
        description?: string;
        payment_fee?: number;
        blocking_sequence_no?: number | null;
        updated_at: string;
        updated_by: string;
      };
      const projectNocUpdates: ProjectNocUpdatePayload = {
        updated_at: new Date().toISOString(),
        updated_by: user.id,
      };
      if (typeof updates.description === 'string') projectNocUpdates.description = updates.description;
      if (typeof updates.defaultFee === 'number') projectNocUpdates.payment_fee = updates.defaultFee;
      if (typeof updates.blockingSequenceNo === 'number' || updates.blockingSequenceNo === null) {
        projectNocUpdates.blocking_sequence_no = updates.blockingSequenceNo;
      }

      const { data: updatedNocs } = await supabase
        .from('project_nocs')
        .update(projectNocUpdates)
        .eq('matrix_item_id', matrixItemId)
        .neq('status_code', 'obtained')
        .neq('status_code', 'approved')
        .select('id, project_id');

      const affectedProjects = updatedNocs
        ? new Set(updatedNocs.map((r) => r.project_id)).size
        : 0;
      const affectedCount = updatedNocs?.length ?? 0;

      const { data: revData } = await supabase
        .from('noc_matrix_revisions')
        .insert({
          master_authority_id: existing.master_authority_id,
          matrix_item_id: existing.id,
          action: 'UPDATE',
          changed_by: user.id,
          change_summary: justification.trim(),
          previous_data: JSON.parse(JSON.stringify(existing)),
          new_data: JSON.parse(JSON.stringify(updates)),
          propagated_projects_count: affectedProjects,
          propagated_nocs_count: affectedCount,
        })
        .select('id')
        .single();

      createdRevisionId = revData?.id;
    }

    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');
    revalidatePath('/');
    return { success: true, revisionId: createdRevisionId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update matrix item';
    return { success: false, error: message };
  }
}

/** Updates project milestone dates in public.projects */
export async function updateProjectMilestonesAction(
  projectCode: string,
  milestones: StageMilestoneDates,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || '';
    if (!canUserModifyMilestones(role)) {
      return {
        success: false,
        error: 'Only Resident Engineers or Managers can modify milestones.',
      };
    }

    const { error } = await supabase
      .from('projects')
      .update({
        milestones: milestones as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('code', projectCode);

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'UPDATE_PROJECT_MILESTONES',
      entity: 'projects',
      entity_id: projectCode,
      metadata: { projectCode, milestones: milestones as unknown as Json },
    });

    revalidatePath('/noc-tracker');
    revalidatePath(`/noc-tracker/${projectCode}`);
    revalidatePath('/dashboard');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to update milestones';
    return { success: false, error: message };
  }
}

/** Advances project lifecycle stage in public.projects */
export async function advanceProjectStageAction(
  projectCode: string,
  newStage: ProjectLifecycleStage,
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Unauthorized.' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const role = profile?.role || '';
    if (!canUserAdvanceStage(role)) {
      return {
        success: false,
        error: 'Advancing stage requires Resident Engineer or Management approval.',
      };
    }

    const stageEnumMap: Record<ProjectLifecycleStage, 'design' | 'construction' | 'handover' | 'completed'> = {
      'Pre-Construction': 'design',
      'Construction': 'construction',
      'Handover': 'handover',
      'Completed': 'completed',
    };

    const { error } = await supabase
      .from('projects')
      .update({
        stage: stageEnumMap[newStage] || 'design',
        updated_at: new Date().toISOString(),
      })
      .eq('code', projectCode);

    if (error) {
      return { success: false, error: error.message };
    }

    await supabase.from('audit_log').insert({
      actor_id: user.id,
      action: 'ADVANCE_PROJECT_STAGE',
      entity: 'projects',
      entity_id: projectCode,
      metadata: { projectCode, newStage },
    });

    revalidatePath('/noc-tracker');
    revalidatePath(`/noc-tracker/${projectCode}`);
    revalidatePath('/dashboard');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to advance project stage';
    return { success: false, error: message };
  }
}

