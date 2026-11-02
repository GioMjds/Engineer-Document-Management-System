'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { type AppRole } from '@/lib/permissions';
import { sendUserInviteEmail } from '@/lib/email/notifications';
import { INITIAL_NOCS_PROJECT_26001, SEED_PROJECTS } from '@/lib/noc-tracker';
import type { Json } from '@/types/database';

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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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
          linkError?.message ?? inviteError?.message ?? 'Failed to invite user.',
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

  // Send branded invitation email with password activation link via Resend
  if (process.env.RESEND_API_KEY) {
    const emailResult = await sendUserInviteEmail({
      email: parsed.data.email,
      fullName: parsed.data.full_name,
      role: parsed.data.role,
      actionLink: directActivationLink,
    });

    if (!emailResult.ok) {
      console.warn('Invite email delivery error via Resend:', emailResult.error);
    }
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
  return { ok: true };
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

export async function deactivateUser(
  userId: string,
): Promise<ActionPromise> {
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
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

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

  if (process.env.RESEND_API_KEY) {
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

  const supabase = await createClient();
  const adminClient = createAdminClient();

  // Insert project
  let project: { id: string } | null = null;
  const initialMilestones: Record<string, unknown> = {};
  if (
    parsed.data.design_commencement_date ||
    parsed.data.design_completion_date
  ) {
    initialMilestones.preConstruction = {
      commencementDate: parsed.data.design_commencement_date || undefined,
      plannedCompletionDate: parsed.data.design_completion_date || undefined,
    };
  }
  if (
    parsed.data.supervision_commencement_date ||
    parsed.data.supervision_completion_date
  ) {
    initialMilestones.construction = {
      commencementDate: parsed.data.supervision_commencement_date || undefined,
      targetCompletionDate:
        parsed.data.supervision_completion_date || undefined,
    };
  }

  const fullPayload = {
    milestones: (Object.keys(initialMilestones).length > 0
      ? initialMilestones
      : {}) as Json,
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

  // Insert initial project team members if specified
  if (parsed.data.members && parsed.data.members.length > 0) {
    const memberRows = parsed.data.members.map((m) => ({
      project_id: project.id,
      user_id: m.userId,
      discipline: m.discipline ?? null,
    }));
    await adminClient.from('project_members').insert(memberRows);
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
            console.error('Failed to clone project_noc_requirements:', reqInsertError);
          }
        }
      }
    }
  } else {
    // Statutory baseline instantiation fallback for unseeded authorities
    const revAuthMap: Record<string, number> = {
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
    const stageMap: Record<
      string,
      'design' | 'information' | 'construction' | 'handover'
    > = {
      'Design NOC': 'design',
      'Information NOC': 'information',
      'Construction NOC': 'construction',
      'Handover NOC': 'handover',
    };

    for (const seedNoc of INITIAL_NOCS_PROJECT_26001) {
      const stageCode = stageMap[seedNoc.stage] || 'design';
      const revAuthId = revAuthMap[seedNoc.reviewingAuthority] || 1;

      const { data: insertedNoc } = await adminClient
        .from('project_nocs')
        .insert({
          project_id: project.id,
          sequence_no: seedNoc.sequenceNumber,
          stage: stageCode,
          reviewing_authority_id: revAuthId,
          description: seedNoc.description,
          submitted_by: 'consultant',
          status_code: 'not_started',
          payment_fee: seedNoc.paymentFee || 0,
          is_paid: false,
          blocking_sequence_no: seedNoc.blockingSequenceNumber,
          current_revision: 'R00',
        })
        .select('id')
        .single();

      if (insertedNoc) {
        instantiatedNocsCount++;
        if (seedNoc.requirements && seedNoc.requirements.length > 0) {
          const reqInserts = seedNoc.requirements.map((r) => ({
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

export async function purgeDocument(
  docId: string,
): Promise<ActionPromise> {
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
    const supabase = await createClient();
    const { data: dbProjects } = await supabase
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

    for (const sp of SEED_PROJECTS) {
      existingCodes.add(sp.code.trim());
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
    const message = err instanceof Error ? err.message : 'Failed to generate code';
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
    const supabase = await createClient();
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('code', trimmed)
      .maybeSingle();

    if (existing) {
      return { ok: true, available: false };
    }

    const inSeed = SEED_PROJECTS.some(
      (sp) => sp.code.toLowerCase() === trimmed.toLowerCase(),
    );
    return { ok: true, available: !inSeed };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to verify code';
    return { ok: false, available: false, error: message };
  }
}
