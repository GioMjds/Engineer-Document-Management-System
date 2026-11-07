'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { type AppRole } from '@/lib/permissions';
import { sendUserInviteEmail } from '@/lib/email/notifications';
import type { Json } from '@/types/database';
import { updateProjectSchema, type ProjectEditInput } from '@/lib/project-edit';

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

const updateUserSchema = z.object({
  user_id: z.uuid(),
  full_name: z.string().min(2, 'Full name must be at least 2 characters.'),
  role: roleSchema,
  active: z.boolean(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

const updateRoleSchema = z.object({
  user_id: z.uuid(),
  role: roleSchema,
});

const createProjectSchema = z.object({
  name: z.string().trim().min(1, 'Project name is required.'),
  code: z.string().trim().min(1, 'Project code is required.'),
  summary: z
    .string()
    .trim()
    .max(500, 'Description must be 500 characters or fewer.')
    .default(''),
  stage: z
    .enum(['planning', 'design', 'construction', 'handover', 'completed'])
    .default('planning'),
  client_name: z.string().trim().min(1, 'Client name is required.'),
  contractor_name: z.string().trim().min(1, 'Contractor name is required.'),
  client_emails: z.array(z.email()).default([]),
  contractor_emails: z.array(z.email()).default([]),
  client_contractor_amount: z.number().nonnegative().default(0),
  client_consultant_amount: z.number().nonnegative().default(0),
  master_authority_id: z.number().int().default(1),
  design_commencement_date: z.string().optional(),
  design_completion_date: z.string().optional(),
  supervision_commencement_date: z.string().optional(),
  supervision_completion_date: z.string().optional(),
  members: z
    .array(
      z.object({
        userId: z.uuid(),
        discipline: z
          .enum(['mep', 'architect', 'structure', 'civil'])
          .optional(),
      }),
    )
    .optional()
    .default([]),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;

// User Management Actions

type ActionPromise = {
  ok: boolean;
  error?: string;
  warning?: string;
  projectId?: string;
};

export async function inviteUser(input: {
  email: string;
  full_name: string;
  role: AppRole;
}): Promise<ActionPromise> {
  const caller = await requireCan('users.manage');

  const parsed = inviteUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }

  const adminClient = createAdminClient();
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

  let userId: string | null = null;
  let actionLink: string | null = null;

  // Generate invite link to bypass Supabase default rate limit and send custom email
  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: parsed.data.email,
      options: {
        data: {
          full_name: parsed.data.full_name,
          role: parsed.data.role,
        },
        redirectTo: `${siteUrl}/set-password`,
      },
    });

  if (linkError || !linkData?.user) {
    // Fallback to inviteUserByEmail if generateLink fails
    const { data: inviteData, error: inviteError } =
      await adminClient.auth.admin.inviteUserByEmail(parsed.data.email, {
        data: {
          full_name: parsed.data.full_name,
          role: parsed.data.role,
        },
        redirectTo: `${siteUrl}/set-password`,
      });

    if (inviteError || !inviteData?.user) {
      return {
        ok: false,
        error:
          linkError?.message ??
          inviteError?.message ??
          'Failed to invite user.',
      };
    }
    userId = inviteData.user.id;
  } else {
    userId = linkData.user.id;
    actionLink = linkData.properties?.action_link ?? null;
  }

  // Ensure role and active status are explicitly set on profile
  await adminClient
    .from('profiles')
    .upsert({
      id: userId,
      email: parsed.data.email,
      full_name: parsed.data.full_name,
      role: parsed.data.role,
      active: true,
    })
    .eq('id', userId);

  // Construct direct app activation URL to avoid reliance on Supabase redirect allowlists
  const directActivationLink = linkData?.properties?.hashed_token
    ? `${siteUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=invite&next=/set-password`
    : (actionLink ?? `${siteUrl}/set-password`);

  // Send branded invitation email with password activation link via SMTP
  const emailResult = await sendUserInviteEmail({
    email: parsed.data.email,
    fullName: parsed.data.full_name,
    role: parsed.data.role,
    actionLink: directActivationLink,
  });

  if (!emailResult.ok) {
    console.warn('Invite email delivery error:', emailResult.error);
  }

  await adminClient.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_INVITE',
    entity: 'profiles',
    entity_id: userId,
    metadata: {
      email: parsed.data.email,
      role: parsed.data.role,
      full_name: parsed.data.full_name,
    },
  });

  revalidatePath('/users');
  return emailResult.ok
    ? { ok: true }
    : {
        ok: true,
        warning: 'User created but invite email failed. Use the Resend button.',
      };
}

