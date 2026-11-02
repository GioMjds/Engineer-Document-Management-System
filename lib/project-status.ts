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
  '26002': {
    projectCode: '26002',
    architecture: {
      status: 'Approved',
      updatedBy: 'Liam Thorne (Architectural Engineer)',
      updatedAt: '2026-10-22T09:00:00Z',
      remarks:
        'Commercial pavilion elevations and statutory zoning verified with Nakheel/Trakhees.',
    },
    structure: {
      status: 'In Progress',
      updatedBy: 'David Chen (Structural Engineer)',
      updatedAt: '2026-10-22T14:15:00Z',
      remarks:
        'Substructure design package ready for Trakhees CED review.',
    },
    mep: {
      status: 'In Progress',
      updatedBy: 'Omar Farooq (MEP Engineer)',
      updatedAt: '2026-10-22T11:00:00Z',
      remarks:
        'DEWA substations schematics and electrical load schedule synchronized.',
    },
    authorities: {
      designStage: 'In Progress',
      constructionStage: 'Not Started',
      revisionStage: 'Not Started',
      updatedBy: 'Zayed Al-Hashimi (Statutory Liaison)',
      updatedAt: '2026-10-22T16:00:00Z',
    },
    specialists: [
      {
        id: 'spec-26002-1',
        type: 'Topographical',
        fileName: 'TOPO-SURVEY-DH-26002.pdf',
        fileSize: '4.8 MB',
        uploadedBy: 'Aisha Al-Nuaimi (Civil Engineer)',
        uploadedAt: '2026-10-15T08:00:00Z',
        status: 'Approved',
      },
      {
        id: 'spec-26002-2',
        type: 'Geotechnical',
        fileName: 'SOIL-INVESTIGATION-26002.pdf',
        fileSize: '6.2 MB',
        uploadedBy: 'David Chen (Structural Engineer)',
        uploadedAt: '2026-10-16T12:00:00Z',
        status: 'Approved',
      },
      {
        id: 'spec-26002-3',
        type: 'Traffic Impact Study',
        fileName: 'TIS-REPORT-DH-26002.pdf',
        fileSize: '12.4 MB',
        uploadedBy: 'Liam Thorne (Architectural Engineer)',
        uploadedAt: '2026-10-18T10:00:00Z',
        status: 'Uploaded',
      },
      {
        id: 'spec-26002-4',
        type: 'Green Building',
        fileName: 'ALSAFAT-COMPLIANCE-26002.pdf',
        fileSize: '3.9 MB',
        uploadedBy: 'Omar Farooq (MEP Engineer)',
        uploadedAt: '2026-10-19T14:00:00Z',
        status: 'Uploaded',
      },
      {
        id: 'spec-26002-5',
        type: 'Vertical Transportation',
        status: 'Pending',
      },
    ],
  },
  '26001': {
    projectCode: '26001',
    architecture: {
      status: 'Approved',
      updatedBy: 'Liam Thorne (Architectural Engineer)',
      updatedAt: '2026-10-20T10:00:00Z',
      remarks:
        'Concept drawings and affection plans aligned with master authority.',
    },
    structure: {
      status: 'In Progress',
      updatedBy: 'David Chen (Structural Engineer)',
      updatedAt: '2026-10-21T15:30:00Z',
      remarks:
        'Superstructure calculation model undergoing internal review.',
    },
    mep: {
      status: 'In Progress',
      updatedBy: 'Kavita Sharma (Senior MEP Engineer)',
      updatedAt: '2026-10-21T11:20:00Z',
      remarks:
        'Single-line diagrams and water supply connection drawings prepared.',
    },
    authorities: {
      designStage: 'In Progress',
      constructionStage: 'Not Started',
      revisionStage: 'Not Started',
      updatedBy: 'Zayed Al-Hashimi (Statutory Liaison)',
      updatedAt: '2026-10-22T08:00:00Z',
    },
    specialists: [
      {
        id: 'spec-26001-1',
        type: 'Topographical',
        status: 'Approved',
      },
      {
        id: 'spec-26001-2',
        type: 'Geotechnical',
        status: 'Approved',
      },
      {
        id: 'spec-26001-3',
        type: 'Traffic Impact Study',
        status: 'Pending',
      },
      {
        id: 'spec-26001-4',
        type: 'Green Building',
        status: 'Pending',
      },
      {
        id: 'spec-26001-5',
        type: 'Vertical Transportation',
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

