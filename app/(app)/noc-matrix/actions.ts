'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser, requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { MATRIX_EDIT_ROLES } from '@/lib/noc-constants';
import type {
  MasterAuthorityRecord,
  NocMatrixItem,
  NocMatrixRevision,
  NocStage,
  ReviewingAuthority,
  ReviewingAuthorityRecord,
  SubmittedBy,
} from '@/types/noc';
import type { Database, Json } from '@/types/database';

const matrixRequirementSchema = z.object({
  id: z.string().optional(),
  title: z.string().min(1, 'Requirement title is required'),
  mandatory: z.boolean().default(true),
  sortOrder: z.number().int().default(0),
});

const updateMatrixItemSchema = z.object({
  matrixItemId: z.uuid('Valid matrix item UUID is required'),
  masterAuthorityId: z
    .number()
    .int()
    .positive('Valid master authority ID is required'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description cannot exceed 255 characters'),
  stage: z.string().min(1, 'Stage is required'),
  reviewingAuthorityId: z.number().int().positive().optional(),
  reviewingAuthority: z
    .string()
    .min(1, 'Reviewing authority is required')
    .optional(),
  submittedBy: z.string().min(1, 'Submitted by is required'),
  blockingSequenceNo: z.number().int().nullable().optional(),
  defaultFee: z.number().min(0, 'Default fee must be non-negative'),
  validityDays: z.number().int().min(1, 'Validity days must be at least 1'),
  requirements: z.array(matrixRequirementSchema).default([]),
  changeSummary: z
    .string()
    .min(5, 'Change summary must be at least 5 characters'),
});

const createMatrixItemSchema = z.object({
  masterAuthorityId: z
    .number()
    .int()
    .positive('Valid master authority ID is required'),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description cannot exceed 255 characters'),
  stage: z.string().min(1, 'Stage is required'),
  reviewingAuthorityId: z.number().int().positive().optional(),
  reviewingAuthority: z
    .string()
    .min(1, 'Reviewing authority is required')
    .optional(),
  submittedBy: z.string().min(1, 'Submitted by is required'),
  blockingSequenceNo: z.number().int().nullable().optional(),
  defaultFee: z.number().min(0, 'Default fee must be non-negative'),
  validityDays: z.number().int().min(1, 'Validity days must be at least 1'),
  requirements: z.array(matrixRequirementSchema).default([]),
  changeSummary: z
    .string()
    .min(5, 'Change summary must be at least 5 characters'),
});

const deleteMatrixItemSchema = z.object({
  matrixItemId: z.uuid('Valid matrix item UUID is required'),
  changeSummary: z
    .string()
    .min(5, 'Change summary must be at least 5 characters'),
});

export type UpdateMatrixItemInput = z.infer<typeof updateMatrixItemSchema>;
export type CreateMatrixItemInput = z.infer<typeof createMatrixItemSchema>;
export type DeleteMatrixItemInput = z.infer<typeof deleteMatrixItemSchema>;

function toDbStage(stage: string): Database['public']['Enums']['noc_stage'] {
  const norm = stage.trim().toLowerCase();
  if (norm === 'handover' || norm.includes('handover')) return 'handover';
  if (norm === 'construction' || norm.includes('construction'))
    return 'construction';
  if (norm === 'information' || norm.includes('information'))
    return 'information';
  return 'design';
}

function fromDbStage(stage: string): NocStage {
  const norm = stage.trim().toLowerCase();
  if (norm.includes('handover')) return 'Handover NOC';
  if (norm.includes('construction')) return 'Construction NOC';
  if (norm.includes('information')) return 'Information NOC';
  return 'Design NOC';
}

function toDbSubmitter(
  submitter: string,
): Database['public']['Enums']['noc_submitter'] {
  const norm = submitter.trim().toLowerCase();
  if (norm === 'client' || norm.includes('client')) return 'client';
  if (norm === 'contractor' || norm.includes('contractor')) return 'contractor';
  if (norm.includes('specialist')) return 'specialist';
  return 'consultant';
}

function fromDbSubmitter(submitter: string): SubmittedBy {
  const norm = submitter.trim().toLowerCase();
  if (norm.includes('client')) return 'Client';
  if (norm.includes('contractor')) return 'Contractor';
  if (norm.includes('specialist')) return 'Specialists';
  return 'Consultant';
}

async function resolveReviewingAuthorityId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
  providedId?: number,
): Promise<number | null> {
  if (providedId && providedId > 0) {
    return providedId;
  }

  const cleanName = name.trim();
  if (!cleanName) return null;

  try {
    const { data } = await supabase
      .from('reviewing_authorities')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle();

    if (data?.id) return data.id;

    // Dynamically insert newly encountered reviewing authority
    const { data: inserted, error } = await supabase
      .from('reviewing_authorities')
      .insert({ name: cleanName })
      .select('id')
      .single();

    if (inserted?.id && !error) return inserted.id;
  } catch {
    // Return null if resolution fails
  }

  return null;
}

