import type { AssignedProject, ProjectNocItem } from '@/types/noc';

export const SEED_PROJECTS: AssignedProject[] = [
  {
    code: '26001',
    name: 'Al Wasl Residential Tower Phase 2',
    masterAuthority: 'Nakheel and Trakhees',
    projectType: 'Commercial & Residential',
    location: 'Dubai, UAE',
    contractType: 'Design & Supervision',
    contractorName: 'Arabian Construction Co.',
    clientContractorAmount: 45000000,
    clientConsultantAmount: 3200000,
    currentStage: 'Pre-Construction',
    lifecycleStage: 'Pre-Construction',
    assignedRoles: {
      authorityEngineer: 'Zayed Al-Hashimi (Statutory Liaison)',
      architectEngineer: 'Liam Thorne (Architectural Engineer)',
      mepEngineer: 'Kavita Sharma (Senior MEP Engineer)',
      structureEngineer: 'David Chen (Structural Engineer)',
      civilEngineer: 'Aisha Al-Nuaimi (Civil Engineer)',
      residentEngineer: 'Resident Engineer Lead',
      areaManager: 'Hassan Al-Maktoum (Operations Area Manager)',
      docController: 'Principal Document Controller',
    },
  },
  {
    code: '26002',
    name: 'Dubai Hills Commercial Pavilion',
    masterAuthority: 'Nakheel and Trakhees',
    projectType: 'Commercial',
    location: 'Dubai Hills Estate, Dubai',
    contractType: 'Design & Supervision',
    contractorName: 'Al Futtaim Construction',
    clientContractorAmount: 28000000,
    clientConsultantAmount: 2100000,
    currentStage: 'Pre-Construction',
    lifecycleStage: 'Pre-Construction',
    assignedRoles: {
      authorityEngineer: 'Zayed Al-Hashimi (Statutory Liaison)',
      architectEngineer: 'Liam Thorne (Architectural Engineer)',
      mepEngineer: 'Omar Farooq (MEP Engineer)',
      structureEngineer: 'David Chen (Structural Engineer)',
      civilEngineer: 'Aisha Al-Nuaimi (Civil Engineer)',
      residentEngineer: 'Resident Engineer Lead',
      areaManager: 'Hassan Al-Maktoum (Operations Area Manager)',
      docController: 'Principal Document Controller',
    },
  },
];

