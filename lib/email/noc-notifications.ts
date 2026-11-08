import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEdmsAlert } from './notifications';
import { getNocRecipients } from './noc-recipients';
import {
  buildNocAlert,
  type NocEmailEvent,
  type RecipientGroup,
} from './noc-email-logic';

export interface NotifyResult {
  ok: boolean;
  error?: string;
  sentGroups: RecipientGroup[];
}

// Log a failed NOC email so it is visible in the activity log.
async function logFailure(nocId: string, event: NocEmailEvent, error: string) {
  try {
    await createAdminClient().from('audit_log').insert({
      action: 'NOC_EMAIL_FAILED',
      actor_id: null,
      entity: 'project_nocs',
      entity_id: nocId,
      metadata: { event: event.type, error },
    });
  } catch {
    // Logging must never break the caller.
  }
}

// Email staff, client and contractor about a NOC event; never throws.
// Groups in skipGroups already got this email and are not sent again.
export async function notifyNoc(
  nocId: string,
  event: NocEmailEvent,
  skipGroups: RecipientGroup[] = [],
): Promise<NotifyResult> {
  const sentGroups: RecipientGroup[] = [];
  try {
    const admin = createAdminClient();
    const { data: noc } = await admin
      .from('project_nocs')
      .select(
        'project_id, description, reference_no, expiry_date, reviewing_authority_id',
      )
      .eq('id', nocId)
      .maybeSingle();
    if (!noc) throw new Error('NOC not found');

    const [{ data: project }, { data: authority }, recipients] =
      await Promise.all([
        admin.from('projects').select('code').eq('id', noc.project_id).maybeSingle(),
        admin
          .from('reviewing_authorities')
          .select('name')
          .eq('id', noc.reviewing_authority_id)
          .maybeSingle(),
        getNocRecipients(noc.project_id),
      ]);
    if (!project) throw new Error('Project not found');

    const alert = buildNocAlert(
      {
        projectCode: project.code,
        authority: authority?.name ?? `Authority #${noc.reviewing_authority_id}`,
        description: noc.description,
        referenceNo: noc.reference_no,
        expiryDate: noc.expiry_date,
      },
      event,
      process.env.SITE_URL || 'http://localhost:3000',
    );

    // Separate sends keep client and contractor addresses private from each other.
    const pending = (['staff', 'client', 'contractor'] as const)
      .filter((g) => !skipGroups.includes(g) && recipients[g].length > 0)
      .map((g) => ({ group: g, to: recipients[g] }));
    if (pending.length === 0 && skipGroups.length === 0) {
      throw new Error('No recipients');
    }

    const results = await Promise.all(
      pending.map(async (p) => ({
        group: p.group,
        result: await sendEdmsAlert({ ...alert, to: p.to }),
      })),
    );
    for (const r of results) if (r.result.ok) sentGroups.push(r.group);
    const failed = results.find((r) => !r.result.ok);
    if (failed) throw new Error(failed.result.error ?? 'Send failed');

    return { ok: true, sentGroups };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown email error';
    await logFailure(nocId, event, message);
    return { ok: false, error: message, sentGroups };
  }
}