export async function getMatrixTemplates(
  masterAuthorityId: number,
): Promise<{ ok: boolean; data: NocMatrixItem[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('noc_matrix_items')
      .select(
        `
        id,
        master_authority_id,
        sequence_no,
        stage,
        description,
        submitted_by,
        blocking_sequence_no,
        validity_days,
        default_fee,
        active,
        created_at,
        updated_at,
        reviewing_authorities (
          id,
          name
        ),
        requirements:noc_matrix_requirements (
          id,
          matrix_item_id,
          title,
          mandatory,
          sort_order
        )
      `,
      )
      .eq('master_authority_id', masterAuthorityId)
      .eq('active', true)
      .order('sequence_no', { ascending: true });

    if (error) {
      return {
        ok: false,
        data: [],
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        ok: true,
        data: [],
      };
    }

    const items: NocMatrixItem[] = data.map((item) => {
      const reviewingAuthorityData = item.reviewing_authorities as {
        id: number;
        name: string;
      } | null;
      const reviewingAuthorityId = reviewingAuthorityData?.id ?? 0;
      const reviewingAuthority =
        (reviewingAuthorityData?.name as ReviewingAuthority) || 'Authority';
      const rawReqs =
        (item.requirements as {
          id: string;
          matrix_item_id: string;
          title: string;
          mandatory: boolean;
          sort_order: number;
        }[]) || [];

      return {
        id: item.id,
        masterAuthorityId: item.master_authority_id,
        sequenceNo: item.sequence_no,
        stage: fromDbStage(item.stage),
        reviewingAuthorityId,
        reviewingAuthority,
        description: item.description,
        submittedBy: fromDbSubmitter(item.submitted_by),
        blockingSequenceNo: item.blocking_sequence_no,
        validityDays: item.validity_days,
        defaultFee: Number(item.default_fee),
        active: item.active,
        requirements: rawReqs
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((r) => ({
            id: r.id,
            matrixItemId: r.matrix_item_id,
            title: r.title,
            mandatory: r.mandatory,
            sortOrder: r.sort_order,
          })),
        createdAt: item.created_at,
        updatedAt: item.updated_at,
      };
    });

    return { ok: true, data: items };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch matrix templates';
    return {
      ok: false,
      data: [],
      error: message,
    };
  }
}

export async function getMatrixRevisions(
  masterAuthorityId: number,
): Promise<{ ok: boolean; data: NocMatrixRevision[]; error?: string }> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('noc_matrix_revisions')
      .select(
        `
        id,
        master_authority_id,
        matrix_item_id,
        action,
        changed_by,
        change_summary,
        previous_data,
        new_data,
        propagated_projects_count,
        propagated_nocs_count,
        created_at,
        profiles (
          full_name,
          role
        )
      `,
      )
      .eq('master_authority_id', masterAuthorityId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        ok: false,
        data: [],
        error: error.message,
      };
    }

    if (!data || data.length === 0) {
      return {
        ok: true,
        data: [],
      };
    }

    const revisions: NocMatrixRevision[] = data.map((rev) => {
      const profile = rev.profiles as {
        full_name: string;
        role: string;
      } | null;
      return {
        id: rev.id,
        masterAuthorityId: rev.master_authority_id,
        matrixItemId: rev.matrix_item_id,
        action: rev.action as NocMatrixRevision['action'],
        changedBy: rev.changed_by,
        changedByName: profile?.full_name || 'Authority Engineer',
        changedByRole: profile?.role || 'authority_engineer',
        changeSummary: rev.change_summary,
        previousData: rev.previous_data as Record<string, unknown> | null,
        newData: rev.new_data as Record<string, unknown> | null,
        propagatedProjectsCount: rev.propagated_projects_count ?? 0,
        propagatedNocsCount: rev.propagated_nocs_count ?? 0,
        createdAt: rev.created_at,
      };
    });

    return { ok: true, data: revisions };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch matrix revisions';
    return {
      ok: false,
      data: [],
      error: message,
    };
  }
}

