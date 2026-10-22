import type {
  AssignedProject,
  ProjectNocItem,
  ProjectDisciplineStatus,
  ProjectLifecycleStage,
  StageGateReadiness,
  StageGatePrerequisiteItem,
  StageMilestoneDates,
} from '@/types/noc';

export const INITIAL_PROJECT_MILESTONES: Record<string, StageMilestoneDates> = {
  '23015': {
    preConstruction: {
      kickoffDate: '2026-03-01',
      surveyCompletionDate: '2026-04-15',
      conceptApprovalDate: '2026-05-10',
      commencementDate: '2026-06-01',
      plannedCompletionDate: '2026-11-15',
    },
    construction: {
      commencementDate: '2026-12-01',
      targetCompletionDate: '2027-12-15',
    },
    handover: {
      targetCompletionDate: '2028-03-30',
    },
  },
  '23016': {
    preConstruction: {
      kickoffDate: '2026-01-10',
      surveyCompletionDate: '2026-02-28',
      conceptApprovalDate: '2026-04-05',
      commencementDate: '2026-04-15',
      plannedCompletionDate: '2026-08-10',
      buildingPermitDate: '2026-08-15',
    },
    construction: {
      commencementDate: '2026-09-01',
      targetCompletionDate: '2027-12-30',
    },
    handover: {
      commissioningDate: '2028-01-15',
    },
  },
};

export function getNextLifecycleStage(
  current: ProjectLifecycleStage,
): ProjectLifecycleStage | 'Completed' {
  switch (current) {
    case 'Pre-Construction':
      return 'Construction';
    case 'Construction':
      return 'Handover';
    case 'Handover':
      return 'Completed';
  }
}

export function canUserAdvanceStage(role: string): boolean {
  const normalized = role.toLowerCase().replace(/[\s-]/g, '_');
  return (
    normalized === 'admin' ||
    normalized === 'area_manager' ||
    normalized === 'resident_engineer'
  );
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (
    typeof globalThis !== 'undefined' &&
    (globalThis as unknown as { localStorage?: Storage }).localStorage
  ) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return null;
}

export function canUserModifyMilestones(role: string): boolean {
  return canUserAdvanceStage(role);
}