export async function updateUserRole(input: {
  user_id: string;
  role: AppRole;
}): Promise<ActionPromise> {
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

export async function deactivateUser(userId: string): Promise<ActionPromise> {
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

// Soft delete/archive a user profile by deactivating their account.
export async function archiveUser(userId: string): Promise<ActionPromise> {
  return deactivateUser(userId);
}

// Reactivate an archived user profile.
export async function reactivateUser(userId: string): Promise<ActionPromise> {
  const caller = await requireCan('users.manage');

  const adminClient = createAdminClient();

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role, email, full_name, active')
    .eq('id', userId)
    .single();

  if (!targetProfile) {
    return { ok: false, error: 'User profile not found.' };
  }

  const { error } = await adminClient
    .from('profiles')
    .update({ active: true })
    .eq('id', userId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await adminClient.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_REACTIVATE',
    entity: 'profiles',
    entity_id: userId,
    metadata: {
      target_email: targetProfile.email,
      target_name: targetProfile.full_name,
      role: targetProfile.role,
    },
  });

  revalidatePath('/users');
  return { ok: true };
}

// Update profile details, system role, and active status.
export async function updateUser(
  input: UpdateUserInput,
): Promise<ActionPromise> {
  const caller = await requireCan('users.manage');

  const parsed = updateUserSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid input.',
    };
  }

  const { user_id, full_name, role, active } = parsed.data;

  // Prevent admin from removing their own admin role or deactivating themselves.
  if (user_id === caller.id) {
    if (role !== 'admin') {
      return { ok: false, error: 'You cannot remove your own Admin role.' };
    }
    if (active === false) {
      return { ok: false, error: 'You cannot deactivate your own account.' };
    }
  }

  const adminClient = createAdminClient();

  // Prevent demoting or deactivating the last active Admin.
  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('role, email, full_name, active')
    .eq('id', user_id)
    .single();

  if (targetProfile?.role === 'admin' && (role !== 'admin' || !active)) {
    const { count } = await adminClient
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'admin')
      .eq('active', true);

    if ((count ?? 0) <= 1) {
      return {
        ok: false,
        error: 'Cannot demote or deactivate the last remaining active Admin.',
      };
    }
  }

  const { error: profileError } = await adminClient
    .from('profiles')
    .update({
      full_name,
      role,
      active,
    })
    .eq('id', user_id);

  if (profileError) {
    return { ok: false, error: profileError.message };
  }

  // Synchronize role and name in auth metadata.
  await adminClient.auth.admin.updateUserById(user_id, {
    user_metadata: {
      full_name,
      role,
    },
  });

  await adminClient.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_UPDATE',
    entity: 'profiles',
    entity_id: user_id,
    metadata: {
      target_email: targetProfile?.email,
      previous_name: targetProfile?.full_name,
      new_name: full_name,
      previous_role: targetProfile?.role,
      new_role: role,
      previous_active: targetProfile?.active,
      new_active: active,
    },
  });

  revalidatePath('/users');
  return { ok: true };
}

// Resend invitation email with activation link to user.
export async function resendUserInvite(email: string): Promise<ActionPromise> {
  const caller = await requireCan('users.manage');

  const parsedEmail = z.email().safeParse(email);
  if (!parsedEmail.success) {
    return { ok: false, error: 'Invalid email address.' };
  }

  const adminClient = createAdminClient();
  const siteUrl = process.env.SITE_URL || 'http://localhost:3000';

  const { data: targetProfile } = await adminClient
    .from('profiles')
    .select('id, full_name, role, active')
    .eq('email', parsedEmail.data)
    .single();

  if (!targetProfile) {
    return { ok: false, error: 'User profile not found.' };
  }

  const { data: linkData, error: linkError } =
    await adminClient.auth.admin.generateLink({
      type: 'invite',
      email: parsedEmail.data,
      options: {
        data: {
          full_name: targetProfile.full_name,
          role: targetProfile.role,
        },
        redirectTo: `${siteUrl}/set-password`,
      },
    });

  if (linkError || !linkData?.user) {
    return {
      ok: false,
      error: linkError?.message ?? 'Failed to generate invitation link.',
    };
  }

  const directActivationLink = linkData.properties?.hashed_token
    ? `${siteUrl}/auth/confirm?token_hash=${linkData.properties.hashed_token}&type=invite&next=/set-password`
    : (linkData.properties?.action_link ?? `${siteUrl}/set-password`);

  const emailResult = await sendUserInviteEmail({
    email: parsedEmail.data,
    fullName: targetProfile.full_name,
    role: targetProfile.role,
    actionLink: directActivationLink,
  });

  if (!emailResult.ok) {
    return {
      ok: false,
      error: emailResult.error ?? 'Failed to send invite email.',
    };
  }

  await adminClient.from('audit_log').insert({
    actor_id: caller.id,
    action: 'USER_INVITE_RESENT',
    entity: 'profiles',
    entity_id: targetProfile.id,
    metadata: {
      email: parsedEmail.data,
      role: targetProfile.role,
      full_name: targetProfile.full_name,
    },
  });

  return { ok: true };
}

