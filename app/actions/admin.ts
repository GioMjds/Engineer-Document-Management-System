'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { type AppRole } from '@/lib/permissions';
import { SEED_MATRIX_TEMPLATES } from '@/lib/noc-matrix';
import type { Database } from '@/types/database';

// Hardcoded reviewing authority name to ID mapping for NOC matrix items
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

function toDbSubmitter(
  submitter: string,
): Database['public']['Enums']['noc_submitter'] {
  const lower = submitter.toLowerCase();
  if (lower.includes('client')) return 'client';
  if (lower.includes('contractor')) return 'contractor';
  if (lower.includes('specialist')) return 'specialist';
  return 'consultant';
}

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const roleSchema = z.enum([
  'admin',
  'ceo',
  'area_manager',
  'resident_engineer',
  'authority_engineer',
  'engineer',
  'dc',
]);

const inviteUserSchema = z.object({
  email: z.email(),
  full_name: z.string().min(2, 'Full name must be at least 2 characters.'),
  role: roleSchema,
});

const updateRoleSchema = z.object({
  user_id: z.uuid(),
  role: roleSchema,
});

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required.'),
  code: z.string().min(2, 'Project code is required.'),
  description: z.string().default(''),
  stage: z
    .enum(['planning', 'design', 'construction', 'handover', 'completed'])
    .default('planning'),
  client_name: z.string().min(2, 'Client name is required.'),
  contractor_name: z.string().min(2, 'Contractor name is required.'),
  client_emails: z.array(z.email()).default([]),
  contractor_emails: z.array(z.email()).default([]),
  client_contractor_amount: z.number().nonnegative().default(0),
  client_consultant_amount: z.number().nonnegative().default(0),
  master_authority_id: z.number().int().default(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// ---------------------------------------------------------------------------
// User Management Actions
// ---------------------------------------------------------------------------

export async function inviteUser(input: {
  email: string;
  full_name: string;
  role: AppRole;
}): Promise<{ ok: boolean; error?: string }> {
  const caller = await requireCan('users.manage');

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }

  const adminClient = createAdminClient();

  const { data, error } = await adminClient.auth.admin.inviteUserByEmail(
    parsed.data.email,
    {
      data: {
        full_name: parsed.data.full_name,
        role: parsed.data.role,
      },
    },
  );

  if (error || !data.user) {
    return { ok: false, error: error?.message ?? 'Failed to invite user.' };
  }

  // Ensure role is explicitly set on profile
  await adminClient
    .from('profiles')
    .update({
      role: parsed.data.role,
      full_name: parsed.data.full_name,
      active: true,
    })
    .eq('id', data.user.id);

  await adminClient.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_INVITE',
    entity: 'profiles',
    entity_id: data.user.id,
    metadata: {
      email: parsed.data.email,
      role: parsed.data.role,
      full_name: parsed.data.full_name,
    },
  });

  revalidatePath('/users');
  return { ok: true };
}

export async function updateUserRole(input: {
  user_id: string;
  role: AppRole;
}): Promise<{ ok: boolean; error?: string }> {
  const caller = await requireCan('users.manage');

  const parsed = updateRoleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: 'Invalid input.' };
  }

  const { user_id, role } = parsed.data;

  // Guard 1: Prevent self-demotion
  if (user_id === caller.id && role !== 'admin') {
    return { ok: false, error: 'You cannot remove your own Admin role.' };
  }

  const supabase = await createClient();

  // Guard 2: Prevent demoting the last active Admin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', user_id)
    .single();

  if (targetProfile?.role === 'admin' && role !== 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true);

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error: 'Cannot demote the last remaining active Admin.',
      };
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user_id);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_ROLE_UPDATE',
    entity: 'profiles',
    entity_id: user_id,
    metadata: {
      target_email: targetProfile?.email,
      target_name: targetProfile?.full_name,
      previous_role: targetProfile?.role,
      new_role: role,
    },
  });

  revalidatePath('/users');
  return { ok: true };
}

export async function deactivateUser(
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const caller = await requireCan('users.manage');

  if (userId === caller.id) {
    return { ok: false, error: 'You cannot deactivate your own account.' };
  }

  const supabase = await createClient();

  // Guard: Cannot deactivate the last admin
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('role, email, full_name')
    .eq('id', userId)
    .single();

  if (targetProfile?.role === 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true);

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error: 'Cannot deactivate the last remaining active Admin.',
      };
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ active: false })
    .eq('id', userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_DEACTIVATE',
    entity: 'profiles',
    entity_id: userId,
    metadata: {
      target_email: targetProfile?.email,
      target_name: targetProfile?.full_name,
      role: targetProfile?.role,
    },
  });

  revalidatePath('/users');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Project Administration Actions
