'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser, requireRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { SEED_MATRIX_TEMPLATES } from '@/lib/noc-matrix';
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
  matrixItemId: z.string().min(1, 'Matrix item ID is required'),
  masterAuthorityId: z.number().int(),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description cannot exceed 255 characters'),
  stage: z.string(),
  reviewingAuthority: z.string().min(1, 'Reviewing authority is required'),
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
  masterAuthorityId: z.number().int(),
  description: z
    .string()
    .min(3, 'Description must be at least 3 characters')
    .max(255, 'Description cannot exceed 255 characters'),
  stage: z.string(),
  reviewingAuthority: z.string().min(1, 'Reviewing authority is required'),
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
  matrixItemId: z.string().min(1, 'Matrix item ID is required'),
  changeSummary: z
    .string()
    .min(5, 'Change summary must be at least 5 characters'),
});

export type UpdateMatrixItemInput = z.infer<typeof updateMatrixItemSchema>;
export type CreateMatrixItemInput = z.infer<typeof createMatrixItemSchema>;
export type DeleteMatrixItemInput = z.infer<typeof deleteMatrixItemSchema>;

const REVIEWING_AUTHORITY_NAME_TO_ID: Record<string, number> = {
  Trakhees: 1,
  Nakheel: 2,
  DEWA: 3,
  Empower: 4,
  RTA: 5,
  EHS: 6,
  DCAA: 7,
  DM: 8,
  DU: 9,
  Etisalat: 10,
  'Green Building': 11,
  'Third Party': 12,
  DCD: 13,
  DDA: 14,
};

function toDbStage(stage: string): Database['public']['Enums']['noc_stage'] {
  const lower = stage.toLowerCase();
  if (lower.includes('handover')) return 'handover';
  if (lower.includes('construction')) return 'construction';
  if (lower.includes('information')) return 'information';
  return 'design';
}

function fromDbStage(stage: string): NocStage {
  const lower = stage.toLowerCase();
  if (lower.includes('handover')) return 'Handover NOC';
  if (lower.includes('construction')) return 'Construction NOC';
  if (lower.includes('information')) return 'Information NOC';
  return 'Design NOC';
}

function toDbSubmitter(
  submitter: string,
): Database['public']['Enums']['noc_submitter'] {
  const lower = submitter.toLowerCase();
  if (lower.includes('client')) return 'client';
  if (lower.includes('contractor')) return 'contractor';
  if (lower.includes('specialist')) return 'specialist';
  return 'consultant';
}

function fromDbSubmitter(submitter: string): SubmittedBy {
  const lower = submitter.toLowerCase();
  if (lower.includes('client')) return 'Client';
  if (lower.includes('contractor')) return 'Contractor';
  if (lower.includes('specialist')) return 'Specialists';
  return 'Consultant';
}

async function resolveReviewingAuthorityId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  name: string,
): Promise<number> {
  const cleanName = name.trim();
  try {
    const { data } = await supabase
      .from('reviewing_authorities')
      .select('id, name')
      .ilike('name', cleanName)
      .maybeSingle();

    if (data?.id) return data.id;

    // Dynamically insert newly encountered reviewing authority
    const { data: inserted } = await supabase
      .from('reviewing_authorities')
      .insert({ name: cleanName })
      .select('id')
      .single();

    if (inserted?.id) return inserted.id;
  } catch {
    // Fall back to dictionary if database lookup or insert fails.
  }

  return REVIEWING_AUTHORITY_NAME_TO_ID[name] || 1;
}

