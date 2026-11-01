import type {
  ProjectDisciplineStatus,
  ProjectNocItem,
  AssignedProject,
  SubmittalDelayItem,
} from '@/types/noc';

export const INITIAL_PROJECT_DISCIPLINE_STATUS: Record<
  string,
  ProjectDisciplineStatus
> = {
  '23016': {
    projectCode: '23016',
    architecture: {
      status: 'Under Review',
      updatedBy: 'Engr. Abram',
      updatedAt: '2026-09-28T09:30:00Z',
      remarks:
        'Core wall thickness and elevator shaft clearances updated for DDA code compliance.',
    },
    structure: {
      status: 'In Progress',
      updatedBy: 'Engr. Khalid',
      updatedAt: '2026-09-29T14:15:00Z',
      remarks:
        'Raft foundation concrete volume calculation in progress; awaiting soil report sign-off.',
    },
    mep: {
      status: 'Client Approval',
      updatedBy: 'Engr. Hisham',
      updatedAt: '2026-09-27T11:00:00Z',
      remarks:
        'HVAC chilled water riser duct schematic submitted for client approval.',
    },
    authorities: {
      designStage: 'Approved',
      constructionStage: 'In Progress',
      revisionStage: 'Not Started',
      updatedBy: 'Engr. Rasha',
      updatedAt: '2026-09-25T16:00:00Z',
    },
    specialists: [
      {
        id: 'spec-23016-1',
        type: 'Traffic Impact Study',
        fileName: 'TIS-FINAL-APPROVED.pdf',
        fileSize: '14.2 MB',
        uploadedBy: 'Specialist Consultant',
        uploadedAt: '2026-09-01T10:00:00Z',
        status: 'Approved',
      },
      {
        id: 'spec-23016-2',
        type: 'Geotechnical',
        fileName: 'SOIL-INVESTIGATION-R01.pdf',
        fileSize: '8.7 MB',
        uploadedBy: 'Engr. Khalid',
        uploadedAt: '2026-08-20T12:00:00Z',
        status: 'Approved',
      },
      {
        id: 'spec-23016-3',
        type: 'Vertical Transportation',
        fileName: 'ELEVATOR-TRAFFIC-ANALYSIS.pdf',
        fileSize: '4.1 MB',
        uploadedBy: 'Engr. Abram',
        uploadedAt: '2026-09-18T15:30:00Z',
        status: 'Uploaded',
      },
      {
        id: 'spec-23016-4',
        type: 'Green Building',
        fileName: 'ALSAFAT-ENERGY-SIM.pdf',
        fileSize: '11.5 MB',
        uploadedBy: 'Engr. Rasha',
        uploadedAt: '2026-08-20T11:00:00Z',
        status: 'Approved',
      },
      {
        id: 'spec-23016-5',
        type: 'Topographical',
        status: 'Pending',
      },
    ],
  },
  '23015': {
    projectCode: '23015',
    architecture: {
      status: 'Approved',
      updatedBy: 'Engr. Adel',
      updatedAt: '2026-09-15T10:00:00Z',
      remarks:
        'Concept elevations and plot affection plan confirmed with Nakheel.',
    },
    structure: {
      status: 'Approved',
      updatedBy: 'Engr. Khalid',
      updatedAt: '2026-09-20T16:45:00Z',
      remarks: 'Trakhees CED Structural calculation model fully approved.',
    },
    mep: {
      status: 'In Progress',
      updatedBy: 'Engr. Al Ashqar',
      updatedAt: '2026-09-28T13:20:00Z',
      remarks:
        'Temporary site power single line diagram prepared for DEWA contractor submission.',
    },
    authorities: {
      designStage: 'Approved',
      constructionStage: 'Not Started',
      revisionStage: 'Not Started',
      updatedBy: 'Engr. Rasha',
      updatedAt: '2026-09-22T09:00:00Z',
    },
    specialists: [
      {
        id: 'spec-23015-1',
        type: 'Topographical',
        fileName: 'TOPO-SURVEY-FROND-N.pdf',
        fileSize: '5.6 MB',
        uploadedBy: 'Engr. Ismail',
        uploadedAt: '2026-06-15T08:00:00Z',
        status: 'Approved',
      },
      {
        id: 'spec-23015-2',
        type: 'Green Building',
        fileName: 'GREEN-VILLA-SPECS.pdf',
        fileSize: '3.2 MB',
        uploadedBy: 'Engr. Adel',
        uploadedAt: '2026-07-10T14:00:00Z',
        status: 'Uploaded',
      },
      {
        id: 'spec-23015-3',
        type: 'Traffic Impact Study',
        status: 'Pending',
      },
      {
        id: 'spec-23015-4',
        type: 'Vertical Transportation',
        status: 'Pending',
      },
      {
        id: 'spec-23015-5',
        type: 'Geotechnical',
        status: 'Pending',
      },
    ],
  },
} satisfies Record<string, ProjectDisciplineStatus>;