// Project Administration Actions

export async function createProject(
  input: CreateProjectInput,
): Promise<ActionPromise> {
  const caller = await requireCan('project.create');

  const parsed = createProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid project data.',
    };
  }

  const adminClient = createAdminClient();

  // Insert project
  let project: { id: string } | null = null;
  const initialMilestones: Record<string, unknown> = {};
  if (
    parsed.data.design_commencement_date?.trim() ||
    parsed.data.design_completion_date?.trim()
  ) {
    initialMilestones.preConstruction = {
      commencementDate:
        parsed.data.design_commencement_date?.trim() || undefined,
      plannedCompletionDate:
        parsed.data.design_completion_date?.trim() || undefined,
    };
  }
  if (
    parsed.data.supervision_commencement_date?.trim() ||
    parsed.data.supervision_completion_date?.trim()
  ) {
    initialMilestones.construction = {
      commencementDate:
        parsed.data.supervision_commencement_date?.trim() || undefined,
      targetCompletionDate:
        parsed.data.supervision_completion_date?.trim() || undefined,
    };
  }

  const fullPayload = {
    milestones: (Object.keys(initialMilestones).length > 0
      ? initialMilestones
      : {}) as Json,
    description: parsed.data.name,
    summary: parsed.data.summary || null,
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

  const isSchemaError = (e: { message: string } | null) =>
    !!e && (e.message.includes('schema cache') || e.message.includes('column'));

  let { data: fullProj, error: fullProjError } = await adminClient
    .from('projects')
    .insert(fullPayload)
    .select('id')
    .single();

  // Unapplied summary migration must not drop amounts, emails and milestones.
  if (!fullProj && isSchemaError(fullProjError)) {
    ({ data: fullProj, error: fullProjError } = await adminClient
      .from('projects')
      .insert({ ...fullPayload, summary: undefined })
      .select('id')
      .single());
  }

  if (fullProj) {
    project = fullProj;
  } else if (
    fullProjError &&
    (fullProjError.message.includes('schema cache') ||
      fullProjError.message.includes('column'))
  ) {
    // Retry with core columns if augmented columns are not migrated yet
    const { data: coreProj, error: coreProjError } = await adminClient
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
  const { error: confError } = await adminClient
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

  // Insert initial project team members if specified
  if (parsed.data.members && parsed.data.members.length > 0) {
    const memberRows = parsed.data.members.map((m) => ({
      project_id: project.id,
      user_id: m.userId,
      discipline: m.discipline ?? null,
    }));
    const { error: memberError } = await adminClient
      .from('project_members')
      .insert(memberRows);
    if (memberError) {
      console.error('Failed to insert project team members:', memberError);
    }
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

        // Clone checklist requirements from DB matrix item requirements
        const reqTitles: string[] = (item.noc_matrix_requirements || []).map(
          (r: { title: string }) => r.title,
        );

        if (reqTitles.length > 0) {
          const reqInserts = reqTitles.map((title) => ({
            project_noc_id: insertedNoc.id,
            title,
            is_satisfied: false,
          }));
          const { error: reqInsertError } = await adminClient
            .from('project_noc_requirements')
            .insert(reqInserts);
          if (reqInsertError) {
            console.error(
              'Failed to clone project_noc_requirements:',
              reqInsertError,
            );
          }
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
        members_count: parsed.data.members?.length ?? 0,
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
): Promise<ActionPromise> {
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

  revalidatePath('/projects');
  revalidatePath('/noc-tracker');
  revalidatePath('/noc');
  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// Updates core project details; code, amounts, dates and NOCs are left untouched.
export async function updateProject(
  projectId: string,
  input: ProjectEditInput,
): Promise<ActionPromise> {
  const caller = await requireCan('project.create');

  const parsed = updateProjectSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid project data.',
    };
  }
  const d = parsed.data;

  const adminClient = createAdminClient();
  const core = {
    description: d.name,
    stage: d.stage,
    client_name: d.client_name,
    contractor_name: d.contractor_name,
    client_emails: d.client_emails,
    contractor_emails: d.contractor_emails,
    master_authority_id: d.master_authority_id,
  };

  let { error } = await adminClient
    .from('projects')
    .update({ ...core, summary: d.summary || null })
    .eq('id', projectId);

  // Retry without summary if that column is not migrated yet.
  if (error && /schema cache|column/.test(error.message)) {
    ({ error } = await adminClient
      .from('projects')
      .update(core)
      .eq('id', projectId));
  }
  if (error) return { ok: false, error: error.message };

  await adminClient.from('audit_log').insert({
    actor_id: caller.id,
    action: 'PROJECT_UPDATE',
    entity: 'projects',
    entity_id: projectId,
    metadata: { ...core },
  });

  revalidatePath('/projects');
  revalidatePath('/noc-tracker');
  revalidatePath('/noc');
  revalidatePath('/dashboard');
  revalidatePath(`/projects/${projectId}`);
  return { ok: true };
}

// NOC Sequence Override

export async function overrideNocSequence(
  nocId: string,
  reason: string,
): Promise<ActionPromise> {
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

// Permanent Purge

export async function purgeDocument(docId: string): Promise<ActionPromise> {
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

/**
 * Computes next sequential project code for the current year (e.g. 26004).
 */
export async function getNextProjectCode(): Promise<{
  ok: boolean;
  code?: string;
  error?: string;
}> {
  try {
    const adminClient = createAdminClient();
    const { data: dbProjects } = await adminClient
      .from('projects')
      .select('code')
      .is('archived_at', null);

    const yearPrefix = new Date().getFullYear().toString().slice(-2);
    const existingCodes = new Set<string>();

    if (dbProjects) {
      for (const p of dbProjects) {
        if (p.code) existingCodes.add(p.code.trim());
      }
    }

    let maxSeq = 0;
    const yearRegex = new RegExp(`^${yearPrefix}(\\d{3})$`);
    for (const code of existingCodes) {
      const match = code.match(yearRegex);
      if (match && match[1]) {
        const seq = parseInt(match[1], 10);
        if (seq > maxSeq) {
          maxSeq = seq;
        }
      }
    }

    const nextSeq = maxSeq + 1;
    const nextCode = `${yearPrefix}${String(nextSeq).padStart(3, '0')}`;

    return { ok: true, code: nextCode };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to generate code';
    return { ok: false, error: message };
  }
}

/**
 * Checks whether a proposed project code is available (not already taken).
 */
export async function checkProjectCodeAvailability(
  code: string,
): Promise<{ ok: boolean; available: boolean; error?: string }> {
  const trimmed = code.trim();
  if (!trimmed) {
    return { ok: true, available: false };
  }

  try {
    const adminClient = createAdminClient();
    const { data: existing } = await adminClient
      .from('projects')
      .select('id')
      .eq('code', trimmed)
      .maybeSingle();

    if (existing) {
      return { ok: true, available: false };
    }

    return { ok: true, available: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to verify code';
    return { ok: false, available: false, error: message };
  }
}

// Safely inspects related records count before deleting a project.
export async function getProjectDeletionImpact(projectId: string): Promise<{
  ok: boolean;
  code?: string;
  name?: string;
  documentsCount?: number;
  nocsCount?: number;
  membersCount?: number;
  error?: string;
}> {
  await requireCan('project.delete');
  const adminClient = createAdminClient();

  const { data: project, error: projErr } = await adminClient
    .from('projects')
    .select('id, code, description')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    return { ok: false, error: 'Project not found.' };
  }

  const [docsRes, nocsRes, membersRes] = await Promise.all([
    adminClient
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId),
    adminClient
      .from('project_nocs')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId),
    adminClient
      .from('project_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('project_id', projectId),
  ]);

  return {
    ok: true,
    code: project.code,
    name: project.description,
    documentsCount: docsRes.count ?? 0,
    nocsCount: nocsRes.count ?? 0,
    membersCount: membersRes.count ?? 0,
  };
}

export interface DeleteProjectParams {
  projectId: string;
  confirmCode: string;
  mode?: 'archive' | 'purge';
}

// Safely deletes or archives a project with mandatory project code confirmation.
export async function deleteProjectAction(
  params: DeleteProjectParams,
): Promise<ActionPromise> {
  const caller = await requireCan('project.delete');
  const adminClient = createAdminClient();
  const { projectId, confirmCode, mode = 'archive' } = params;

  const { data: project, error: projErr } = await adminClient
    .from('projects')
    .select('id, code, description')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    return { ok: false, error: 'Project not found.' };
  }

  if (confirmCode.trim().toUpperCase() !== project.code.trim().toUpperCase()) {
    return {
      ok: false,
      error: `Confirmation code does not match project code '${project.code}'.`,
    };
  }

  if (mode === 'archive') {
    const { error: updateErr } = await adminClient
      .from('projects')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', projectId);

    if (updateErr) {
      return { ok: false, error: updateErr.message };
    }

    try {
      await adminClient.from('audit_log').insert({
        actor_id: caller.id,
        action: 'PROJECT_ARCHIVE',
        entity: 'projects',
        entity_id: projectId,
        metadata: {
          code: project.code,
          name: project.description,
        },
      });
    } catch {
      // Audit log error is ignored.
    }
  } else {
    // Delete document storage blobs from bucket.
    const { data: docs } = await adminClient
      .from('documents')
      .select('id, file_path')
      .eq('project_id', projectId);

    if (docs && docs.length > 0) {
      const filePaths = docs
        .map((d) => d.file_path)
        .filter((fp): fp is string => Boolean(fp));

      if (filePaths.length > 0) {
        try {
          await adminClient.storage.from('documents').remove(filePaths);
        } catch (storageErr) {
          console.error(
            'Failed to remove project document storage files:',
            storageErr,
          );
        }
      }

      const docIds = docs.map((d) => d.id);
      await adminClient
        .from('document_reviews')
        .delete()
        .in('document_id', docIds);
      await adminClient.from('documents').delete().eq('project_id', projectId);
    }

    // Delete project NOC requirements, resubmissions and NOC rows.
    const { data: nocs } = await adminClient
      .from('project_nocs')
      .select('id')
      .eq('project_id', projectId);

    if (nocs && nocs.length > 0) {
      const nocIds = nocs.map((n) => n.id);
      await adminClient
        .from('project_noc_requirements')
        .delete()
        .in('project_noc_id', nocIds);
      await adminClient
        .from('noc_resubmission_history')
        .delete()
        .in('project_noc_id', nocIds);
      await adminClient
        .from('project_nocs')
        .delete()
        .eq('project_id', projectId);
    }

    // Delete members and confidential amounts.
    await adminClient
      .from('project_members')
      .delete()
      .eq('project_id', projectId);
    await adminClient
      .from('project_confidential')
      .delete()
      .eq('project_id', projectId);

    // Finally delete project row.
    const { error: delErr } = await adminClient
      .from('projects')
      .delete()
      .eq('id', projectId);

    if (delErr) {
      return { ok: false, error: delErr.message };
    }

    try {
      await adminClient.from('audit_log').insert({
        actor_id: caller.id,
        action: 'PROJECT_PURGE',
        entity: 'projects',
        entity_id: projectId,
        metadata: {
          code: project.code,
          name: project.description,
        },
      });
    } catch {
      // Audit log error is ignored.
    }
  }

  revalidatePath('/projects');
  revalidatePath('/noc-tracker');
  revalidatePath('/noc');
  revalidatePath('/dashboard');
  revalidatePath('/documents');
  revalidatePath('/archive');
  revalidatePath('/');
  return { ok: true };
}

// Restores a soft-deleted archived project back to active status.
export async function restoreProjectAction(
  projectId: string,
): Promise<ActionPromise> {
  const caller = await requireCan('project.delete');
  const adminClient = createAdminClient();

  const { data: project, error: projErr } = await adminClient
    .from('projects')
    .select('id, code, description')
    .eq('id', projectId)
    .single();

  if (projErr || !project) {
    return { ok: false, error: 'Project not found.' };
  }

  const { error: updateErr } = await adminClient
    .from('projects')
    .update({ archived_at: null })
    .eq('id', projectId);

  if (updateErr) {
    return { ok: false, error: updateErr.message };
  }

  try {
    await adminClient.from('audit_log').insert({
      actor_id: caller.id,
      action: 'PROJECT_RESTORE',
      entity: 'projects',
      entity_id: projectId,
      metadata: {
        code: project.code,
        name: project.description,
      },
    });
  } catch {
    // Audit log error is ignored.
  }

  revalidatePath('/projects');
  revalidatePath('/noc-tracker');
  revalidatePath('/noc');
  revalidatePath('/dashboard');
  revalidatePath('/documents');
  revalidatePath('/archive');
  revalidatePath('/');
  return { ok: true };
}
