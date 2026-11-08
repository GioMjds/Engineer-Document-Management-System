import { timingSafeEqual } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { notifyNoc } from '@/lib/email/noc-notifications';
import { expiryDedupeKey, getExpiryStage } from '@/lib/email/noc-email-logic';

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
    .select('id, expiry_date')
    .eq('status_code', 'approved')
    .not('expiry_date', 'is', null);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const due = (nocs ?? []).flatMap((n) => {
    const stage = getExpiryStage(n.expiry_date);
    return stage && n.expiry_date
      ? [{ id: n.id, stage, key: expiryDedupeKey(n.id, n.expiry_date, stage) }]
      : [];
  });

  const { data: sentRows } = due.length
    ? await admin
        .from('audit_log')
        .select('metadata')
        .eq('action', 'NOC_EXPIRY_NOTIFIED')
        .in(
          'entity_id',
          due.map((d) => d.id),
        )
    : { data: [] };
  const sentKeys = new Set(
    (sentRows ?? []).map((r) => (r.metadata as { key?: string } | null)?.key),
  );

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const noc of due) {
    if (sentKeys.has(noc.key)) {
      skipped += 1;
      continue;
    }
    const result = await notifyNoc(noc.id, { type: 'expiry', stage: noc.stage });
    if (!result.ok) {
      failed += 1;
      continue;
    }
    await admin.from('audit_log').insert({
      action: 'NOC_EXPIRY_NOTIFIED',
      actor_id: null,
      entity: 'project_nocs',
      entity_id: noc.id,
      metadata: { key: noc.key, stage: noc.stage },
    });
    sent += 1;
  }

  return NextResponse.json({ checked: nocs?.length ?? 0, sent, skipped, failed });
}