export async function saveMatrixItem(input: unknown): Promise<{
  ok: boolean;
  data?: { projectsUpdated: number; nocsUpdated: number };
  error?: string;
}> {
  const user = await requireRole(MATRIX_EDIT_ROLES);

  const parsed = updateMatrixItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || 'Invalid matrix item input',
    };
  }

  const {
    matrixItemId,
    description,
    stage,
    reviewingAuthorityId: rawRevId,
    reviewingAuthority,
    submittedBy,
    blockingSequenceNo,
    defaultFee,
    validityDays,
    requirements,
    changeSummary,
  } = parsed.data;

  try {
    const supabase = await createClient();
    const reviewingAuthorityId = await resolveReviewingAuthorityId(
      supabase,
      reviewingAuthority || '',
      rawRevId,
    );

    if (!reviewingAuthorityId) {
      return {
        ok: false,
        error: 'Reviewing authority is invalid or could not be resolved.',
      };
    }

    const dbStage = toDbStage(stage);
    const dbSubmitter = toDbSubmitter(submittedBy);

    // Invoke atomic save RPC procedure.
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'save_matrix_item_atomic',
      {
        p_matrix_item_id: matrixItemId,
        p_caller_id: user.id,
        p_change_summary: changeSummary,
        p_description: description.trim(),
        p_stage: dbStage,
        p_reviewing_authority_id: reviewingAuthorityId,
        p_submitted_by: dbSubmitter,
        p_blocking_seq: blockingSequenceNo ?? null,
        p_default_fee: defaultFee,
        p_validity_days: validityDays,
        p_requirements: requirements.map((r, idx) => ({
          title: r.title.trim(),
          mandatory: r.mandatory ?? true,
          sort_order: r.sortOrder ?? idx + 1,
        })),
      },
    );

    if (rpcError) {
      return { ok: false, error: rpcError.message };
    }

    let projectsUpdated = 0;
    let nocsUpdated = 0;
    if (rpcResult && typeof rpcResult === 'object') {
      const res = rpcResult as {
        projects_updated?: number;
        nocs_updated?: number;
      };
      projectsUpdated = res.projects_updated ?? 0;
      nocsUpdated = res.nocs_updated ?? 0;
    }

    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');
    revalidatePath('/');

    return {
      ok: true,
      data: { projectsUpdated, nocsUpdated },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to save matrix item';
    return { ok: false, error: message };
  }
}

