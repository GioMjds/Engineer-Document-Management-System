import type {
  MasterAuthority,
  NocMatrixItem,
} from '@/types/noc';

// Standard NOC matrix templates by Master Authority ID.
export const SEED_MATRIX_TEMPLATES: Record<number, NocMatrixItem[]> = {
  1: [
    {
      id: 'nakheel-mat-01',
      masterAuthorityId: 1,
      sequenceNo: 1,
      stage: 'Design NOC',
      reviewingAuthority: 'Nakheel',
      description: 'Nakheel Master Developer Concept & Architectural Clearance',
      submittedBy: 'Consultant',
      blockingSequenceNo: null,
      validityDays: 365,
      defaultFee: 5000,
      active: true,
      requirements: [
        { id: 'nakheel-req-01-01', matrixItemId: 'nakheel-mat-01', title: 'Master Developer Concept Submission & Affection Plan', mandatory: true, sortOrder: 1 },
        { id: 'nakheel-req-01-02', matrixItemId: 'nakheel-mat-01', title: 'Architectural Massing and Elevation Drawings', mandatory: true, sortOrder: 2 },
        { id: 'nakheel-req-01-03', matrixItemId: 'nakheel-mat-01', title: 'Consultant Appointment Letter & Trade License', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      id: 'nakheel-mat-02',
      masterAuthorityId: 1,
      sequenceNo: 2,
      stage: 'Design NOC',
      reviewingAuthority: 'Trakhees',
      description: 'Trakhees CED Civil Engineering Department Structural Review',
      submittedBy: 'Consultant',
      blockingSequenceNo: 1,
      validityDays: 365,
      defaultFee: 15000,
      active: true,
      requirements: [
        { id: 'nakheel-req-02-01', matrixItemId: 'nakheel-mat-02', title: 'Structural Design Calculations & Model', mandatory: true, sortOrder: 1 },
        { id: 'nakheel-req-02-02', matrixItemId: 'nakheel-mat-02', title: 'Geotechnical Soil Investigation Report', mandatory: true, sortOrder: 2 },
        { id: 'nakheel-req-02-03', matrixItemId: 'nakheel-mat-02', title: 'Nakheel Concept Approval Endorsement', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      id: 'nakheel-mat-03',
      masterAuthorityId: 1,
      sequenceNo: 3,
      stage: 'Construction NOC',
      reviewingAuthority: 'DEWA',
      description: 'DEWA Temporary Construction Power & Substation Allocation',
      submittedBy: 'Consultant',
      blockingSequenceNo: 2,
      validityDays: 365,
      defaultFee: 4000,
      active: true,
      requirements: [
        { id: 'nakheel-req-03-01', matrixItemId: 'nakheel-mat-03', title: 'Electrical Connected Load Schedule', mandatory: true, sortOrder: 1 },
        { id: 'nakheel-req-03-02', matrixItemId: 'nakheel-mat-03', title: 'Substation Architectural Layout & Details', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'nakheel-mat-04',
      masterAuthorityId: 1,
      sequenceNo: 4,
      stage: 'Design NOC',
      reviewingAuthority: 'DCD',
      description: 'Civil Defence Life Safety & Fire Prevention Approval',
      submittedBy: 'Consultant',
      blockingSequenceNo: 2,
      validityDays: 365,
      defaultFee: 4500,
      active: true,
      requirements: [
        { id: 'nakheel-req-04-01', matrixItemId: 'nakheel-mat-04', title: 'Fire Fighting & Alarm Layout Plans', mandatory: true, sortOrder: 1 },
        { id: 'nakheel-req-04-02', matrixItemId: 'nakheel-mat-04', title: 'Emergency Egress & Stairwell Calculations', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'nakheel-mat-05',
      masterAuthorityId: 1,
      sequenceNo: 5,
      stage: 'Construction NOC',
      reviewingAuthority: 'EHS',
      description: 'Trakhees Environment, Health & Safety Construction Activity NOC',
      submittedBy: 'Contractor',
      blockingSequenceNo: 2,
      validityDays: 180,
      defaultFee: 2500,
      active: true,
      requirements: [
        { id: 'nakheel-req-05-01', matrixItemId: 'nakheel-mat-05', title: 'Contractor Site Safety & HSE Management Plan', mandatory: true, sortOrder: 1 },
        { id: 'nakheel-req-05-02', matrixItemId: 'nakheel-mat-05', title: 'Waste Management and Environmental Protocol', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'nakheel-mat-06',
      masterAuthorityId: 1,
      sequenceNo: 6,
      stage: 'Handover NOC',
      reviewingAuthority: 'Trakhees',
      description: 'Trakhees CED Building Completion Certificate (BCC) & Handover Inspection',
      submittedBy: 'Consultant',
      blockingSequenceNo: 5,
      validityDays: 365,
      defaultFee: 8000,
      active: true,
      requirements: [
        { id: 'nakheel-req-06-01', matrixItemId: 'nakheel-mat-06', title: 'Civil Defence BCC Final Inspection Clearance', mandatory: true, sortOrder: 1 },
        { id: 'nakheel-req-06-02', matrixItemId: 'nakheel-mat-06', title: 'DEWA Permanent Connection Inspection Release', mandatory: true, sortOrder: 2 },
        { id: 'nakheel-req-06-03', matrixItemId: 'nakheel-mat-06', title: 'As-Built Architectural and Structural Drawings', mandatory: true, sortOrder: 3 },
      ],
    },
  ],
  2: [
    {
      id: 'dm-mat-01',
      masterAuthorityId: 2,
      sequenceNo: 1,
      stage: 'Design NOC',
      reviewingAuthority: 'DM',
      description: 'Dubai Municipality Architectural Design Approval & Permit',
      submittedBy: 'Consultant',
      blockingSequenceNo: null,
      validityDays: 365,
      defaultFee: 8000,
      active: true,
      requirements: [
        { id: 'dm-req-01-01', matrixItemId: 'dm-mat-01', title: 'DM Approved Affection Plan and Zoning Clearance', mandatory: true, sortOrder: 1 },
        { id: 'dm-req-01-02', matrixItemId: 'dm-mat-01', title: 'Comprehensive Architectural Drawing Set', mandatory: true, sortOrder: 2 },
        { id: 'dm-req-01-03', matrixItemId: 'dm-mat-01', title: 'FAR & Building Height Compliance Schedule', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      id: 'dm-mat-02',
      masterAuthorityId: 2,
      sequenceNo: 2,
      stage: 'Design NOC',
      reviewingAuthority: 'DEWA',
      description: 'DEWA Electricity Substation & Water Network Connection Permit',
      submittedBy: 'Consultant',
      blockingSequenceNo: 1,
      validityDays: 365,
      defaultFee: 3500,
      active: true,
      requirements: [
        { id: 'dm-req-02-01', matrixItemId: 'dm-mat-02', title: 'Electrical Single Line Diagram & Load Calculations', mandatory: true, sortOrder: 1 },
        { id: 'dm-req-02-02', matrixItemId: 'dm-mat-02', title: 'Substation Space Allocation Drawings', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'dm-mat-03',
      masterAuthorityId: 2,
      sequenceNo: 3,
      stage: 'Design NOC',
      reviewingAuthority: 'DCD',
      description: 'Dubai Civil Defence Life Safety & Fire Prevention Approval',
      submittedBy: 'Consultant',
      blockingSequenceNo: 1,
      validityDays: 365,
      defaultFee: 4200,
      active: true,
      requirements: [
        { id: 'dm-req-03-01', matrixItemId: 'dm-mat-03', title: 'Life Safety and Evacuation Strategy Drawings', mandatory: true, sortOrder: 1 },
        { id: 'dm-req-03-02', matrixItemId: 'dm-mat-03', title: 'Sprinkler and Standpipe Hydraulics Report', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'dm-mat-04',
      masterAuthorityId: 2,
      sequenceNo: 4,
      stage: 'Construction NOC',
      reviewingAuthority: 'DM',
      description: 'Dubai Municipality Structural Engineering & Shoring Permit',
      submittedBy: 'Consultant',
      blockingSequenceNo: 1,
      validityDays: 365,
      defaultFee: 12000,
      active: true,
      requirements: [
        { id: 'dm-req-04-01', matrixItemId: 'dm-mat-04', title: 'Geotechnical Soil Investigation Report', mandatory: true, sortOrder: 1 },
        { id: 'dm-req-04-02', matrixItemId: 'dm-mat-04', title: 'Shoring, Piling and Foundation Structural Calculation', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'dm-mat-05',
      masterAuthorityId: 2,
      sequenceNo: 5,
      stage: 'Information NOC',
      reviewingAuthority: 'Green Building',
      description: 'Dubai Green Building Regulations & Al Sa’fat Assessment',
      submittedBy: 'Consultant',
      blockingSequenceNo: 1,
      validityDays: 365,
      defaultFee: 3000,
      active: true,
      requirements: [
        { id: 'dm-req-05-01', matrixItemId: 'dm-mat-05', title: 'Al Sa’fat Energy Performance Simulation Report', mandatory: true, sortOrder: 1 },
        { id: 'dm-req-05-02', matrixItemId: 'dm-mat-05', title: 'Water Efficient Fixture & MEP Compliance List', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'dm-mat-06',
      masterAuthorityId: 2,
      sequenceNo: 6,
      stage: 'Handover NOC',
      reviewingAuthority: 'DM',
      description: 'Dubai Municipality Final BCC Inspection & Handover Permit',
      submittedBy: 'Consultant',
      blockingSequenceNo: 4,
      validityDays: 365,
      defaultFee: 10000,
      active: true,
      requirements: [
        { id: 'dm-req-06-01', matrixItemId: 'dm-mat-06', title: 'Civil Defence Completion Clearance Certificate', mandatory: true, sortOrder: 1 },
        { id: 'dm-req-06-02', matrixItemId: 'dm-mat-06', title: 'DEWA Permanent Meter Installation Clearance', mandatory: true, sortOrder: 2 },
        { id: 'dm-req-06-03', matrixItemId: 'dm-mat-06', title: 'As-Built Drawing Verification & Approval', mandatory: true, sortOrder: 3 },
      ],
    },
  ],
  3: [
    {
      id: 'dda-mat-01',
      masterAuthorityId: 3,
      sequenceNo: 1,
      stage: 'Design NOC',
      reviewingAuthority: 'DEWA',
      description: 'Electricity Substation & Water Connection NOC',
      submittedBy: 'Consultant',
      blockingSequenceNo: null,
      validityDays: 365,
      defaultFee: 3500,
      active: true,
      requirements: [
        { id: 'dda-req-01-01', matrixItemId: 'dda-mat-01', title: 'Electrical Load Schedule', mandatory: true, sortOrder: 1 },
        { id: 'dda-req-01-02', matrixItemId: 'dda-mat-01', title: 'Substation Architectural Layout', mandatory: true, sortOrder: 2 },
        { id: 'dda-req-01-03', matrixItemId: 'dda-mat-01', title: 'Consultant NOC Authorization Letter', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      id: 'dda-mat-02',
      masterAuthorityId: 3,
      sequenceNo: 2,
      stage: 'Design NOC',
      reviewingAuthority: 'RTA',
      description: 'Traffic Impact Study & Right of Way Access Permit',
      submittedBy: 'Specialists',
      blockingSequenceNo: 1,
      validityDays: 180,
      defaultFee: 5000,
      active: true,
      requirements: [
        { id: 'dda-req-02-01', matrixItemId: 'dda-mat-02', title: 'Detailed Traffic Impact Study (TIS)', mandatory: true, sortOrder: 1 },
        { id: 'dda-req-02-02', matrixItemId: 'dda-mat-02', title: 'Site Ingress and Egress CAD Drawings', mandatory: true, sortOrder: 2 },
        { id: 'dda-req-02-03', matrixItemId: 'dda-mat-02', title: 'DEWA Substation Access Clearance', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      id: 'dda-mat-03',
      masterAuthorityId: 3,
      sequenceNo: 3,
      stage: 'Design NOC',
      reviewingAuthority: 'DCD',
      description: 'Civil Defence Life Safety & Fire Prevention Review',
      submittedBy: 'Consultant',
      blockingSequenceNo: 1,
      validityDays: 365,
      defaultFee: 4200,
      active: true,
      requirements: [
        { id: 'dda-req-03-01', matrixItemId: 'dda-mat-03', title: 'Fire Alarm & Sprinkler Layout Plan', mandatory: true, sortOrder: 1 },
        { id: 'dda-req-03-02', matrixItemId: 'dda-mat-03', title: 'Staircase Pressurization Calculations', mandatory: true, sortOrder: 2 },
        { id: 'dda-req-03-03', matrixItemId: 'dda-mat-03', title: 'Civil Defence Material Approval Certificates', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      id: 'dda-mat-04',
      masterAuthorityId: 3,
      sequenceNo: 4,
      stage: 'Design NOC',
      reviewingAuthority: 'Etisalat',
      description: 'Telecom Infrastructure & Fiber Entry Route NOC',
      submittedBy: 'Contractor',
      blockingSequenceNo: 2,
      validityDays: 365,
      defaultFee: 2100,
      active: true,
      requirements: [
        { id: 'dda-req-04-01', matrixItemId: 'dda-mat-04', title: 'Telecom Duct Route Drawing', mandatory: true, sortOrder: 1 },
        { id: 'dda-req-04-02', matrixItemId: 'dda-mat-04', title: 'Server Room Specification Sheet', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'dda-mat-05',
      masterAuthorityId: 3,
      sequenceNo: 5,
      stage: 'Construction NOC',
      reviewingAuthority: 'DDA',
      description: 'Final Building Permit for Deep Shoring & Excavation',
      submittedBy: 'Consultant',
      blockingSequenceNo: 3,
      validityDays: 180,
      defaultFee: 12500,
      active: true,
      requirements: [
        { id: 'dda-req-05-01', matrixItemId: 'dda-mat-05', title: 'Geotechnical Soil Investigation Report', mandatory: true, sortOrder: 1 },
        { id: 'dda-req-05-02', matrixItemId: 'dda-mat-05', title: 'Shoring & Piling Design Calculations', mandatory: true, sortOrder: 2 },
        { id: 'dda-req-05-03', matrixItemId: 'dda-mat-05', title: 'Contractor Safety Plan & DM Approval', mandatory: true, sortOrder: 3 },
      ],
    },
    {
      id: 'dda-mat-06',
      masterAuthorityId: 3,
      sequenceNo: 6,
      stage: 'Construction NOC',
      reviewingAuthority: 'EHS',
      description: 'Environmental Health and Safety Construction NOC',
      submittedBy: 'Contractor',
      blockingSequenceNo: 1,
      validityDays: 90,
      defaultFee: 1800,
      active: true,
      requirements: [
        { id: 'dda-req-06-01', matrixItemId: 'dda-mat-06', title: 'Site Waste Management Plan', mandatory: true, sortOrder: 1 },
        { id: 'dda-req-06-02', matrixItemId: 'dda-mat-06', title: 'Noise & Dust Mitigation Scheme', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'dda-mat-07',
      masterAuthorityId: 3,
      sequenceNo: 7,
      stage: 'Information NOC',
      reviewingAuthority: 'Green Building',
      description: 'Dubai Green Building Regulations & Al Sa’fat Assessment',
      submittedBy: 'Consultant',
      blockingSequenceNo: null,
      validityDays: 365,
      defaultFee: 3000,
      active: true,
      requirements: [
        { id: 'dda-req-07-01', matrixItemId: 'dda-mat-07', title: 'Energy Performance Energy Model', mandatory: true, sortOrder: 1 },
        { id: 'dda-req-07-02', matrixItemId: 'dda-mat-07', title: 'Water Efficient Fixture Schedule', mandatory: true, sortOrder: 2 },
      ],
    },
    {
      id: 'dda-mat-08',
      masterAuthorityId: 3,
      sequenceNo: 8,
      stage: 'Handover NOC',
      reviewingAuthority: 'DCD',
      description: 'Final Civil Defence Building Completion Inspection',
      submittedBy: 'Consultant',
      blockingSequenceNo: 5,
      validityDays: 365,
      defaultFee: 6000,
      active: true,
      requirements: [
        { id: 'dda-req-08-01', matrixItemId: 'dda-mat-08', title: 'As-Built Fire Protection Drawings', mandatory: true, sortOrder: 1 },
        { id: 'dda-req-08-02', matrixItemId: 'dda-mat-08', title: 'Emergency Generator Test Certificate', mandatory: true, sortOrder: 2 },
      ],
    },
  ],
};

// Returns eligible prerequisite items with sequence number strictly less than current sequence to prevent circular dependencies.
export function getAvailablePrerequisites(
  items: NocMatrixItem[],
  currentSeq: number
): NocMatrixItem[] {
  return items
    .filter((item) => item.sequenceNo < currentSeq && item.active)
    .sort((a, b) => a.sequenceNo - b.sequenceNo);
}

// Maps master authority numeric ID to human-readable MasterAuthority name.
export function getAuthorityName(masterAuthorityId: number): MasterAuthority {
  switch (masterAuthorityId) {
    case 1:
      return 'Nakheel and Trakhees';
    case 2:
      return 'Dubai Municipality';
    case 3:
      return 'Dubai Development Authority';
    default:
      return 'Dubai Development Authority';
  }
}

// Maps MasterAuthority name to its corresponding master authority numeric ID.
export function getMasterAuthorityId(authorityName: MasterAuthority): number {
  switch (authorityName) {
    case 'Nakheel and Trakhees':
      return 1;
    case 'Dubai Municipality':
      return 2;
    case 'Dubai Development Authority':
      return 3;
    default:
      return 3;
  }
}
