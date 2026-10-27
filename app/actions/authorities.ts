'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export interface MasterAuthorityWithStats {
  id: number;
  name: string;
  jurisdiction: string | null;
  projectsCount: number;
  matrixItemsCount: number;
}

const masterAuthoritySchema = z.object({
  name: z.string().trim().min(2, 'Authority name must be at least 2 characters.'),
  jurisdiction: z.string().trim().optional().nullable(),
});

// Fetches master authorities joined with project and matrix template counts.
export async function getMasterAuthoritiesWithStats(): Promise<{
  ok: boolean;
  data: MasterAuthorityWithStats[];
  error?: string;
}> {
  try {
    await requireCan('authority.master.manage');
    const supabase = await createClient();

    const { data: authorities, error: authErr } = await supabase
      .from('master_authorities')
      .select('id, name, jurisdiction')
      .order('id', { ascending: true });

    if (authErr) {
      return { ok: false, data: [], error: authErr.message };
    }

    if (!authorities || authorities.length === 0) {
      return { ok: true, data: [] };
    }

    const { data: projects } = await supabase
      .from('projects')
      .select('master_authority_id');

    const { data: matrixItems } = await supabase
      .from('noc_matrix_items')
      .select('master_authority_id');

    const projCounts = (projects ?? []).reduce<Record<number, number>>(
      (acc, p) => {
        if (p.master_authority_id) {
          acc[p.master_authority_id] = (acc[p.master_authority_id] || 0) + 1;
        }
        return acc;
      },
      {},
    );

    const matrixCounts = (matrixItems ?? []).reduce<Record<number, number>>(
      (acc, m) => {
        if (m.master_authority_id) {
          acc[m.master_authority_id] = (acc[m.master_authority_id] || 0) + 1;
        }
        return acc;
      },
      {},
    );

    const data: MasterAuthorityWithStats[] = authorities.map((a) => ({
      id: a.id,
      name: a.name,
      jurisdiction: a.jurisdiction ?? null,
      projectsCount: projCounts[a.id] || 0,
      matrixItemsCount: matrixCounts[a.id] || 0,
    }));

    return { ok: true, data };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Failed to fetch master authorities.';
    return { ok: false, data: [], error: message };
  }
}

// Registers a new master authority jurisdiction.
export async function createMasterAuthorityAction(input: {
  name: string;
  jurisdiction?: string | null;
}): Promise<{ ok: boolean; data?: MasterAuthorityWithStats; error?: string }> {
  try {
    const caller = await requireCan('authority.master.manage');
    const parsed = masterAuthoritySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input data.',
      };
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
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
        error: error?.message || 'Failed to register master authority.',
      };
    }

    try {
      await adminClient.from('audit_log').insert({
        actor_id: caller.id,
        action: 'MASTER_AUTHORITY_CREATE',
        entity: 'master_authorities',
        entity_id: String(data.id),
        metadata: {
          name: data.name,
          jurisdiction: data.jurisdiction,
        },
      });
    } catch {
      // Audit log failures should not block operation.
    }

    revalidatePath('/authorities');
    revalidatePath('/projects/new');
    revalidatePath('/noc-matrix');
    return {
      ok: true,
      data: {
        ...data,
        projectsCount: 0,
        matrixItemsCount: 0,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Server error occurred.';
    return { ok: false, error: message };
  }
}

// Updates an existing master authority title or jurisdiction.
export async function updateMasterAuthorityAction(input: {
  id: number;
  name: string;
  jurisdiction?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const caller = await requireCan('authority.master.manage');
    const parsed = masterAuthoritySchema.safeParse({
      name: input.name,
      jurisdiction: input.jurisdiction,
    });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input data.',
      };
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
      .from('master_authorities')
      .update({
        name: parsed.data.name,
        jurisdiction: parsed.data.jurisdiction || null,
      })
      .eq('id', input.id);

    if (error) {
      return {
        ok: false,
        error: error.message || 'Failed to update master authority.',
      };
    }

    try {
      await adminClient.from('audit_log').insert({
        actor_id: caller.id,
        action: 'MASTER_AUTHORITY_UPDATE',
        entity: 'master_authorities',
        entity_id: String(input.id),
        metadata: {
          name: parsed.data.name,
          jurisdiction: parsed.data.jurisdiction,
        },
      });
    } catch {
      // Non-fatal audit log catch.
    }

    revalidatePath('/authorities');
    revalidatePath('/projects/new');
    revalidatePath('/noc-matrix');
    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Server error occurred.';
    return { ok: false, error: message };
  }
}

