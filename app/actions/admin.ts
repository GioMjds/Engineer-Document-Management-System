'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { ROLES, type AppRole } from '@/lib/permissions';

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
  email: z.string().email(),
  full_name: z.string().min(2, 'Full name must be at least 2 characters.'),
  role: roleSchema,
});

const updateRoleSchema = z.object({
  user_id: z.string().uuid(),
  role: roleSchema,
});

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name is required.'),
  code: z.string().min(2, 'Project code is required.'),
  description: z.string().default(''),
  stage: z.enum(['planning', 'design', 'construction', 'handover', 'completed']).default('planning'),
  client_name: z.string().min(2, 'Client name is required.'),
  contractor_name: z.string().min(2, 'Contractor name is required.'),
  client_emails: z.array(z.string().email()).default([]),
  contractor_emails: z.array(z.string().email()).default([]),
  client_contractor_amount: z.number().nonnegative().default(0),
  client_consultant_amount: z.number().nonnegative().default(0),
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
  await requireCan('users.manage');

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid input.' };
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
    .select('role')
    .eq('id', user_id)
    .single();

  if (targetProfile?.role === 'admin' && role !== 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true);

    if ((count ?? 0) <= 1) {
      return { ok: false, error: 'Cannot demote the last remaining active Admin.' };
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', user_id);

  if (error) {
    return { ok: false, error: error.message };
  }

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
    .select('role')
    .eq('id', userId)
    .single();

  if (targetProfile?.role === 'admin') {
    const { count } = await supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true);

    if ((count ?? 0) <= 1) {
      return { ok: false, error: 'Cannot deactivate the last remaining active Admin.' };
    }
  }

  const { error } = await supabase
    .from('profiles')
    .update({ active: false })
    .eq('id', userId);

  if (error) {
    return { ok: false, error: error.message };
  }

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
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid project data.' };
  }

  const supabase = await createClient();

  // Insert project
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .insert({
      description: parsed.data.name,
      code: parsed.data.code,
      stage: parsed.data.stage,
      client_name: parsed.data.client_name,
      contractor_name: parsed.data.contractor_name,
      client_emails: parsed.data.client_emails,
      contractor_emails: parsed.data.contractor_emails,
      client_contractor_amount: parsed.data.client_contractor_amount,
      created_by: caller.id,
      master_authority_id: 1, // Default authority container
    })
    .select('id')
    .single();

  if (projectError || !project) {
    return { ok: false, error: projectError?.message ?? 'Failed to register project.' };
  }

  // Insert confidential consultant amount
  const { error: confError } = await supabase
    .from('project_confidential')
    .insert({
      project_id: project.id,
      client_consultant_amount: parsed.data.client_consultant_amount,
    });

  if (confError) {
    return { ok: false, error: confError.message };
  }

  // Log action
  await supabase.from('audit_log').insert({
    actor_id: caller.id,
    action: 'PROJECT_CREATE',
    entity: 'projects',
    entity_id: project.id,
    metadata: {
      code: parsed.data.code,
      name: parsed.data.name,
      contractor_amount: parsed.data.client_contractor_amount,
      consultant_amount: parsed.data.client_consultant_amount,
    },
  });

  revalidatePath('/projects');
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
  await requireCan('users.manage');

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
    return { ok: false, error: 'A detailed justification reason (min 5 characters) is mandatory.' };
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
