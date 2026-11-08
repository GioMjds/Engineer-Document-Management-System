import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { mergeRecipients } from './noc-email-logic';

export interface NocRecipients {
  staff: string[];
  client: string[];
  contractor: string[];
}

// Resolve staff, client and contractor emails for one project.
export async function getNocRecipients(
  projectId: string,
): Promise<NocRecipients> {
  const admin = createAdminClient();

  const [{ data: project }, { data: members }, { data: admins }] =
    await Promise.all([
      admin
        .from('projects')
        .select('client_emails, contractor_emails')
        .eq('id', projectId)
        .maybeSingle(),
      admin
        .from('project_members')
        .select('profiles!inner(email, active)')
        .eq('project_id', projectId),
      admin.from('profiles').select('email').eq('role', 'admin').eq('active', true),
    ]);

  const memberEmails = (members ?? []).flatMap((m) => {
    const p = m.profiles as unknown as {
      email: string | null;
      active: boolean;
    } | null;
    return p?.active ? [p.email] : [];
  });

  return {
    staff: mergeRecipients(
      memberEmails,
      (admins ?? []).map((a) => a.email),
    ),
    client: mergeRecipients(project?.client_emails ?? []),
    contractor: mergeRecipients(project?.contractor_emails ?? []),
  };
}