export const INITIAL_NOCS_PROJECT_26001: ProjectNocItem[] = [
  {
    id: 'noc-26001-01',
    projectCode: '26001',
    sequenceNumber: 1,
    stage: 'Design NOC',
    reviewingAuthority: 'DEWA',
    description: 'DEWA Substation & Electrical Load NOC',
    submittedBy: 'Consultant',
    referenceNumber: '',
    status: 'Not Started',
    paymentFee: 15000,
    isPaid: false,
    planDate: '2026-10-25',
    applyDate: null,
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: null,
    requirements: [
      { id: 'req-26001-1', title: 'Electrical Load Schedule', isSatisfied: false },
      { id: 'req-26001-2', title: 'Substation & Main Electrical Incomer Layout (MEP-E-101)', isSatisfied: false, fileName: 'MEP-E-101' },
      { id: 'req-26001-3', title: 'Consultant NOC Authorization Letter', isSatisfied: false },
    ],
    revision: 'R00',
    updatedAt: '2026-10-22T08:00:00Z',
  },
  {
    id: 'noc-26001-02',
    projectCode: '26001',
    sequenceNumber: 2,
    stage: 'Design NOC',
    reviewingAuthority: 'RTA',
    description: 'RTA Traffic Impact & Right-of-Way Permit',
    submittedBy: 'Specialists',
    referenceNumber: '',
    status: 'Not Started',
    paymentFee: 5000,
    isPaid: false,
    planDate: '2026-10-28',
    applyDate: null,
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 1,
    blockingSequenceDescription: 'Requires DEWA Substation NOC approval',
    requirements: [
      { id: 'req-26001-4', title: 'Traffic Impact Study Report', isSatisfied: false },
      { id: 'req-26001-5', title: 'Road Tie-in & Access Layout', isSatisfied: false },
      { id: 'req-26001-6', title: 'Master Concept Plan & Elevations (ARC-P-001)', isSatisfied: false, fileName: 'ARC-P-001' },
    ],
    revision: 'R00',
    updatedAt: '2026-10-22T08:00:00Z',
  },
  {
    id: 'noc-26001-03',
    projectCode: '26001',
    sequenceNumber: 3,
    stage: 'Design NOC',
    reviewingAuthority: 'Trakhees',
    description: 'Master Authority Structural Engineering NOC',
    submittedBy: 'Consultant',
    referenceNumber: '',
    status: 'Not Started',
    paymentFee: 25000,
    isPaid: false,
    planDate: '2026-11-05',
    applyDate: null,
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 2,
    blockingSequenceDescription: 'Requires RTA Right of Way clearance',
    requirements: [
      { id: 'req-26001-7', title: 'Geotechnical Soil Investigation Report', isSatisfied: false, fileName: 'CAD-E-002' },
      { id: 'req-26001-8', title: 'Structural Design Calculations & Foundation Drawings', isSatisfied: false },
      { id: 'req-26001-9', title: 'Boundary Affection Survey Coordinates (CAD-E-001)', isSatisfied: false, fileName: 'CAD-E-001' },
    ],
    revision: 'R00',
    updatedAt: '2026-10-22T08:00:00Z',
  },
  {
    id: 'noc-26001-04',
    projectCode: '26001',
    sequenceNumber: 4,
    stage: 'Construction NOC',
    reviewingAuthority: 'DEWA',
    description: 'Site Temporary Power & Dewatering NOC',
    submittedBy: 'Contractor',
    referenceNumber: '',
    status: 'Not Started',
    paymentFee: 3500,
    isPaid: false,
    planDate: '2026-11-20',
    applyDate: null,
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 3,
    blockingSequenceDescription: 'Requires Master Authority Structural NOC approval',
    requirements: [
      { id: 'req-26001-10', title: 'Site Dewatering Discharge Scheme', isSatisfied: false },
      { id: 'req-26001-11', title: 'Contractor Temporary Power Connection Demand', isSatisfied: false },
    ],
    revision: 'R00',
    updatedAt: '2026-10-22T08:00:00Z',
  },
  {
    id: 'noc-26001-05',
    projectCode: '26001',
    sequenceNumber: 5,
    stage: 'Construction NOC',
    reviewingAuthority: 'Trakhees',
    description: 'Core & Structural Superstructure Inspection NOC',
    submittedBy: 'Consultant',
    referenceNumber: '',
    status: 'Not Started',
    paymentFee: 12000,
    isPaid: false,
    planDate: '2027-01-15',
    applyDate: null,
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 4,
    blockingSequenceDescription: 'Requires Temporary Power & Site Mobilization NOC',
    requirements: [
      { id: 'req-26001-12', title: 'Superstructure Concrete Pour Inspection Records', isSatisfied: false },
      { id: 'req-26001-13', title: 'Third-Party Steel Core Ultrasonic Testing Report', isSatisfied: false },
    ],
    revision: 'R00',
    updatedAt: '2026-10-22T08:00:00Z',
  },
  {
    id: 'noc-26001-06',
    projectCode: '26001',
    sequenceNumber: 6,
    stage: 'Handover NOC',
    reviewingAuthority: 'DCD',
    description: 'Final Civil Defence (DCD) Inspection & BCC NOC',
    submittedBy: 'Consultant',
    referenceNumber: '',
    status: 'Not Started',
    paymentFee: 7500,
    isPaid: false,
    planDate: '2027-06-30',
    applyDate: null,
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 5,
    blockingSequenceDescription: 'Requires Superstructure Completion',
    requirements: [
      { id: 'req-26001-14', title: 'As-Built Fire Protection & Smoke Extraction Certificate', isSatisfied: false },
      { id: 'req-26001-15', title: 'Civil Defence Site Completion Audit Sign-off', isSatisfied: false },
    ],
    revision: 'R00',
    updatedAt: '2026-10-22T08:00:00Z',
  },
];

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