export function calculateSubmittalDelays(
  allNocs: ProjectNocItem[],
  projects: AssignedProject[],
): SubmittalDelayItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const delayItems: SubmittalDelayItem[] = [];

  for (const noc of allNocs) {
    if (noc.status === 'Approved' || noc.status === 'Not Needed') {
      continue;
    }

    const project = projects.find((p) => p.code === noc.projectCode);
    const projectName = project ? project.name : `Project ${noc.projectCode}`;

    if (!noc.applyDate && noc.planDate) {
      const plan = new Date(noc.planDate);
      plan.setHours(0, 0, 0, 0);
      const diffMs = today.getTime() - plan.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (days > 0) {
        delayItems.push({
          nocId: noc.id,
          projectCode: noc.projectCode,
          projectName,
          description: noc.description,
          reviewingAuthority: noc.reviewingAuthority,
          planDate: noc.planDate,
          applyDate: null,
          daysDelayed: days,
          planDelayDays: days,
          delayType: 'Unsubmitted Delay',
        });
      }
    } else if (noc.applyDate && !noc.issuanceDate) {
      const applied = new Date(noc.applyDate);
      applied.setHours(0, 0, 0, 0);
      const diffMs = today.getTime() - applied.getTime();
      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      let planDelayDays = 0;
      if (noc.planDate) {
        const plan = new Date(noc.planDate);
        plan.setHours(0, 0, 0, 0);
        const planDiffMs = applied.getTime() - plan.getTime();
        planDelayDays = Math.max(0, Math.floor(planDiffMs / (1000 * 60 * 60 * 24)));
      }

      if (days >= 0) {
        delayItems.push({
          nocId: noc.id,
          projectCode: noc.projectCode,
          projectName,
          description: noc.description,
          reviewingAuthority: noc.reviewingAuthority,
          planDate: noc.planDate,
          applyDate: noc.applyDate,
          daysDelayed: days,
          planDelayDays,
          delayType: 'Pending Authority Review',
        });
      }
    }
  }

  return delayItems.sort((a, b) => b.daysDelayed - a.daysDelayed);
}

export function canUserEditDiscipline(
  role: string,
  discipline: 'architecture' | 'structure' | 'mep' | 'authorities',
): boolean {
  const normalized = role.toLowerCase().replace(/[\s-]/g, '_');

  if (normalized === 'admin') return true;

  switch (discipline) {
    case 'architecture':
      return (
        normalized === 'architect_engineer' ||
        normalized === 'architect' ||
        normalized === 'architectural_engineer'
      );
    case 'structure':
      return (
        normalized === 'structure_engineer' ||
        normalized === 'structural_engineer' ||
        normalized === 'civil_engineer'
      );
    case 'mep':
      return normalized === 'mep_engineer' || normalized === 'mep';
    case 'authorities':
      return (
        normalized === 'authority_engineer' ||
        normalized === 'authority' ||
        normalized === 'doc_controller' ||
        normalized === 'dc'
      );
    default:
      return false;
  }
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      return window.localStorage;
    } catch {
      return null;
    }
  }
  if (
    typeof window === 'undefined' &&
    typeof globalThis !== 'undefined' &&
    (globalThis as unknown as { localStorage?: Storage }).localStorage
  ) {
    return (globalThis as unknown as { localStorage: Storage }).localStorage;
  }
  return null;
}

export function getStoredDisciplineStatus(
  code: string,
  fallback?: ProjectDisciplineStatus,
): ProjectDisciplineStatus | undefined {
  const defaultStatus = fallback || INITIAL_PROJECT_DISCIPLINE_STATUS[code];
  const storage = getStorage();
  if (!storage) return defaultStatus;
  try {
    const raw = storage.getItem(`cvtec_discipline_status_${code}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    }
  } catch {
    // fallback
  }
  return defaultStatus;
}

export function saveStoredDisciplineStatus(
  code: string,
  status: ProjectDisciplineStatus,
): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(
      `cvtec_discipline_status_${code}`,
      JSON.stringify(status),
    );
  } catch {
    // ignore
  }
}

