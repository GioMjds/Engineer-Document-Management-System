import type { ProjectNocItem } from '@/types/noc';

function parseDatePartsToUtc(dateStr: string): number | null {
  const parts = dateStr.split('-');
  if (parts.length !== 3) return null;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null;
  return Date.UTC(year, month, day);
}

export function calculateDaysRemaining(expiryDateStr: string | null): number | null {
  if (!expiryDateStr) return null;
  const expiryUtc = parseDatePartsToUtc(expiryDateStr);
  if (expiryUtc === null) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffTime = expiryUtc - todayUtc;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(expiryDateStr: string | null): boolean {
  const days = calculateDaysRemaining(expiryDateStr);
  return days !== null && days >= 0 && days <= 14;
}

export function isLapsed(expiryDateStr: string | null): boolean {
  const days = calculateDaysRemaining(expiryDateStr);
  return days !== null && days < 0;
}

// Evaluates if an unsubmitted NOC has reached plan date or is due within the threshold window.
export function isPlanDueOrAtRisk(planDateStr: string | null, daysThreshold = 7): boolean {
  if (!planDateStr) return false;
  const planUtc = parseDatePartsToUtc(planDateStr);
  if (planUtc === null) return false;
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const diffDays = Math.ceil((planUtc - todayUtc) / (1000 * 60 * 60 * 24));
  return diffDays <= daysThreshold;
}

export function checkBlockingPrerequisite(
  item: ProjectNocItem,
  allNocs: ProjectNocItem[],
): { isBlocked: boolean; blockerTitle?: string; isOverridden?: boolean } {
  if (item.overrideReason) {
    return {
      isBlocked: false,
      isOverridden: true,
      blockerTitle: `Overridden by Admin: ${item.overrideReason}`,
    };
  }
  if (!item.blockingSequenceNumber) {
    return { isBlocked: false, isOverridden: false };
  }
  const prerequisite = allNocs.find(
    (n) =>
      n.projectCode === item.projectCode &&
      n.sequenceNumber === item.blockingSequenceNumber,
  );
  if (!prerequisite || prerequisite.status !== 'Approved') {
    return {
      isBlocked: true,
      isOverridden: false,
      blockerTitle: prerequisite
        ? `${prerequisite.reviewingAuthority} #${prerequisite.sequenceNumber} (${prerequisite.description})`
        : `Seq #${item.blockingSequenceNumber}`,
    };
  }
  return { isBlocked: false, isOverridden: false };
}