// ---------------------------------------------------------------------------

export async function createProject(
  input: CreateProjectInput,
): Promise<{ ok: boolean; projectId?: string; error?: string }> {
  const caller = await requireCan('project.create');

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid project data.',
    };
  }

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Insert project
  let project: { id: string } | null = null;
  const fullPayload = {
    description: parsed.data.name,
    code: parsed.data.code,
    stage: parsed.data.stage,
    client_name: parsed.data.client_name,
    contractor_name: parsed.data.contractor_name,
    client_emails: parsed.data.client_emails,
    contractor_emails: parsed.data.contractor_emails,
    client_contractor_amount: parsed.data.client_contractor_amount,
    created_by: caller.id,
    master_authority_id: parsed.data.master_authority_id,
  };

  const { data: fullProj, error: fullProjError } = await supabase
    .from('projects')
    .insert(fullPayload)
    .select('id')
    .single();

  if (fullProj) {
    project = fullProj;
  } else if (
    fullProjError &&
    (fullProjError.message.includes('schema cache') ||
      fullProjError.message.includes('column'))
  ) {
    // Retry with core columns if augmented columns are not migrated yet
    const { data: coreProj, error: coreProjError } = await supabase
      .from('projects')
      .insert({
        description: parsed.data.name,
        code: parsed.data.code,
        stage: parsed.data.stage,
        client_name: parsed.data.client_name,
        created_by: caller.id,
        master_authority_id: parsed.data.master_authority_id,
      })
      .select('id')
      .single();

    if (coreProjError || !coreProj) {
      return {
        ok: false,
        error: coreProjError?.message ?? 'Failed to register project.',
      };
    }
    project = coreProj;
  } else {
    return {
      ok: false,
      error: fullProjError?.message ?? 'Failed to register project.',
    };
  }

  // Insert confidential consultant amount
  const { error: confError } = await supabase
    .from('project_confidential')
    .insert({
      project_id: project.id,
      client_consultant_amount: parsed.data.client_consultant_amount,
    });

  if (confError && !confError.message.includes('schema cache')) {
    // Rollback project insertion
    await adminClient.from('projects').delete().eq('id', project.id);
    return { ok: false, error: confError.message };
  }

  let instantiatedNocsCount = 0;

  // Instantiate statutory project NOCs from template matrix items for this authority
  const { data: matrixItems } = await adminClient
    .from('noc_matrix_items')
    .select(
      `
      id,
      sequence_no,
      stage,
      reviewing_authority_id,
      description,
      submitted_by,
      default_fee,
      blocking_sequence_no,
      noc_matrix_requirements (
        title
      )
    `,
    )
    .eq('master_authority_id', parsed.data.master_authority_id)
    .eq('active', true)
    .order('sequence_no', { ascending: true });

  if (matrixItems && matrixItems.length > 0) {
    for (const item of matrixItems) {
      const { data: insertedNoc } = await adminClient
        .from('project_nocs')
        .insert({
          project_id: project.id,
          matrix_item_id: item.id,
          sequence_no: item.sequence_no,
          stage: item.stage,
          reviewing_authority_id: item.reviewing_authority_id,
          description: item.description,
          submitted_by: item.submitted_by || 'consultant',
          status_code: 'not_started',
          payment_fee: item.default_fee || 0,
          is_paid: false,
          blocking_sequence_no: item.blocking_sequence_no,
          current_revision: 'R00',
        })
        .select('id')
        .single();

      if (insertedNoc) {
        instantiatedNocsCount++;

        // Clone checklist requirements (DB requirements or seed fallback)
        let reqTitles: string[] = (item.noc_matrix_requirements || []).map(
          (r: { title: string }) => r.title,
        );

        if (reqTitles.length === 0) {
          const seedItems =
            SEED_MATRIX_TEMPLATES[parsed.data.master_authority_id] || [];
          const matchingSeed = seedItems.find(
            (s) =>
              s.sequenceNo === item.sequence_no ||
              s.description === item.description,
          );
          if (matchingSeed?.requirements) {
            reqTitles = matchingSeed.requirements.map((r) => r.title);
          }
        }

        if (reqTitles.length > 0) {
          const reqInserts = reqTitles.map((title) => ({
            project_noc_id: insertedNoc.id,
            title,
            is_satisfied: false,
          }));
          await adminClient.from('project_noc_requirements').insert(reqInserts);
        }
      }
    }
  } else {
    // Fallback: DB unseeded for authority, clone from SEED_MATRIX_TEMPLATES
    const seedTemplates =
      SEED_MATRIX_TEMPLATES[parsed.data.master_authority_id] || [];
    for (const item of seedTemplates) {
      const reviewingAuthorityId =
        REVIEWING_AUTHORITY_NAME_TO_ID[item.reviewingAuthority] || 1;

      const { data: insertedNoc } = await adminClient
        .from('project_nocs')
        .insert({
          project_id: project.id,
          matrix_item_id: null,
          sequence_no: item.sequenceNo,
          stage: toDbStage(item.stage),
          reviewing_authority_id: reviewingAuthorityId,
          description: item.description,
          submitted_by: toDbSubmitter(item.submittedBy),
          status_code: 'not_started',
          payment_fee: item.defaultFee || 0,
          is_paid: false,
          blocking_sequence_no: item.blockingSequenceNo,
          current_revision: 'R00',
        })
        .select('id')
        .single();

      if (insertedNoc) {
        instantiatedNocsCount++;
        if (item.requirements && item.requirements.length > 0) {
          const reqInserts = item.requirements.map((r) => ({
            project_noc_id: insertedNoc.id,
            title: r.title,
            is_satisfied: false,
          }));
          await adminClient.from('project_noc_requirements').insert(reqInserts);
        }
      }
    }
  }

  // Audit log with instantiated count
  try {
    await adminClient.from('audit_log').insert({
      actor_id: caller.id,
      action: 'PROJECT_CREATE',
      entity: 'projects',
      entity_id: project.id,
      metadata: {
        code: parsed.data.code,
        name: parsed.data.name,
        master_authority_id: parsed.data.master_authority_id,
        contractor_amount: parsed.data.client_contractor_amount,
        consultant_amount: parsed.data.client_consultant_amount,
        instantiated_nocs_count: instantiatedNocsCount,
      },
    });
  } catch {
    // Ignore audit log error if table not configured
  }

  revalidatePath('/projects');
  revalidatePath('/noc-tracker');
  revalidatePath('/noc');
  revalidatePath('/dashboard');
  revalidatePath('/');
  return { ok: true, projectId: project.id };
}