// Deletes a master authority if no projects or matrix templates reference it.
export async function deleteMasterAuthorityAction(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const caller = await requireCan('authority.master.manage');
    const adminClient = createAdminClient();

    const { data: linkedProjects, error: projErr } = await adminClient
      .from('projects')
      .select('id, code, name')
      .eq('master_authority_id', id)
      .limit(5);

    if (projErr) {
      return { ok: false, error: projErr.message };
    }

    if (linkedProjects && linkedProjects.length > 0) {
      return {
        ok: false,
        error: `Cannot delete: authority is assigned to ${linkedProjects.length} active project(s).`,
      };
    }

    const { data: linkedMatrix, error: matErr } = await adminClient
      .from('noc_matrix_items')
      .select('id')
      .eq('master_authority_id', id)
      .limit(1);

    if (matErr) {
      return { ok: false, error: matErr.message };
    }

    if (linkedMatrix && linkedMatrix.length > 0) {
      return {
        ok: false,
        error:
          'Cannot delete: authority has associated NOC matrix templates. Remove template items first.',
      };
    }

    const { error: delErr } = await adminClient
      .from('master_authorities')
      .delete()
      .eq('id', id);

    if (delErr) {
      return { ok: false, error: delErr.message };
    }

    try {
      await adminClient.from('audit_log').insert({
        actor_id: caller.id,
        action: 'MASTER_AUTHORITY_DELETE',
        entity: 'master_authorities',
        entity_id: String(id),
      });
    } catch {
      // Non-fatal audit log catch.
    }

    revalidatePath('/authorities');
    revalidatePath('/projects/new');
    revalidatePath('/noc-matrix');
    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Server error occurred.';
    return { ok: false, error: message };
  }
}

export interface ReviewingAuthorityWithStats {
  id: number;
  name: string;
  matrixItemsCount: number;
  projectNocsCount: number;
}

const reviewingAuthoritySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Reviewing authority name must be at least 2 characters.')
    .max(100, 'Name cannot exceed 100 characters.'),
});

// Fetches reviewing authorities joined with NOC matrix and project NOC counts.
export async function getReviewingAuthoritiesWithStats(): Promise<{
  ok: boolean;
  data: ReviewingAuthorityWithStats[];
  error?: string;
}> {
  try {
    await requireCan('authority.master.manage');
    const supabase = await createClient();

    const { data: reviewingAuths, error: revErr } = await supabase
      .from('reviewing_authorities')
      .select('id, name')
      .order('id', { ascending: true });

    if (revErr) {
      return { ok: false, data: [], error: revErr.message };
    }

    if (!reviewingAuths || reviewingAuths.length === 0) {
      return { ok: true, data: [] };
    }

    const { data: matrixItems } = await supabase
      .from('noc_matrix_items')
      .select('reviewing_authority_id');

    const { data: projectNocs } = await supabase
      .from('project_nocs')
      .select('reviewing_authority_id');

    const matrixCounts = (matrixItems ?? []).reduce<Record<number, number>>(
      (acc, m) => {
        if (m.reviewing_authority_id) {
          acc[m.reviewing_authority_id] =
            (acc[m.reviewing_authority_id] || 0) + 1;
        }
        return acc;
      },
      {},
    );

    const projectNocCounts = (projectNocs ?? []).reduce<
      Record<number, number>
    >((acc, p) => {
      if (p.reviewing_authority_id) {
        acc[p.reviewing_authority_id] =
          (acc[p.reviewing_authority_id] || 0) + 1;
      }
      return acc;
    }, {});

    const data: ReviewingAuthorityWithStats[] = reviewingAuths.map((r) => ({
      id: r.id,
      name: r.name,
      matrixItemsCount: matrixCounts[r.id] || 0,
      projectNocsCount: projectNocCounts[r.id] || 0,
    }));

    return { ok: true, data };
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : 'Failed to fetch reviewing authorities.';
    return { ok: false, data: [], error: message };
  }
}