export function getStoredProjectMilestones(
  code: string,
  fallback?: StageMilestoneDates,
): StageMilestoneDates {
  const defaultMilestones = fallback || INITIAL_PROJECT_MILESTONES[code] || {};
  const storage = getStorage();
  if (!storage) return defaultMilestones;
  try {
    const raw = storage.getItem(`cvtec_project_milestones_${code}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return defaultMilestones;
}

export function saveStoredProjectMilestones(
  code: string,
  milestones: StageMilestoneDates,
): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      `cvtec_project_milestones_${code}`,
      JSON.stringify(milestones),
    );
  } catch {
    // ignore
  }
}

export function getStoredProjectStage(
  code: string,
  fallback: ProjectLifecycleStage,
): ProjectLifecycleStage {
  const storage = getStorage();
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(`cvtec_project_stage_${code}`);
    if (
      raw === 'Pre-Construction' ||
      raw === 'Construction' ||
      raw === 'Handover'
    ) {
      return raw;
    }
  } catch {
    // fallback
  }
  return fallback;
}

export function saveStoredProjectStage(
  code: string,
  stage: ProjectLifecycleStage,
): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(`cvtec_project_stage_${code}`, stage);
  } catch {
    // ignore
  }
}


export function evaluateStageGateReadiness(
  project: AssignedProject,
  allNocs: ProjectNocItem[],
  disciplineStatus?: ProjectDisciplineStatus,
): StageGateReadiness {
  const currentStage = (project.lifecycleStage ||
    'Pre-Construction') as ProjectLifecycleStage;
  const nextStage = getNextLifecycleStage(currentStage);
  const projectNocs = allNocs.filter((n) => n.projectCode === project.code);
  const milestones =
    project.milestones || INITIAL_PROJECT_MILESTONES[project.code] || {};

  const prerequisites: StageGatePrerequisiteItem[] = [];

  if (currentStage === 'Pre-Construction') {
    const topo = disciplineStatus?.specialists.find(
      (s) => s.type === 'Topographical',
    );
    prerequisites.push({
      id: 'gate-topo',
      title: 'Topographical Affection Survey Completed',
      category: 'specialist_study',
      isSatisfied: topo?.status === 'Approved' || topo?.status === 'Uploaded',
      sourceReference: topo?.fileName,
      mandatoryForNextStage: true,
    });

    const geotech = disciplineStatus?.specialists.find(
      (s) => s.type === 'Geotechnical',
    );
    prerequisites.push({
      id: 'gate-geotech',
      title: 'Geotechnical Soil Investigation Approved',
      category: 'specialist_study',
      isSatisfied: geotech?.status === 'Approved',
      sourceReference: geotech?.fileName,
      mandatoryForNextStage: true,
    });

    prerequisites.push({
      id: 'gate-concept',
      title: 'Concept Master Plan & Affection Sign-Off',
      category: 'regulatory_milestone',
      isSatisfied: Boolean(milestones.preConstruction?.conceptApprovalDate),
      sourceReference: milestones.preConstruction?.conceptApprovalDate,
      mandatoryForNextStage: true,
    });

    const dewa = projectNocs.find(
      (n) => n.reviewingAuthority === 'DEWA' && (n.stage === 'Design NOC' || n.stage === 'Information NOC'),
    );
    prerequisites.push({
      id: 'gate-dewa',
      title: 'DEWA Substation & Electrical Load NOC',
      category: 'authority_noc',
      isSatisfied: dewa?.status === 'Approved',
      sourceReference: dewa?.referenceNumber,
      mandatoryForNextStage: true,
    });

    const rtaOrTis = projectNocs.find((n) => n.reviewingAuthority === 'RTA');
    prerequisites.push({
      id: 'gate-rta',
      title: 'RTA Traffic Impact & Right-of-Way Permit',
      category: 'authority_noc',
      isSatisfied: rtaOrTis?.status === 'Approved',
      sourceReference: rtaOrTis?.referenceNumber,
      mandatoryForNextStage: true,
    });

    const structural = projectNocs.find(
      (n) =>
        n.description.toLowerCase().includes('structural') ||
        n.reviewingAuthority === 'Trakhees',
    );
    prerequisites.push({
      id: 'gate-struct',
      title: 'Master Authority Structural Engineering NOC',
      category: 'authority_noc',
      isSatisfied: structural?.status === 'Approved',
      sourceReference: structural?.referenceNumber,
      mandatoryForNextStage: true,
    });

    prerequisites.push({
      id: 'gate-permit',
      title: 'Official Building Permit Issuance',
      category: 'regulatory_milestone',
      isSatisfied: Boolean(milestones.preConstruction?.buildingPermitDate),
      sourceReference:
        milestones.preConstruction?.buildingPermitDate || 'Pending Issuance',
      mandatoryForNextStage: true,
    });
  } else if (currentStage === 'Construction') {
    const tempPower = projectNocs.find(
      (n) => n.stage === 'Construction NOC' && n.reviewingAuthority === 'DEWA',
    );
    prerequisites.push({
      id: 'gate-temp-power',
      title: 'Site Temporary Power & Dewatering NOC',
      category: 'authority_noc',
      isSatisfied: tempPower?.status === 'Approved',
      sourceReference: tempPower?.referenceNumber,
      mandatoryForNextStage: true,
    });

    const structStatus = disciplineStatus?.structure.status;
    prerequisites.push({
      id: 'gate-superstructure',
      title: 'Core & Structural Superstructure Inspection',
      category: 'regulatory_milestone',
      isSatisfied:
        structStatus === 'Approved' || structStatus === 'Client Approval',
      sourceReference: disciplineStatus?.structure.updatedBy,
      mandatoryForNextStage: true,
    });

    prerequisites.push({
      id: 'gate-mep-submittal',
      title: 'MEP Riser & Chilled Water Commissioning Sign-off',
      category: 'regulatory_milestone',
      isSatisfied:
        disciplineStatus?.mep.status === 'Approved' ||
        disciplineStatus?.mep.status === 'Client Approval',
      sourceReference: disciplineStatus?.mep.updatedBy,
      mandatoryForNextStage: false,
    });
  } else {
    // Handover Stage
    const dcd = projectNocs.find(
      (n) => n.reviewingAuthority === 'DCD' || n.stage === 'Handover NOC',
    );
    prerequisites.push({
      id: 'gate-dcd',
      title: 'Civil Defence (DCD) Fire & Life Safety Clearance',
      category: 'authority_noc',
      isSatisfied: dwaApproved(dcd),
      sourceReference: dcd?.referenceNumber || 'Pending DCD Inspection',
      mandatoryForNextStage: true,
    });

    prerequisites.push({
      id: 'gate-bcc',
      title: 'Building Completion Certificate (BCC)',
      category: 'regulatory_milestone',
      isSatisfied: Boolean(milestones.handover?.bccIssuanceDate),
      sourceReference:
        milestones.handover?.bccIssuanceDate || 'Pending Authority Inspection',
      mandatoryForNextStage: true,
    });
  }

  const satisfiedCount = prerequisites.filter((p) => p.isSatisfied).length;
  const totalCount = prerequisites.length;
  const percentage =
    totalCount > 0 ? Math.round((satisfiedCount / totalCount) * 100) : 100;
  const mandatorySatisfied = prerequisites
    .filter((p) => p.mandatoryForNextStage)
    .every((p) => p.isSatisfied);

  return {
    stage: currentStage,
    nextStage,
    totalPrerequisites: totalCount,
    satisfiedPrerequisites: satisfiedCount,
    readinessPercentage: percentage,
    isGateReady: mandatorySatisfied,
    prerequisites,
  };
}

function dwaApproved(noc?: ProjectNocItem): boolean {
  return noc?.status === 'Approved';
}
