import { createClient } from '@/lib/supabase/server';
import {
  PROJECT_STAGES,
  type ProjectEditDetails,
} from '@/lib/project-edit';

interface RawEditRow {
  id: string;
  summary?: string | null;
  stage: string | null;
  client_name: string | null;
  contractor_name: string | null;
  client_emails: string[] | null;
  contractor_emails: string[] | null;
  master_authority_id: number;
}

const COLUMNS =
  'id, stage, client_name, contractor_name, client_emails, contractor_emails, master_authority_id';

// Loads editable fields per project id; callers must already be allowed to edit.
export async function getProjectEditDetails() {
  const supabase = await createClient();

  // Retry without summary if that column is not migrated yet.
  let res = await supabase
    .from('projects')
    .select(`${COLUMNS}, summary`)
    .is('archived_at', null);
  if (res.error) {
    res = (await supabase
      .from('projects')
      .select(COLUMNS)
      .is('archived_at', null)) as typeof res;
  }

  const details: Record<string, ProjectEditDetails> = {};
  for (const r of (res.data ?? []) as unknown as RawEditRow[]) {
    details[r.id] = {
      summary: r.summary ?? '',
      stage: PROJECT_STAGES.find((s) => s === r.stage) ?? 'planning',
      clientName: r.client_name ?? '',
      contractorName: r.contractor_name ?? '',
      clientEmails: r.client_emails ?? [],
      contractorEmails: r.contractor_emails ?? [],
      masterAuthorityId: r.master_authority_id,
    };
  }
  return details;
}