// Registers a new statutory reviewing authority body.
export async function createReviewingAuthorityAction(input: {
  name: string;
}): Promise<{
  ok: boolean;
  data?: ReviewingAuthorityWithStats;
  error?: string;
}> {
  try {
    const caller = await requireCan('authority.master.manage');
    const parsed = reviewingAuthoritySchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input data.',
      };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from('reviewing_authorities')
      .select('id, name')
      .ilike('name', parsed.data.name)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error: `Reviewing authority "${existing.name}" already exists.`,
      };
    }

    const { data, error } = await adminClient
      .from('reviewing_authorities')
      .insert({
        name: parsed.data.name,
      })
      .select('id, name')
      .single();

    if (error || !data) {
      return {
        ok: false,
        error: error?.message || 'Failed to register reviewing authority.',
      };
    }

    try {
      await adminClient.from('audit_log').insert({
        actor_id: caller.id,
        action: 'REVIEWING_AUTHORITY_CREATE',
        entity: 'reviewing_authorities',
        entity_id: String(data.id),
        metadata: {
          name: data.name,
        },
      });
    } catch {
      // Non-fatal audit log catch.
    }

    revalidatePath('/authorities');
    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');

    return {
      ok: true,
      data: {
        id: data.id,
        name: data.name,
        matrixItemsCount: 0,
        projectNocsCount: 0,
      },
    };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Server error occurred.';
    return { ok: false, error: message };
  }
}

// Updates an existing reviewing authority title.
export async function updateReviewingAuthorityAction(input: {
  id: number;
  name: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const caller = await requireCan('authority.master.manage');
    const parsed = reviewingAuthoritySchema.safeParse({ name: input.name });
    if (!parsed.success) {
      return {
        ok: false,
        error: parsed.error.issues[0]?.message ?? 'Invalid input data.',
      };
    }

    const adminClient = createAdminClient();

    const { data: existing } = await adminClient
      .from('reviewing_authorities')
      .select('id, name')
      .ilike('name', parsed.data.name)
      .neq('id', input.id)
      .maybeSingle();

    if (existing) {
      return {
        ok: false,
        error: `Another reviewing authority with name "${existing.name}" already exists.`,
      };
    }

    const { error } = await adminClient
      .from('reviewing_authorities')
      .update({
        name: parsed.data.name,
      })
      .eq('id', input.id);

    if (error) {
      return {
        ok: false,
        error: error.message || 'Failed to update reviewing authority.',
      };
    }

    try {
      await adminClient.from('audit_log').insert({
        actor_id: caller.id,
        action: 'REVIEWING_AUTHORITY_UPDATE',
        entity: 'reviewing_authorities',
        entity_id: String(input.id),
        metadata: {
          name: parsed.data.name,
        },
      });
    } catch {
      // Non-fatal audit log catch.
    }

    revalidatePath('/authorities');
    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');
    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Server error occurred.';
    return { ok: false, error: message };
  }
}

// Deletes a reviewing authority if no matrix templates or project NOCs reference it.
export async function deleteReviewingAuthorityAction(
  id: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const caller = await requireCan('authority.master.manage');
    const adminClient = createAdminClient();

    const { data: linkedMatrix, error: matErr } = await adminClient
      .from('noc_matrix_items')
      .select('id')
      .eq('reviewing_authority_id', id)
      .limit(5);

    if (matErr) {
      return { ok: false, error: matErr.message };
    }

    if (linkedMatrix && linkedMatrix.length > 0) {
      return {
        ok: false,
        error: `Cannot delete: reviewing authority is assigned to ${linkedMatrix.length} NOC matrix template item(s). Reassign them first.`,
      };
    }

    const { data: linkedProjectNocs, error: nocErr } = await adminClient
      .from('project_nocs')
      .select('id')
      .eq('reviewing_authority_id', id)
      .limit(5);

    if (nocErr) {
      return { ok: false, error: nocErr.message };
    }

    if (linkedProjectNocs && linkedProjectNocs.length > 0) {
      return {
        ok: false,
        error: `Cannot delete: reviewing authority is referenced by ${linkedProjectNocs.length} active project NOC(s).`,
      };
    }

    const { error: delErr } = await adminClient
      .from('reviewing_authorities')
      .delete()
      .eq('id', id);

    if (delErr) {
      return { ok: false, error: delErr.message };
    }

    try {
      await adminClient.from('audit_log').insert({
        actor_id: caller.id,
        action: 'REVIEWING_AUTHORITY_DELETE',
        entity: 'reviewing_authorities',
        entity_id: String(id),
      });
    } catch {
      // Non-fatal audit log catch.
    }

    revalidatePath('/authorities');
    revalidatePath('/noc-matrix');
    revalidatePath('/noc-tracker');
    return { ok: true };
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : 'Server error occurred.';
    return { ok: false, error: message };
  }
}


