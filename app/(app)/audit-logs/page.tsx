import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AuditLogsWorkspace, type AuditLogItem } from './audit-logs-workspace';

export const metadata = {
  title: 'Audit Logs & Compliance Ledger',
  description:
    'Tamper-evident activity trail across drawings, NOCs, and user administration',
};

export default async function AuditLogsPage() {
  await requireCan('audit.view');
  const supabase = await createClient();

  const { data: logs, error } = await supabase
    .from('audit_log')
    .select(
      `
      id,
      action,
      entity,
      entity_id,
      metadata,
      created_at,
      actor:profiles(id, full_name, email, role)
    `,
    )
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    console.error('Failed to load audit logs:', error.message);
  }

  const formattedLogs: AuditLogItem[] = (logs ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entity: row.entity,
    entity_id: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? null,
    created_at: row.created_at,
    actor: Array.isArray(row.actor)
      ? (row.actor[0] ?? null)
      : (row.actor ?? null),
  }));

  return <AuditLogsWorkspace initialLogs={formattedLogs} />;
}
