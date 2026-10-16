import { ProjectLifecycleStage, StageMilestoneDates } from "@/types/noc";

export function formatSize(bytes: number | null) {
  if (!bytes) return '-';
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Format dates as DD Mon YYYY for engineering documentation.
export function formatMilestoneDate(dateStr?: string): string | null {
  if (!dateStr) return null;
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    }
  }
  return dateStr;
}

// Resolve primary milestone target date for a given lifecycle stage.
export function getStageMilestoneDate(
  stage: ProjectLifecycleStage,
  milestones?: StageMilestoneDates,
): string | undefined {
  if (!milestones) return undefined;
  switch (stage) {
    case 'Pre-Construction':
      return (
        milestones.preConstruction?.buildingPermitDate ||
        milestones.preConstruction?.conceptApprovalDate ||
        milestones.preConstruction?.plannedCompletionDate ||
        milestones.preConstruction?.commencementDate ||
        milestones.preConstruction?.surveyCompletionDate ||
        milestones.preConstruction?.kickoffDate
      );
    case 'Construction':
      return (
        milestones.construction?.targetCompletionDate ||
        milestones.construction?.commencementDate
      );
    case 'Handover':
      return (
        milestones.handover?.bccIssuanceDate ||
        milestones.handover?.civilDefenceInspectionDate ||
        milestones.handover?.commissioningDate ||
        (milestones.handover as Record<string, string | undefined>)
          ?.targetCompletionDate
      );
  }
}

// Format numeric values as UAE Dirhams (AED) currency string.
export function formatCurrencyAED(amount?: number | null): string {
  if (amount == null) return 'AED 0';
  return new Intl.NumberFormat('en-AE', {
    style: 'currency',
    currency: 'AED',
    maximumFractionDigits: 0,
  }).format(amount);
}