import type { AssignedProject, ProjectNocItem } from '@/types/noc';

export const SEED_PROJECTS: AssignedProject[] = [
  {
    code: '23015',
    name: 'Palm Jumeirah Luxury Villa Development',
    masterAuthority: 'Nakheel and Trakhees',
    projectType: 'Residential',
    location: 'Palm Jumeirah, Frond N',
    contractType: 'Design & Supervision',
    contractorName: 'Arabian Construction Co.',
    clientContractorAmount: 45000000,
    clientConsultantAmount: 3200000,
    currentStage: 'Pre-Construction',
    lifecycleStage: 'Pre-Construction',
    assignedRoles: {
      authorityEngineer: 'Engr. Rasha',
      architectEngineer: 'Engr. Adel',
      mepEngineer: 'Engr. Al Ashqar',
      structureEngineer: 'Engr. Khalid',
      civilEngineer: 'Engr. Ismail',
      residentEngineer: 'Engr. Abdel',
      areaManager: 'Engr. Ahmad',
      docController: 'Ms. Jalilah',
    },
  },
  {
    code: '23016',
    name: 'Al Wasl Mixed-Use Commercial Tower',
    masterAuthority: 'Dubai Development Authority',
    projectType: 'Commercial',
    location: 'Al Kifaf, Dubai',
    contractType: 'Supervision',
    contractorName: 'Al Naboodah Construction',
    clientContractorAmount: 120000000,
    clientConsultantAmount: 8500000,
    currentStage: 'Construction(supervision)',
    lifecycleStage: 'Construction',
    assignedRoles: {
      authorityEngineer: 'Engr. Rasha',
      architectEngineer: 'Engr. Abram',
      mepEngineer: 'Engr. Hisham',
      structureEngineer: 'Engr. Khalid',
      civilEngineer: 'Engr. Ismail',
      residentEngineer: 'Engr. Abdel',
      areaManager: 'Engr. Ahmad',
      docController: 'Ms. Jalilah',
    },
  },
];

