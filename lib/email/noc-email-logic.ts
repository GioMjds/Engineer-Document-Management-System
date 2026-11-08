import {
  calculateDaysRemaining,
  isExpiringSoon,
  isLapsed,
} from '../noc-tracker.ts';
import type { EdmsAlertPayload } from './notifications.ts';

export type ExpiryStage = 'warning' | 'lapsed';

export type NocEmailEvent =
  | { type: 'approved' }
  | { type: 'rejected'; reason: string; revision: string }
  | { type: 'expiry'; stage: ExpiryStage };

export interface NocEmailContext {
  projectCode: string;
  authority: string;
  description: string;
  referenceNo: string | null;
  expiryDate: string | null;
}

// Escape text that is interpolated into email HTML.
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export type RecipientGroup = 'staff' | 'client' | 'contractor';

// Lapsed NOCs older than this are not emailed, so old backlog never floods recipients.
const LAPSED_EMAIL_WINDOW_DAYS = 30;

// Pick the expiry email stage, or null when no email is due.
export function getExpiryStage(expiryDate: string | null): ExpiryStage | null {
  if (isLapsed(expiryDate)) {
    const days = calculateDaysRemaining(expiryDate);
    return days !== null && days >= -LAPSED_EMAIL_WINDOW_DAYS ? 'lapsed' : null;
  }
  if (isExpiringSoon(expiryDate)) return 'warning';
  return null;
}

// Key that identifies one expiry email for one NOC at one expiry date.
export function expiryDedupeKey(
  nocId: string,
  expiryDate: string,
  stage: ExpiryStage,
): string {
  return `${nocId}:${expiryDate}:${stage}`;
}

// Ledger key for one expiry email sent to one recipient group.
export function groupLedgerKey(key: string, group: RecipientGroup): string {
  return `${key}:${group}`;
}

// Split a list into pieces of at most `size` items.
export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// Merge address lists into one lowercase, de-duplicated list of plausible emails.
export function mergeRecipients(
  ...lists: (string | null | undefined)[][]
): string[] {
  const out = new Set<string>();
  for (const list of lists) {
    for (const raw of list) {
      const email = raw?.trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+$/.test(email)) out.add(email);
    }
  }
  return [...out];
}

// Build the alert content for one NOC event; user text is escaped here.
export function buildNocAlert(
  ctx: NocEmailContext,
  event: NocEmailEvent,
  siteUrl: string,
): Omit<EdmsAlertPayload, 'to'> {
  const base = [
    { label: 'Project', value: escapeHtml(ctx.projectCode) },
    { label: 'Authority', value: escapeHtml(ctx.authority) },
    { label: 'NOC', value: escapeHtml(ctx.description) },
  ];
  if (ctx.referenceNo) {
    base.push({ label: 'Reference', value: escapeHtml(ctx.referenceNo) });
  }
  const actionUrl = `${siteUrl}/noc-tracker/${encodeURIComponent(ctx.projectCode)}`;
  const code = ctx.projectCode;
  const days = calculateDaysRemaining(ctx.expiryDate);

  if (event.type === 'approved') {
    return {
      subject: `NOC approved - ${code}`,
      headline: 'NOC approved by authority',
      details: [
        ...base,
        {
          label: 'Valid until',
          value: ctx.expiryDate ? escapeHtml(ctx.expiryDate) : 'Permanent',
        },
      ],
      actionUrl,
      actionLabel: 'View NOC',
    };
  }
  if (event.type === 'rejected') {
    return {
      subject: `NOC rejected - ${code}`,
      headline: 'NOC rejected by authority',
      details: [
        ...base,
        { label: 'Reason', value: escapeHtml(event.reason) },
        { label: 'Next revision', value: escapeHtml(event.revision) },
      ],
      actionUrl,
      actionLabel: 'View NOC',
    };
  }
  const lapsed = event.stage === 'lapsed';
  return {
    subject: `${lapsed ? 'NOC lapsed' : 'NOC expiring soon'} - ${code}`,
    headline: lapsed ? 'NOC has lapsed' : 'NOC expires within 14 days',
    details: [
      ...base,
      { label: 'Expiry date', value: escapeHtml(ctx.expiryDate ?? '') },
      {
        label: lapsed ? 'Days overdue' : 'Days remaining',
        value: String(days === null ? '' : Math.abs(days)),
      },
    ],
    actionUrl,
    actionLabel: 'View NOC',
  };
}
