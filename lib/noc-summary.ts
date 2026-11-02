import { isExpiringSoon, isPlanDueOrAtRisk } from '@/lib/noc-tracker';
import type { ProjectNocItem } from '@/types/noc';

export type UrgentFilter =
  | 'expiring'
  | 'rejected'
  | 'pending-payment'
  | 'due-risk';

/**
 * Single source of truth for the "Action required" predicates.
 * Used by the project page (alert ribbon filter) AND the project picker
 * (per-project counts), so the two can never disagree.
 *
 * NOTE: 'expiring' deliberately mirrors the previous behaviour
 * (`isExpiringSoon && status !== 'Approved'`). Review it: an Approved NOC is
 * exactly the kind that expires, so this probably needs to change.
 */
export function matchesUrgentFilter(
  item: ProjectNocItem,
  filter: string,
): boolean {
  switch (filter) {
    case 'expiring':
      return isExpiringSoon(item.expiryDate) && item.status !== 'Expired';
    case 'rejected':
      return item.status === 'Rejected';
    case 'pending-payment':
      return item.status === 'Pending for Payment';
    case 'due-risk':
      return (
        (item.status === 'Not Started' || !item.applyDate) &&
        item.status !== 'Approved' &&
        item.status !== 'Not Needed' &&
        isPlanDueOrAtRisk(item.planDate)
      );
    default:
      return true;
  }
}

export interface NocSummary {
  /** NOCs that are actually required (excludes 'Not Needed'). */
  required: number;
  approved: number;
  expiring: number;
  rejected: number;
  feeDue: number;
  atRisk: number;
}

export function summarizeNocs(items: ProjectNocItem[]): NocSummary {
  const summary: NocSummary = {
    required: 0,
    approved: 0,
    expiring: 0,
    rejected: 0,
    feeDue: 0,
    atRisk: 0,
  };

  for (const item of items) {
    if (item.status === 'Not Needed') continue;
    summary.required += 1;
    if (item.status === 'Approved') summary.approved += 1;
    if (matchesUrgentFilter(item, 'expiring')) summary.expiring += 1;
    if (matchesUrgentFilter(item, 'rejected')) summary.rejected += 1;
    if (matchesUrgentFilter(item, 'pending-payment')) summary.feeDue += 1;
    if (matchesUrgentFilter(item, 'due-risk')) summary.atRisk += 1;
  }

  return summary;
}

export function attentionCount(summary: NocSummary): number {
  return summary.expiring + summary.rejected + summary.feeDue + summary.atRisk;
}