export async function createMatrixItem(
  input: unknown,
): Promise<{ ok: boolean; data?: NocMatrixItem; error?: string }> {
  const user = await requireRole(MATRIX_EDIT_ROLES);

  const parsed = createMatrixItemSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message || 'Invalid create matrix item input',
    };
  }

  const {
    masterAuthorityId,
    description,
    stage,
    reviewingAuthorityId: rawRevId,
    reviewingAuthority,
    submittedBy,
    blockingSequenceNo,
    defaultFee,
    validityDays,
    requirements,
    changeSummary,
  } = parsed.data;

  try {
    const supabase = await createClient();
    const reviewingAuthorityId = await resolveReviewingAuthorityId(
      supabase,
      reviewingAuthority || '',
      rawRevId,
    );

    if (!reviewingAuthorityId) {
      return {
        ok: false,
        error: 'Reviewing authority is invalid or could not be resolved.',
      };
    }

    const dbStage = toDbStage(stage);
    const dbSubmitter = toDbSubmitter(submittedBy);

    // Invoke atomic create RPC procedure.
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'create_matrix_item_atomic',
      {
        p_master_authority_id: masterAuthorityId,
        p_caller_id: user.id,
        p_change_summary: changeSummary,
        p_description: description.trim(),
        p_stage: dbStage,
        p_reviewing_authority_id: reviewingAuthorityId,
        p_submitted_by: dbSubmitter,
        p_blocking_seq: blockingSequenceNo ?? null,
        p_default_fee: defaultFee,
        p_validity_days: validityDays,
        p_requirements: requirements.map((r, idx) => ({
          title: r.title.trim(),
          mandatory: r.mandatory ?? true,
          sort_order: r.sortOrder ?? idx + 1,
        })),
      },
    );

    if (rpcError || !rpcResult) {
      return {
        ok: false,
        error: rpcError?.message || 'Failed to create matrix blueprint row.',
      };
    }

    const res = rpcResult as {
      id?: string;
      sequence_no?: number;
    };

    if (!res.id) {
      return {
        ok: false,
        error: 'Database procedure did not return created blueprint ID.',
      };
    }

    // Fetch newly created blueprint item with reviewing authority relation.
    const { data: insertedItem, error: fetchError } = await supabase
      .from('noc_matrix_items')
      .select(
        `
        id,
        master_authority_id,
        sequence_no,
        stage,
        description,
        submitted_by,
        blocking_sequence_no,
        validity_days,
        default_fee,
        active,
        created_at,
        updated_at,
        reviewing_authorities (
          id,
          name
        ),
        requirements:noc_matrix_requirements (
          id,
          matrix_item_id,
          title,
          mandatory,
          sort_order
        )
      `,
      )
      .eq('id', res.id)
      .single();

    if (fetchError || !insertedItem) {
      return {
        ok: false,
        error:
          fetchError?.message ||
          'Matrix blueprint created but failed to load record.',
      };
    }

    const revAuthorityData = insertedItem.reviewing_authorities as {
      id: number;
      name: string;
    } | null;
    const revAuthorityName =
      revAuthorityData?.name || reviewingAuthority || 'Authority';
    const rawReqs =
      (insertedItem.requirements as Array<{
        id: string;
        matrix_item_id: string;
        title: string;
        mandatory: boolean;
        sort_order: number;
      }>) || [];

    const resultData: NocMatrixItem = {
      id: insertedItem.id,
      masterAuthorityId: insertedItem.master_authority_id,
      sequenceNo: insertedItem.sequence_no,
      stage: fromDbStage(insertedItem.stage),
      reviewingAuthorityId: revAuthorityData?.id ?? reviewingAuthorityId,
      reviewingAuthority: revAuthorityName as ReviewingAuthority,
      description: insertedItem.description,
      submittedBy: fromDbSubmitter(insertedItem.submitted_by),
      blockingSequenceNo: insertedItem.blocking_sequence_no,
      validityDays: insertedItem.validity_days,
      defaultFee: Number(insertedItem.default_fee),
      active: insertedItem.active,
      requirements: rawReqs
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((r) => ({
          id: r.id,
          matrixItemId: r.matrix_item_id,
          title: r.title,
          mandatory: r.mandatory,
          sortOrder: r.sort_order,
        })),
      createdAt: insertedItem.created_at,
      updatedAt: insertedItem.updated_at,
    };

    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');
    revalidatePath('/');

    return { ok: true, data: resultData };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to create matrix item';
    return { ok: false, error: message };
  }
}

export async function deleteMatrixItem(
  matrixItemId: string,
  changeSummary: string,
): Promise<{ ok: boolean; error?: string }> {
  await requireRole(MATRIX_EDIT_ROLES);

  const parsed = deleteMatrixItemSchema.safeParse({
    matrixItemId,
    changeSummary,
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message || 'Invalid delete request',
    };
  }

  try {
    const supabase = await createClient();

    const { data: existing, error: findError } = await supabase
      .from('noc_matrix_items')
      .select('*')
      .eq('id', matrixItemId)
      .maybeSingle();

    if (findError || !existing) {
      return {
        ok: false,
        error: findError?.message || 'Matrix blueprint item not found.',
      };
    }

    // Soft delete template item.
    const { error: updError } = await supabase
      .from('noc_matrix_items')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', matrixItemId);

    if (updError) {
      return { ok: false, error: updError.message };
    }

    // Remove unobtained and not started project NOCs while preserving approved records.
    const { data: cleanedRows } = await supabase
      .from('project_nocs')
      .delete()
      .eq('matrix_item_id', matrixItemId)
      .eq('status_code', 'not_started')
      .select('id, project_id');

    const affectedProjectCount = cleanedRows
      ? new Set(cleanedRows.map((r) => r.project_id)).size
      : 0;
    const affectedNocCount = cleanedRows?.length ?? 0;

    // Log deletion revision.
    const user = await requireUser();
    await supabase.from('noc_matrix_revisions').insert({
      master_authority_id: existing.master_authority_id,
      matrix_item_id: existing.id,
      action: 'DELETE',
      changed_by: user.id,
      change_summary: changeSummary,
      previous_data: existing as unknown as Json,
      new_data: { active: false },
      propagated_projects_count: affectedProjectCount,
      propagated_nocs_count: affectedNocCount,
    });

    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');
    revalidatePath('/');

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to delete matrix item';
    return { ok: false, error: message };
  }
}