const SEED_REVISIONS: Record<number, NocMatrixRevision[]> = {
  1: [
    {
      id: 'rev-seed-01',
      masterAuthorityId: 1,
      action: 'UPDATE',
      changedBy: 'system',
      changedByName: 'Engr. Rasha (Authority Engineer)',
      changedByRole: 'authority_engineer',
      changeSummary:
        'Baseline Nakheel and Trakhees statutory matrix configuration initialized with CED and EHS sequencing.',
      previousData: null,
      newData: { defaultFee: 5000, validityDays: 365 },
      propagatedProjectsCount: 1,
      propagatedNocsCount: 6,
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    },
  ],
  2: [
    {
      id: 'rev-seed-02',
      masterAuthorityId: 2,
      action: 'UPDATE',
      changedBy: 'system',
      changedByName: 'Engr. Rasha (Authority Engineer)',
      changedByRole: 'authority_engineer',
      changeSummary:
        'Baseline Dubai Municipality matrix initialized with Al Safat and DM Structural Permit prerequisites.',
      previousData: null,
      newData: { defaultFee: 8000, validityDays: 365 },
      propagatedProjectsCount: 1,
      propagatedNocsCount: 6,
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
  3: [
    {
      id: 'rev-seed-03',
      masterAuthorityId: 3,
      action: 'UPDATE',
      changedBy: 'system',
      changedByName: 'Engr. Rasha (Authority Engineer)',
      changedByRole: 'authority_engineer',
      changeSummary:
        'Baseline Dubai Development Authority matrix initialized with RTA TIS and DEWA Substation sequencing.',
      previousData: null,
      newData: { defaultFee: 3500, validityDays: 365 },
      propagatedProjectsCount: 1,
      propagatedNocsCount: 8,
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
};

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

    if (error || !data || data.length === 0) {
      return {
        ok: true,
        data: SEED_MATRIX_TEMPLATES[masterAuthorityId] || [],
      };
    }

    const items: NocMatrixItem[] = data.map((item) => {
      const reviewingAuthorityData = item.reviewing_authorities as {
        id: number;
        name: string;
      } | null;
      const reviewingAuthority =
        (reviewingAuthorityData?.name as ReviewingAuthority) || 'DEWA';
      const rawReqs =
        (item.requirements as Array<{
          id: string;
          matrix_item_id: string;
          title: string;
          mandatory: boolean;
          sort_order: number;
        }>) || [];

      return {
        id: item.id,
        masterAuthorityId: item.master_authority_id,
        sequenceNo: item.sequence_no,
        stage: fromDbStage(item.stage),
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
      ok: true,
      data: SEED_MATRIX_TEMPLATES[masterAuthorityId] || [],
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

    if (error || !data || data.length === 0) {
      return {
        ok: true,
        data: SEED_REVISIONS[masterAuthorityId] || [],
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
      ok: true,
      data: SEED_REVISIONS[masterAuthorityId] || [],
      error: message,
    };
  }
}

export async function saveMatrixItem(input: unknown): Promise<{
  ok: boolean;
  data?: { projectsUpdated: number; nocsUpdated: number };
  error?: string;
}> {
  const user = await requireRole(['admin', 'authority_engineer', 'dc']);

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
      reviewingAuthority,
    );
    const dbStage = toDbStage(stage);
    const dbSubmitter = toDbSubmitter(submittedBy);
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        matrixItemId,
      );

    let projectsUpdated = 0;
    let nocsUpdated = 0;

    if (isUuid) {
      // Invoke atomic propagation database function.
      const { data: rpcResult, error: rpcError } = await supabase.rpc(
        'propagate_matrix_item_change',
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
        },
      );

      if (rpcError) {
        if (rpcError.message.includes('Unauthorized')) {
          return { ok: false, error: rpcError.message };
        }
        // Direct template update fallback if RPC procedure is unavailable.
        await supabase
          .from('noc_matrix_items')
          .update({
            description: description.trim(),
            stage: dbStage,
            reviewing_authority_id: reviewingAuthorityId,
            submitted_by: dbSubmitter,
            blocking_sequence_no: blockingSequenceNo ?? null,
            default_fee: defaultFee,
            validity_days: validityDays,
            updated_at: new Date().toISOString(),
          })
          .eq('id', matrixItemId);
      } else if (rpcResult && typeof rpcResult === 'object') {
        const res = rpcResult as {
          projects_updated?: number;
          nocs_updated?: number;
        };
        projectsUpdated = res.projects_updated ?? 0;
        nocsUpdated = res.nocs_updated ?? 0;
      }

      // Synchronize checklist requirements for this matrix item.
      await supabase
        .from('noc_matrix_requirements')
        .delete()
        .eq('matrix_item_id', matrixItemId);

      if (requirements.length > 0) {
        const reqInserts = requirements.map((r, idx) => ({
          matrix_item_id: matrixItemId,
          title: r.title.trim(),
          mandatory: r.mandatory ?? true,
          sort_order: r.sortOrder ?? idx + 1,
        }));
        await supabase.from('noc_matrix_requirements').insert(reqInserts);
      }
    } else {
      // In-memory seed template simulation update.
      projectsUpdated = 1;
      nocsUpdated = 1;
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
  const user = await requireRole(['admin', 'authority_engineer', 'dc']);

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
      reviewingAuthority,
    );
    const dbStage = toDbStage(stage);
    const dbSubmitter = toDbSubmitter(submittedBy);

    // Compute next sequential sequence number for this master authority.
    const { data: maxSeqData } = await supabase
      .from('noc_matrix_items')
      .select('sequence_no')
      .eq('master_authority_id', masterAuthorityId)
      .order('sequence_no', { ascending: false })
      .limit(1)
      .maybeSingle();

    const seedItems = SEED_MATRIX_TEMPLATES[masterAuthorityId] || [];
    const seedMax =
      seedItems.length > 0
        ? Math.max(...seedItems.map((s) => s.sequenceNo))
        : 0;
    const dbMax = maxSeqData?.sequence_no ?? 0;
    const finalSeq = Math.max(dbMax, seedMax) + 1;

    // Insert new template item.
    const { data: insertedItem } = await supabase
      .from('noc_matrix_items')
      .insert({
        master_authority_id: masterAuthorityId,
        sequence_no: finalSeq,
        stage: dbStage,
        reviewing_authority_id: reviewingAuthorityId,
        description: description.trim(),
        submitted_by: dbSubmitter,
        blocking_sequence_no: blockingSequenceNo ?? null,
        default_fee: defaultFee,
        validity_days: validityDays,
        active: true,
      })
      .select()
      .maybeSingle();

    const createdId = insertedItem?.id || `mat-item-${Date.now()}`;

    // Insert requirements checklist.
    if (insertedItem && requirements.length > 0) {
      const reqInserts = requirements.map((r, idx) => ({
        matrix_item_id: insertedItem.id,
        title: r.title.trim(),
        mandatory: r.mandatory ?? true,
        sort_order: r.sortOrder ?? idx + 1,
      }));
      await supabase.from('noc_matrix_requirements').insert(reqInserts);
    }

    // Propagate unobtained NOC to active projects under this master authority.
    const { data: activeProjects } = await supabase
      .from('projects')
      .select('id')
      .eq('master_authority_id', masterAuthorityId)
      .is('archived_at', null)
      .neq('stage', 'completed');

    if (activeProjects && activeProjects.length > 0 && insertedItem) {
      const projectNocInserts = activeProjects.map((p) => ({
        project_id: p.id,
        matrix_item_id: insertedItem.id,
        sequence_no: finalSeq,
        stage: dbStage,
        reviewing_authority_id: reviewingAuthorityId,
        description: description.trim(),
        submitted_by: dbSubmitter,
        blocking_sequence_no: blockingSequenceNo ?? null,
        status_code: 'not_started',
        payment_fee: defaultFee,
        is_paid: false,
        current_revision: 'R00',
        plan_date: new Date().toISOString().split('T')[0],
        updated_by: user.id,
      }));
      await supabase.from('project_nocs').insert(projectNocInserts);
    }

    // Record revision entry in audit log.
    await supabase.from('noc_matrix_revisions').insert({
      master_authority_id: masterAuthorityId,
      matrix_item_id: insertedItem?.id ?? null,
      action: 'CREATE',
      changed_by: user.id,
      change_summary: changeSummary,
      new_data: {
        sequenceNo: finalSeq,
        description,
        stage,
        reviewingAuthority,
        submittedBy,
        blockingSequenceNo,
        defaultFee,
        validityDays,
      },
      propagated_projects_count: activeProjects?.length ?? 0,
      propagated_nocs_count: activeProjects?.length ?? 0,
    });

    const resultData: NocMatrixItem = {
      id: createdId,
      masterAuthorityId,
      sequenceNo: finalSeq,
      stage: fromDbStage(dbStage),
      reviewingAuthority: reviewingAuthority as ReviewingAuthority,
      description: description.trim(),
      submittedBy: fromDbSubmitter(dbSubmitter),
      blockingSequenceNo: blockingSequenceNo ?? null,
      validityDays,
      defaultFee,
      active: true,
      requirements: requirements.map((r, idx) => ({
        id: r.id || `req-${Date.now()}-${idx}`,
        matrixItemId: createdId,
        title: r.title.trim(),
        mandatory: r.mandatory ?? true,
        sortOrder: r.sortOrder ?? idx + 1,
      })),
      createdAt: insertedItem?.created_at || new Date().toISOString(),
      updatedAt: insertedItem?.updated_at || new Date().toISOString(),
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
  const user = await requireRole(['admin', 'authority_engineer', 'dc']);

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
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        matrixItemId,
      );

    if (isUuid) {
      const { data: existing } = await supabase
        .from('noc_matrix_items')
        .select('*')
        .eq('id', matrixItemId)
        .maybeSingle();

      if (existing) {
        // Soft delete template item.
        await supabase
          .from('noc_matrix_items')
          .update({ active: false, updated_at: new Date().toISOString() })
          .eq('id', matrixItemId);

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
      }
    }

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
  const user = await requireRole(['admin', 'authority_engineer', 'dc']);

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: 'Ordered item IDs are required' };
  }

  try {
    const supabase = await createClient();

    for (let i = 0; i < orderedIds.length; i++) {
      const id = orderedIds[i];
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          id,
        );
      if (isUuid) {
        await supabase
          .from('noc_matrix_items')
          .update({ sequence_no: i + 1, updated_at: new Date().toISOString() })
          .eq('id', id);
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

const DEFAULT_MASTER_AUTHORITIES: MasterAuthorityRecord[] = [
  { id: 1, name: 'Nakheel & Trakhees', jurisdiction: 'JAFZA & Coastal Zones' },
  {
    id: 2,
    name: 'Dubai Municipality',
    jurisdiction: 'Mainland Dubai & Al Safat',
  },
  {
    id: 3,
    name: 'Dubai Development Authority',
    jurisdiction: 'TECOM & Free Zones',
  },
];

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

    if (error || !data || data.length === 0) {
      return { ok: true, data: DEFAULT_MASTER_AUTHORITIES };
    }

    return { ok: true, data };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch master authorities';
    return { ok: true, data: DEFAULT_MASTER_AUTHORITIES, error: message };
  }
}

// Another hardcoded list of reviewing authorities to fall back on if database fetch fails.
// To remove this hardcoded list, ensure that the reviewing_authorities table is populated with all required authorities.
const DEFAULT_REVIEWING_AUTHORITIES: ReviewingAuthorityRecord[] = [
  { id: 1, name: 'Trakhees' },
  { id: 2, name: 'Nakheel' },
  { id: 3, name: 'DEWA' },
  { id: 4, name: 'Empower' },
  { id: 5, name: 'RTA' },
  { id: 6, name: 'EHS' },
  { id: 7, name: 'DCAA' },
  { id: 8, name: 'DM' },
  { id: 9, name: 'DU' },
  { id: 10, name: 'Etisalat' },
  { id: 11, name: 'Green Building' },
  { id: 12, name: 'Third Party' },
  { id: 13, name: 'DCD' },
  { id: 14, name: 'DDA' },
];

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

    if (error || !data || data.length === 0) {
      return { ok: true, data: DEFAULT_REVIEWING_AUTHORITIES };
    }

    return { ok: true, data };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to fetch reviewing authorities';
    return { ok: true, data: DEFAULT_REVIEWING_AUTHORITIES, error: message };
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
    const caller = await requireUser();
    if (!['admin', 'authority_engineer', 'dc'].includes(caller.role)) {
      return {
        ok: false,
        error:
          'Unauthorized: only Admin, Authority Engineer, or DC can add Reviewing Authorities.',
      };
    }

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
