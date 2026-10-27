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