export async function reorderMatrixSequences(
  masterAuthorityId: number,
  orderedIds: string[],
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireRole(MATRIX_EDIT_ROLES);

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: 'Ordered item IDs are required' };
  }

  try {
    const supabase = await createClient();

    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const { error } = await supabase
        .from('noc_matrix_items')
        .update({ sequence_no: i + 1, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) {
        return {
          ok: false,
          error: `Failed to update sequence for item ${id}: ${error.message}`,
        };
      }
    }

    await supabase.from('noc_matrix_revisions').insert({
      master_authority_id: masterAuthorityId,
      matrix_item_id: null,
      action: 'REORDER',
      changed_by: user.id,
      change_summary: `Reordered ${orderedIds.length} matrix item sequences.`,
      new_data: { orderedIds },
      propagated_projects_count: 0,
      propagated_nocs_count: 0,
    });

    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');
    revalidatePath('/');

    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to reorder matrix sequences';
    return { ok: false, error: message };
  }
}

export async function getMasterAuthorities(): Promise<{
  ok: boolean;
  data: MasterAuthorityRecord[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('master_authorities')
      .select('id, name, jurisdiction')
      .order('id', { ascending: true });

    if (error) {
      return { ok: false, data: [], error: error.message };
    }

    return { ok: true, data: data || [] };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch master authorities';
    return { ok: false, data: [], error: message };
  }
}

export async function getReviewingAuthorities(): Promise<{
  ok: boolean;
  data: ReviewingAuthorityRecord[];
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('reviewing_authorities')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      return { ok: false, data: [], error: error.message };
    }

    return { ok: true, data: data || [] };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to fetch reviewing authorities';
    return { ok: false, data: [], error: message };
  }
}

const createMasterAuthoritySchema = z.object({
  name: z.string().trim().min(2, 'Master Authority name is required'),
  jurisdiction: z.string().trim().optional(),
});

export type CreateMasterAuthorityInput = z.infer<
  typeof createMasterAuthoritySchema
>;

export async function createMasterAuthority(
  input: CreateMasterAuthorityInput,
): Promise<{ ok: boolean; data?: MasterAuthorityRecord; error?: string }> {
  try {
    const caller = await requireUser();
    if (caller.role !== 'admin') {
      return {
        ok: false,
        error:
          'Unauthorized: strictly Admin role can register Master Authorities.',
      };
    }

    const parsed = createMasterAuthoritySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || 'Invalid input',
      };
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('master_authorities')
      .insert({
        name: parsed.data.name,
        jurisdiction: parsed.data.jurisdiction || null,
      })
      .select('id, name, jurisdiction')
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || 'Failed to create Master Authority',
      };
    }

    revalidatePath('/noc-matrix');
    revalidatePath('/projects/new');
    return { ok: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return { ok: false, error: message };
  }
}

const createReviewingAuthoritySchema = z.object({
  name: z.string().trim().min(2, 'Reviewing Authority name is required'),
});

export type CreateReviewingAuthorityInput = z.infer<
  typeof createReviewingAuthoritySchema
>;

export async function createReviewingAuthority(
  input: CreateReviewingAuthorityInput,
): Promise<{ ok: boolean; data?: ReviewingAuthorityRecord; error?: string }> {
  try {
    await requireRole(MATRIX_EDIT_ROLES);

    const parsed = createReviewingAuthoritySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message || 'Invalid input',
      };
    }

    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('reviewing_authorities')
      .select('id, name')
      .ilike('name', parsed.data.name)
      .maybeSingle();

    if (existing) {
      return { ok: true, data: existing };
    }

    const { data, error } = await supabase
      .from('reviewing_authorities')
      .insert({ name: parsed.data.name })
      .select('id, name')
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || 'Failed to create Reviewing Authority',
      };
    }

    revalidatePath('/noc-matrix');
    return { ok: true, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Server error';
    return { ok: false, error: message };
  }
}