export async function updateProjectMembers(
  projectId: string,
  members: Array<{
    userId: string;
    discipline?: 'mep' | 'architect' | 'structure' | 'civil';
  }>,
): Promise<{ ok: boolean; error?: string }> {
  const caller = await requireCan('users.manage');

  const supabase = await createClient();

  // Delete existing members and replace
  await supabase.from('project_members').delete().eq('project_id', projectId);

  if (members.length > 0) {
    const rows = members.map((m) => ({
      project_id: projectId,
      user_id: m.userId,
      discipline: m.discipline ?? null,
    }));

    const { error } = await supabase.from('project_members').insert(rows);
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  await supabase.from('audit_log').insert({
    actor_id: caller.id,
    action: 'PROJECT_MEMBERS_UPDATE',
    entity: 'projects',
    entity_id: projectId,
    metadata: {
      members_count: members.length,
      members,
    },
  });

  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// ---------------------------------------------------------------------------
// NOC Sequence Override
// ---------------------------------------------------------------------------

export async function overrideNocSequence(
  nocId: string,
  reason: string,
): Promise<{ ok: boolean; error?: string }> {
  const caller = await requireCan('noc.sequence.override');

  const trimmedReason = reason.trim();
  if (trimmedReason.length < 5) {
    return {
      ok: false,
      error: 'A detailed justification reason (min 5 characters) is mandatory.',
    };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('project_nocs')
    .update({
      override_reason: trimmedReason,
      overridden_by: caller.id,
      overridden_at: new Date().toISOString(),
    })
    .eq('id', nocId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: caller.id,
    action: 'NOC_SEQUENCE_OVERRIDE',
    entity: 'project_nocs',
    entity_id: nocId,
    metadata: { reason: trimmedReason },
  });

  revalidatePath('/noc-tracker');
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Permanent Purge
// ---------------------------------------------------------------------------

export async function purgeDocument(
  docId: string,
): Promise<{ ok: boolean; error?: string }> {
  const caller = await requireCan('archive.purge');

  const supabase = await createClient();

  const { data: doc, error: fetchError } = await supabase
    .from('documents')
    .select('id, file_path, title')
    .eq('id', docId)
    .single();

  if (fetchError || !doc) {
    return { ok: false, error: 'Document not found.' };
  }

  // Remove storage blob
  if (doc.file_path) {
    await supabase.storage.from('documents').remove([doc.file_path]);
  }

  // Hard delete document record
  const { error: deleteError } = await supabase
    .from('documents')
    .delete()
    .eq('id', docId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  await supabase.from('audit_log').insert({
    actor_id: caller.id,
    action: 'DOCUMENT_PERMANENT_PURGE',
    entity: 'documents',
    entity_id: docId,
    metadata: { title: doc.title, file_path: doc.file_path },
  });

  revalidatePath('/archive');
  return { ok: true };
}
