'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { getCurrentUser, requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type {
  StageMilestoneDates,
  ProjectLifecycleStage,
  ProjectDisciplineStatus,
  ThirdPartySpecialistRecord,
  ThirdPartySpecialistType,
} from '@/types/noc';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  DB_STAGE_TO_LIFECYCLE,
  LIFECYCLE_TO_DB_STAGE,
  canUserAdvanceStage,
  canUserModifyMilestones,
  getNextLifecycleStage,
} from '@/lib/project-lifecycle';
import {
  ALL_SPECIALIST_TYPES,
  actorLabel,
  canUserEditDiscipline,
  canUserReviewSpecialist,
  emptyDisciplineStatus,
} from '@/lib/project-status';
import { getScopedProject } from '@/lib/project-access';
import type { Json } from '@/types/database';
import { notifyNoc } from '@/lib/email/noc-notifications';

const feePaymentSchema = z.object({
  amount: z.number().nonnegative('Amount must be non-negative'),
  payer: z.enum(['client', 'contractor'] as const),
  receiptNumber: z.string().trim().min(1, 'Receipt number is required'),
  receiptFileUrl: z.string().optional(),
});

const submitNocSchema = z.object({
  authorityReference: z
    .string()
    .trim()
    .min(1, 'Authority reference number is required'),
  submittedAt: z.string().trim().min(1, 'Submission date is required'),
  submissionProofUrl: z.string().optional(),
  statutoryWaiverReason: z.string().optional(),
});

const authorityDecisionSchema = z
  .object({
    decision: z.enum(['obtained', 'rejected'] as const),
    isPermanent: z.boolean().optional(),
    expiryDate: z.string().optional(),
    rejectionReason: z.string().optional(),
    officialDocumentUrl: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.decision === 'obtained') {
        if (data.isPermanent) return true;
        if (!data.expiryDate) return false;
        const exp = new Date(data.expiryDate);
        return !isNaN(exp.getTime()) && exp.getTime() > Date.now();
      }
      return true;
    },
    {
      message:
        'Future expiry date is required when NOC is obtained and not marked permanent',
      path: ['expiryDate'],
    },
  )
  .refine(
    (data) => {
      if (data.decision === 'rejected') {
        return Boolean(
          data.rejectionReason && data.rejectionReason.trim().length >= 5,
        );
      }
      return true;
    },
    {
      message: 'Rejection reason must be at least 5 characters',
      path: ['rejectionReason'],
    },
  );

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid submission input',
    };
  }

  const {
    authorityReference,
    submittedAt,
    submissionProofUrl,
    statutoryWaiverReason,
  } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (!UUID_REGEX.test(nocId)) {
      return { success: false, error: 'Invalid NOC identifier.' };
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

      if (
        prereq &&
        prereq.status_code !== 'obtained' &&
        prereq.status_code !== 'approved'
      ) {
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
        const pendingTitles = pendingReqs
          .map((r) => `"${r.title}"`)
          .slice(0, 3)
          .join(', ');
        const extra =
          pendingReqs.length > 3 ? ` and ${pendingReqs.length - 3} more` : '';
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
        override_reason:
          statutoryWaiverReason?.trim() || currentNoc.override_reason,
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
    const message =
      err instanceof Error ? err.message : 'Failed to submit NOC application';
    return { success: false, error: message };
  }
}

