import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyNoc } from '@/lib/email/noc-notifications';
import {
  chunk,
  expiryDedupeKey,
  getExpiryStage,
  groupLedgerKey,
  type RecipientGroup,
} from '@/lib/email/noc-email-logic';

const GROUPS: RecipientGroup[] = ['staff', 'client', 'contractor'];

export const dynamic = 'force-dynamic';

// Constant-time compare of the bearer header against CRON_SECRET.
function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(request.headers.get('authorization') ?? '');
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

// Send expiry warning and lapsed emails once per NOC, expiry date and stage.
export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: nocs, error } = await admin
    .from('project_nocs')
    .select('id, expiry_date, projects!inner(archived_at)')
    .eq('status_code', 'approved')
    .not('expiry_date', 'is', null)
    .is('projects.archived_at', null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = (nocs ?? []).flatMap((n) => {
    const stage = getExpiryStage(n.expiry_date);
    return stage && n.expiry_date
      ? [{ id: n.id, stage, key: expiryDedupeKey(n.id, n.expiry_date, stage) }]
      : [];
  });

  // Chunked lookups keep the URL short and each page under the row limit.
  const sentKeys = new Set<string>();
  for (const ids of chunk(due.map((d) => d.id), 100)) {
    const { data: rows, error: ledgerError } = await admin
      .from('audit_log')
      .select('metadata')
      .eq('action', 'NOC_EXPIRY_NOTIFIED')
      .in('entity_id', ids);
    if (ledgerError) {
      return NextResponse.json({ error: ledgerError.message }, { status: 500 });
    }
    for (const r of rows ?? []) {
      const key = (r.metadata as { key?: string } | null)?.key;
      if (key) sentKeys.add(key);
    }
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const noc of due) {
    const done = GROUPS.filter((g) =>
      sentKeys.has(groupLedgerKey(noc.key, g)),
    );
    const result = await notifyNoc(
      noc.id,
      { type: 'expiry', stage: noc.stage },
      done,
    );
    // Record each group that got the email, so a retry never repeats it.
    for (const group of result.sentGroups) {
      const { error: insertError } = await admin.from('audit_log').insert({
        action: 'NOC_EXPIRY_NOTIFIED',
        actor_id: null,
        entity: 'project_nocs',
        entity_id: noc.id,
        metadata: { key: groupLedgerKey(noc.key, group), stage: noc.stage, group },
      });
      if (insertError) result.ok = false;
    }
    if (!result.ok) failed += 1;
    else if (result.sentGroups.length > 0) sent += 1;
    else skipped += 1;
  }

  return NextResponse.json({ checked: nocs?.length ?? 0, sent, skipped, failed });
}