export const INITIAL_NOCS_PROJECT_23016: ProjectNocItem[] = [
  {
    id: 'noc-23016-01',
    projectCode: '23016',
    sequenceNumber: 1,
    stage: 'Design NOC',
    reviewingAuthority: 'DEWA',
    description: 'Electricity Substation & Water Connection NOC',
    submittedBy: 'Consultant',
    referenceNumber: 'DEWA-2023-9981',
    status: 'Approved',
    paymentFee: 3500,
    isPaid: true,
    payerType: 'client',
    receiptFileUrl: 'RCP-2026-9981',
    planDate: '2026-07-15',
    applyDate: '2026-07-20',
    issuanceDate: '2026-08-10',
    expiryDate: '2027-08-10',
    blockingSequenceNumber: null,
    requirements: [
      { id: 'req-1', title: 'Electrical Load Schedule', isSatisfied: true, fileName: 'LOAD-CALC-R00.pdf' },
      { id: 'req-2', title: 'Substation Architectural Layout', isSatisfied: true, fileName: 'SUBSTATION-LAYOUT.dwg' },
      { id: 'req-3', title: 'Consultant NOC Authorization Letter', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-08-10T10:00:00Z',
  },
  {
    id: 'noc-23016-02',
    projectCode: '23016',
    sequenceNumber: 2,
    stage: 'Design NOC',
    reviewingAuthority: 'RTA',
    description: 'Traffic Impact Study & Right of Way Access Permit',
    submittedBy: 'Specialists',
    referenceNumber: 'RTA-ROW-2023-044',
    status: 'Approved',
    paymentFee: 5000,
    isPaid: true,
    payerType: 'contractor',
    receiptFileUrl: 'RTA-RCP-2023-044',
    planDate: '2026-08-01',
    applyDate: '2026-08-05',
    issuanceDate: '2026-09-01',
    expiryDate: '2026-10-04', // Expiring in 5 days
    blockingSequenceNumber: 1,
    blockingSequenceDescription: 'Requires DEWA Substation NOC approval',
    requirements: [
      { id: 'req-4', title: 'Detailed Traffic Impact Study (TIS)', isSatisfied: true, fileName: 'TIS-FINAL-APPROVED.pdf' },
      { id: 'req-5', title: 'Site Ingress and Egress CAD Drawings', isSatisfied: true },
      { id: 'req-6', title: 'DEWA Substation Access Clearance', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-09-01T12:00:00Z',
  },
  {
    id: 'noc-23016-03',
    projectCode: '23016',
    sequenceNumber: 3,
    stage: 'Design NOC',
    reviewingAuthority: 'DCD',
    description: 'Civil Defence Life Safety & Fire Prevention Review',
    submittedBy: 'Consultant',
    referenceNumber: 'DCD-FS-23-8812',
    status: 'Rejected',
    paymentFee: 4200,
    isPaid: true,
    payerType: 'consultant_advance',
    receiptFileUrl: 'DCD-ADV-RCP-8812',
    planDate: '2026-08-20',
    applyDate: '2026-08-25',
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 1,
    blockingSequenceDescription: 'Requires DEWA Connection Approval',
    rejectionReason: 'Emergency egress stairwell pressurization calculation fails UAE Fire and Life Safety Code Table 4.2. Update calculations and resubmit drawings.',
    requirements: [
      { id: 'req-7', title: 'Fire Alarm & Sprinkler Layout Plan', isSatisfied: true, fileName: 'FA-SPR-DWG.dwg' },
      { id: 'req-8', title: 'Staircase Pressurization Calculations', isSatisfied: false },
      { id: 'req-9', title: 'Civil Defence Material Approval Certificates', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-09-15T14:30:00Z',
  },
  {
    id: 'noc-23016-04',
    projectCode: '23016',
    sequenceNumber: 4,
    stage: 'Design NOC',
    reviewingAuthority: 'Etisalat',
    description: 'Telecom Infrastructure & Fiber Entry Route NOC',
    submittedBy: 'Contractor',
    referenceNumber: 'ETISALAT-CIV-2023-77',
    status: 'Pending for Payment',
    paymentFee: 2100,
    isPaid: false,
    planDate: '2026-09-05',
    applyDate: '2026-09-12',
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 2,
    blockingSequenceDescription: 'Requires RTA Right of Way Access Approval',
    requirements: [
      { id: 'req-10', title: 'Telecom Duct Route Drawing', isSatisfied: true, fileName: 'DUCT-PLAN.dwg' },
      { id: 'req-11', title: 'Server Room Specification Sheet', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-09-20T09:15:00Z',
  },
  {
    id: 'noc-23016-05',
    projectCode: '23016',
    sequenceNumber: 5,
    stage: 'Construction NOC',
    reviewingAuthority: 'DDA',
    description: 'Final Building Permit for Deep Shoring & Excavation',
    submittedBy: 'Consultant',
    referenceNumber: 'DDA-SHORING-2023-11',
    status: 'Not Started',
    paymentFee: 12500,
    isPaid: false,
    planDate: '2026-10-15',
    applyDate: null,
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 3,
    blockingSequenceDescription: 'Hard blocked: Requires DCD Life Safety Approval and RTA clearance',
    requirements: [
      { id: 'req-12', title: 'Geotechnical Soil Investigation Report', isSatisfied: true, fileName: 'GEOTECH-REPORT.pdf' },
      { id: 'req-13', title: 'Shoring & Piling Design Calculations', isSatisfied: false },
      { id: 'req-14', title: 'Contractor Safety Plan & DM Approval', isSatisfied: false },
    ],
    revision: 'R00',
    updatedAt: '2026-09-01T08:00:00Z',
  },
  {
    id: 'noc-23016-06',
    projectCode: '23016',
    sequenceNumber: 6,
    stage: 'Construction NOC',
    reviewingAuthority: 'EHS',
    description: 'Environmental Health and Safety Construction NOC',
    submittedBy: 'Contractor',
    referenceNumber: 'EHS-CON-2023-409',
    status: 'Expired',
    paymentFee: 1800,
    isPaid: true,
    planDate: '2026-08-01',
    applyDate: '2026-08-10',
    issuanceDate: '2026-08-25',
    expiryDate: '2026-09-25', // Lapsed 4 days ago
    blockingSequenceNumber: 1,
    blockingSequenceDescription: 'Requires DEWA Temporary Power Connection',
    requirements: [
      { id: 'req-15', title: 'Site Waste Management Plan', isSatisfied: true },
      { id: 'req-16', title: 'Noise & Dust Mitigation Scheme', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-09-25T00:00:00Z',
  },
  {
    id: 'noc-23016-07',
    projectCode: '23016',
    sequenceNumber: 7,
    stage: 'Information NOC',
    reviewingAuthority: 'Green Building',
    description: 'Dubai Green Building Regulations & Al Sa’fat Assessment',
    submittedBy: 'Consultant',
    referenceNumber: 'DM-SAFAT-2023-88',
    status: 'Approved',
    paymentFee: 3000,
    isPaid: true,
    planDate: '2026-07-25',
    applyDate: '2026-08-01',
    issuanceDate: '2026-08-20',
    expiryDate: '2027-08-20',
    blockingSequenceNumber: null,
    requirements: [
      { id: 'req-17', title: 'Energy Performance Energy Model', isSatisfied: true, fileName: 'ALSAFAT-ENERGY-SIM.pdf' },
      { id: 'req-18', title: 'Water Efficient Fixture Schedule', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-08-20T11:00:00Z',
  },
  {
    id: 'noc-23016-08',
    projectCode: '23016',
    sequenceNumber: 8,
    stage: 'Handover NOC',
    reviewingAuthority: 'DCD',
    description: 'Final Civil Defence Building Completion Inspection',
    submittedBy: 'Consultant',
    referenceNumber: 'DCD-COMP-2023-PENDING',
    status: 'Not Started',
    paymentFee: 6000,
    isPaid: false,
    planDate: '2027-04-01',
    applyDate: null,
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 5,
    blockingSequenceDescription: 'Requires Superstructure Building Permit & Completion',
    requirements: [
      { id: 'req-19', title: 'As-Built Fire Protection Drawings', isSatisfied: false },
      { id: 'req-20', title: 'Emergency Generator Test Certificate', isSatisfied: false },
    ],
    revision: 'R00',
    updatedAt: '2026-09-01T08:00:00Z',
  },
];

export const INITIAL_NOCS_PROJECT_23015: ProjectNocItem[] = [
  {
    id: 'noc-23015-01',
    projectCode: '23015',
    sequenceNumber: 1,
    stage: 'Design NOC',
    reviewingAuthority: 'Nakheel',
    description: 'Master Developer Design Review & Concept Approval',
    submittedBy: 'Consultant',
    referenceNumber: 'NKH-PLM-2023-102',
    status: 'Approved',
    paymentFee: 8000,
    isPaid: true,
    planDate: '2026-06-10',
    applyDate: '2026-06-15',
    issuanceDate: '2026-07-01',
    expiryDate: '2027-07-01',
    blockingSequenceNumber: null,
    requirements: [
      { id: 'req-21', title: 'Concept Architectural Elevations', isSatisfied: true, fileName: 'VILLA-ELEVATIONS.pdf' },
      { id: 'req-22', title: 'Plot Boundary Affection Plan', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-07-01T12:00:00Z',
  },
  {
    id: 'noc-23015-02',
    projectCode: '23015',
    sequenceNumber: 2,
    stage: 'Design NOC',
    reviewingAuthority: 'Trakhees',
    description: 'Trakhees Civil Engineering Structural Design NOC',
    submittedBy: 'Consultant',
    referenceNumber: 'TRK-CED-2023-883',
    status: 'Approved',
    paymentFee: 4500,
    isPaid: true,
    planDate: '2026-07-10',
    applyDate: '2026-07-15',
    issuanceDate: '2026-08-05',
    expiryDate: '2026-10-02', // Expiring in 3 days
    blockingSequenceNumber: 1,
    blockingSequenceDescription: 'Requires Nakheel Concept Approval',
    requirements: [
      { id: 'req-23', title: 'Structural Calculations Model', isSatisfied: true, fileName: 'ETABS-MODEL.pdf' },
      { id: 'req-24', title: 'Foundation & Retaining Wall Drawings', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-08-05T14:00:00Z',
  },
  {
    id: 'noc-23015-03',
    projectCode: '23015',
    sequenceNumber: 3,
    stage: 'Construction NOC',
    reviewingAuthority: 'DEWA',
    description: 'Temporary Site Power Connection NOC',
    submittedBy: 'Contractor',
    referenceNumber: 'DEWA-TEMP-2023-19',
    status: 'Pending for Payment',
    paymentFee: 2500,
    isPaid: false,
    planDate: '2026-09-01',
    applyDate: '2026-09-10',
    issuanceDate: null,
    expiryDate: null,
    blockingSequenceNumber: 2,
    blockingSequenceDescription: 'Requires Trakhees CED Structural NOC',
    requirements: [
      { id: 'req-25', title: 'Contractor Power Demand Calculation', isSatisfied: true },
      { id: 'req-26', title: 'Subcontractor Trade License Copy', isSatisfied: true },
    ],
    revision: 'R00',
    updatedAt: '2026-09-10T16:00:00Z',
  },
];

export function calculateDaysRemaining(expiryDateStr: string | null): number | null {
  if (!expiryDateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDateStr);
  expiry.setHours(0, 0, 0, 0);
  const diffTime = expiry.getTime() - today.getTime();
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
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plan = new Date(planDateStr);
  plan.setHours(0, 0, 0, 0);
  const diffDays = Math.ceil((plan.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
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