/** Records authority decision (Obtained or Rejected) */
export async function recordAuthorityDecision(
  nocId: string,
  input: {
    decision: 'obtained' | 'rejected';
    isPermanent?: boolean;
    expiryDate?: string;
    rejectionReason?: string;
    officialDocumentUrl?: string;
  },
): Promise<{ success: boolean; error?: string }> {
  const user = await requireCan('noc.tracker.update');

  const parsed = authorityDecisionSchema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid decision input',
    };
  }

  const {
    decision,
    isPermanent,
    expiryDate,
    rejectionReason,
    officialDocumentUrl,
  } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (!UUID_REGEX.test(nocId)) {
      return { success: false, error: 'Invalid NOC identifier.' };
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
      const certRemark =
        trimmedDoc && !isHttpUrl ? `Certificate #${trimmedDoc}` : null;
      const finalExpiryDate = isPermanent ? null : expiryDate || null;

      const { error: updateError } = await supabase
        .from('project_nocs')
        .update({
          status_code: 'approved',
          expiry_date: finalExpiryDate,
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
        metadata: {
          decision,
          isPermanent: Boolean(isPermanent),
          expiryDate: finalExpiryDate,
          officialDocumentUrl: trimmedDoc || null,
        },
      });

      await notifyNoc(nocId, { type: 'approved' });
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

      await notifyNoc(nocId, {
        type: 'rejected',
        reason: rejectionReason!,
        revision: nextRevision,
      });
    }

    revalidatePath('/noc-tracker');
    revalidatePath('/');
    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to record authority decision';
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
    return {
      success: false,
      error: parsed.error.issues[0]?.message || 'Invalid fee payment input',
    };
  }

  const { amount, payer, receiptNumber, receiptFileUrl } = parsed.data;

  try {
    const supabase = await createClient();
    const now = new Date().toISOString();

    if (!UUID_REGEX.test(nocId)) {
      return {
        success: false,
        error:
          'Recording fee payments requires a persisted database NOC. Please select an active project.',
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
    const message =
      err instanceof Error ? err.message : 'Failed to record fee payment';
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
    if (!UUID_REGEX.test(matrixItemId)) {
      return { success: false, error: 'Valid matrix item UUID is required.' };
    }

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
    if (typeof updates.description === 'string')
      updateData.description = updates.description;
    if (typeof updates.defaultFee === 'number')
      updateData.default_fee = updates.defaultFee;
    if (typeof updates.validityDays === 'number')
      updateData.validity_days = updates.validityDays;
    if (
      typeof updates.blockingSequenceNo === 'number' ||
      updates.blockingSequenceNo === null
    ) {
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
    if (typeof updates.description === 'string')
      projectNocUpdates.description = updates.description;
    if (typeof updates.defaultFee === 'number')
      projectNocUpdates.payment_fee = updates.defaultFee;
    if (
      typeof updates.blockingSequenceNo === 'number' ||
      updates.blockingSequenceNo === null
    ) {
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

    const createdRevisionId = revData?.id;

    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');
    revalidatePath('/');
    return { success: true, revisionId: createdRevisionId };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update matrix item';
    return { success: false, error: message };
  }
}

const LIFECYCLE_STAGES = [
  'Pre-Construction',
  'Construction',
  'Handover',
  'Completed',
] as const;

const dateField = z.string().trim().max(32).optional();

// Only these keys are accepted from the client; disciplineStatus has its own action.
const milestonesSchema = z.object({
  preConstruction: z
    .object({
      kickoffDate: dateField,
      surveyCompletionDate: dateField,
      conceptApprovalDate: dateField,
      commencementDate: dateField,
      plannedCompletionDate: dateField,
      buildingPermitDate: dateField,
    })
    .optional(),
  construction: z
    .object({
      commencementDate: dateField,
      targetCompletionDate: dateField,
      extensionOfTimeDate: dateField,
    })
    .optional(),
  handover: z
    .object({
      commissioningDate: dateField,
      civilDefenceInspectionDate: dateField,
      bccIssuanceDate: dateField,
      targetCompletionDate: dateField,
    })
    .optional(),
  customPrerequisites: z
    .array(
      z.object({
        id: z.string().max(100),
        title: z.string().trim().min(1).max(200),
        category: z.string().max(60),
        stage: z.enum(LIFECYCLE_STAGES),
        isSatisfied: z.boolean(),
        mandatoryForNextStage: z.boolean().optional(),
        sourceReference: z.string().max(200).optional(),
        actionHint: z.string().max(300).optional(),
        createdAt: z.string().max(40).optional(),
      }),
    )
    .max(50)
    .optional(),
});

const stageStatusSchema = z.enum([
  'Not Started',
  'In Progress',
  'Under Review',
  'Client Approval',
  'Approved',
  'On Hold',
]);

const disciplineDetailSchema = z.object({
  status: stageStatusSchema,
  remarks: z.string().max(1000).optional(),
});

// Only status and remarks are accepted; actors, dates and file fields are set on the server.
const disciplineStatusSchema = z.object({
  architecture: disciplineDetailSchema,
  structure: disciplineDetailSchema,
  mep: disciplineDetailSchema,
  authorities: z.object({
    designStage: stageStatusSchema,
    constructionStage: stageStatusSchema,
    revisionStage: stageStatusSchema,
  }),
  specialists: z
    .array(
      z.object({
        type: z.custom<ThirdPartySpecialistType>(
          (v) =>
            typeof v === 'string' &&
            (ALL_SPECIALIST_TYPES as string[]).includes(v),
        ),
        status: z.enum(['Pending', 'Uploaded', 'Approved', 'Rejected']),
        remarks: z.string().max(1000).optional(),
      }),
    )
    .max(20),
});

/** Updates project milestone dates in public.projects */
export async function updateProjectMilestonesAction(
  projectCode: string,
  milestones: StageMilestoneDates,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized.' };

    if (!canUserModifyMilestones(user.role)) {
      return {
        success: false,
        error: 'Only Resident Engineers or Managers can modify milestones.',
      };
    }

    const parsed = milestonesSchema.safeParse(milestones);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid milestone data.',
      };
    }

    const project = await getScopedProject(user, projectCode);
    if (!project) return { success: false, error: 'Project not found.' };

    const existing = (
      typeof project.milestones === 'object' && project.milestones !== null
        ? project.milestones
        : {}
    ) as Record<string, unknown>;

    const section = (key: 'preConstruction' | 'construction' | 'handover') => ({
      ...((existing[key] as Record<string, unknown>) || {}),
      ...(parsed.data[key] || {}),
    });

    // Keeps disciplineStatus and any other stored keys untouched.
    const mergedMilestones = {
      ...existing,
      preConstruction: section('preConstruction'),
      construction: section('construction'),
      handover: section('handover'),
      customPrerequisites:
        parsed.data.customPrerequisites ?? existing.customPrerequisites,
    };

    const adminClient = createAdminClient();
    const { data: updatedRows, error } = await adminClient
      .from('projects')
      .update({
        milestones: mergedMilestones as unknown as Json,
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    if (!updatedRows || updatedRows.length === 0) {
      return {
        success: false,
        error: 'Failed to update project milestones in database.',
      };
    }

    await adminClient.from('audit_log').insert({
      actor_id: user.id,
      action: 'UPDATE_PROJECT_MILESTONES',
      entity: 'projects',
      entity_id: project.code,
      metadata: {
        projectCode: project.code,
        milestones: mergedMilestones as unknown as Json,
      },
    });

    revalidatePath('/noc-tracker');
    revalidatePath(`/noc-tracker/${project.code}`);
    revalidatePath('/dashboard');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to update milestones';
    return { success: false, error: message };
  }
}

/** Advances project lifecycle stage in public.projects */
export async function advanceProjectStageAction(
  projectCode: string,
  newStage: ProjectLifecycleStage,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized.' };

    if (!canUserAdvanceStage(user.role)) {
      return {
        success: false,
        error:
          'Advancing stage requires Resident Engineer or Management approval.',
      };
    }

    const target = z.enum(LIFECYCLE_STAGES).safeParse(newStage);
    if (!target.success) {
      return { success: false, error: 'Invalid lifecycle stage.' };
    }

    const project = await getScopedProject(user, projectCode);
    if (!project) return { success: false, error: 'Project not found.' };

    // Only Admin may skip or reverse a stage; everyone else moves one step forward.
    const current = DB_STAGE_TO_LIFECYCLE[project.stage];
    if (user.role !== 'admin') {
      if (current === 'Completed') {
        return {
          success: false,
          error: 'Project lifecycle is already completed.',
        };
      }
      const next = getNextLifecycleStage(current);
      if (target.data !== next) {
        return {
          success: false,
          error: `Project is in ${current}; it can only advance to ${next}.`,
        };
      }
    }

    const adminClient = createAdminClient();
    const { data: updatedRows, error } = await adminClient
      .from('projects')
      .update({
        stage: LIFECYCLE_TO_DB_STAGE[target.data],
        updated_at: new Date().toISOString(),
      })
      .eq('id', project.id)
      .select('id');

    if (error) {
      return { success: false, error: error.message };
    }

    if (!updatedRows || updatedRows.length === 0) {
      return {
        success: false,
        error: 'Failed to advance project stage in database.',
      };
    }

    await adminClient.from('audit_log').insert({
      actor_id: user.id,
      action: 'ADVANCE_PROJECT_STAGE',
      entity: 'projects',
      entity_id: project.code,
      metadata: {
        projectCode: project.code,
        previousStage: current,
        newStage: target.data,
      },
    });

    revalidatePath('/noc-tracker');
    revalidatePath(`/noc-tracker/${project.code}`);
    revalidatePath('/dashboard');
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to advance project stage';
    return { success: false, error: message };
  }
}

/** Updates discipline progress and specialist review decisions in public.projects milestones */
export async function updateProjectDisciplineStatusAction(
  projectCode: string,
  disciplineStatus: ProjectDisciplineStatus,
): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Unauthorized.' };

    const parsed = disciplineStatusSchema.safeParse(disciplineStatus);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.issues[0]?.message || 'Invalid discipline data.',
      };
    }
    const incoming = parsed.data;

    const project = await getScopedProject(user, projectCode);
    if (!project) return { success: false, error: 'Project not found.' };

    const currentMilestones = (
      typeof project.milestones === 'object' && project.milestones !== null
        ? project.milestones
        : {}
    ) as Record<string, unknown>;

    const stored: ProjectDisciplineStatus = {
      ...emptyDisciplineStatus(project.code),
      ...((currentMilestones.disciplineStatus as
        | ProjectDisciplineStatus
        | undefined) ?? {}),
    };
    const next: ProjectDisciplineStatus = { ...stored };
    const actor = actorLabel(user.role);
    const now = new Date().toISOString();
    let changed = false;

    for (const key of ['architecture', 'structure', 'mep'] as const) {
      const inc = incoming[key];
      const cur = stored[key];
      if (
        inc.status === cur.status &&
        (inc.remarks ?? '') === (cur.remarks ?? '')
      ) {
        continue;
      }
      if (!canUserEditDiscipline(user.role, key)) {
        return {
          success: false,
          error: `Your role cannot update ${key} progress.`,
        };
      }
      next[key] = {
        status: inc.status,
        remarks: inc.remarks,
        updatedBy: actor,
        updatedAt: now,
      };
      changed = true;
    }

    const incAuth = incoming.authorities;
    const curAuth = stored.authorities;
    if (
      incAuth.designStage !== curAuth.designStage ||
      incAuth.constructionStage !== curAuth.constructionStage ||
      incAuth.revisionStage !== curAuth.revisionStage
    ) {
      if (!canUserEditDiscipline(user.role, 'authorities')) {
        return {
          success: false,
          error: 'Your role cannot update authority stages.',
        };
      }
      next.authorities = { ...incAuth, updatedBy: actor, updatedAt: now };
      changed = true;
    }

    const specialists = [...(stored.specialists ?? [])];
    for (const inc of incoming.specialists) {
      const index = specialists.findIndex((s) => s.type === inc.type);
      const prev = index >= 0 ? specialists[index] : undefined;
      const prevStatus = prev?.status ?? 'Pending';
      const statusChanged = inc.status !== prevStatus;
      const remarksChanged = (inc.remarks ?? '') !== (prev?.remarks ?? '');
      if (!statusChanged && !remarksChanged) continue;

      // Uploaded and Pending belong to the upload and remove actions, which also move the file.
      if (
        statusChanged &&
        inc.status !== 'Approved' &&
        inc.status !== 'Rejected'
      ) {
        continue;
      }

      if (!canUserReviewSpecialist(user.role)) {
        return {
          success: false,
          error:
            'Only Admins, Area Managers or Resident Engineers can review studies.',
        };
      }

      const record: ThirdPartySpecialistRecord = {
        ...(prev ?? {
          id: `spec-${project.code}-${inc.type.toLowerCase().replace(/\s+/g, '-')}`,
          type: inc.type,
        }),
        status: statusChanged ? inc.status : prevStatus,
        remarks: inc.remarks,
        reviewedBy: actor,
        reviewedAt: now,
      };
      if (index >= 0) specialists[index] = record;
      else specialists.push(record);
      changed = true;
    }
    next.specialists = specialists;

    if (!changed) return { success: true };

    const adminClient = createAdminClient();
    const { error: updateError } = await adminClient
      .from('projects')
      .update({
        milestones: {
          ...currentMilestones,
          disciplineStatus: next,
        } as unknown as Json,
        updated_at: now,
      })
      .eq('id', project.id);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    await adminClient.from('audit_log').insert({
      actor_id: user.id,
      action: 'UPDATE_PROJECT_DISCIPLINE_STATUS',
      entity: 'projects',
      entity_id: project.id,
      metadata: {
        projectCode: project.code,
        disciplineStatus: next as unknown as Json,
      },
    });

    revalidatePath('/dashboard');
    revalidatePath(`/noc-tracker/${project.code}`);
    revalidatePath('/');

    return { success: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to update project discipline status';
    return { success: false, error: message };
  }
}
