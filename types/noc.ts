export type ProjectLifecycleStage =
  | 'Pre-Construction'
  | 'Construction'
  | 'Handover';

export interface StageMilestoneDates {
  preConstruction?: {
    kickoffDate?: string;
    surveyCompletionDate?: string;
    conceptApprovalDate?: string;
    commencementDate?: string;
    plannedCompletionDate?: string;
    buildingPermitDate?: string;
  };
  construction?: {
    commencementDate?: string;
    targetCompletionDate?: string;
    extensionOfTimeDate?: string;
  };
  handover?: {
    commissioningDate?: string;
    civilDefenceInspectionDate?: string;
    bccIssuanceDate?: string;
    targetCompletionDate?: string;
  };
}

export interface StageGatePrerequisiteItem {
  id: string;
  title: string;
  category: 'authority_noc' | 'specialist_study' | 'regulatory_milestone';
  isSatisfied: boolean;
  sourceReference?: string;
  mandatoryForNextStage: boolean;
}

export interface StageGateReadiness {
  stage: ProjectLifecycleStage;
  nextStage: ProjectLifecycleStage | 'Completed';
  totalPrerequisites: number;
  satisfiedPrerequisites: number;
  readinessPercentage: number;
  isGateReady: boolean;
  prerequisites: StageGatePrerequisiteItem[];
}

// This is hardcoded for now, but we can make it dynamic in the future if needed.
export type MasterAuthority =
  | 'Nakheel and Trakhees'
  | 'Dubai Municipality'
  | 'Dubai Development Authority';

// This is hardcoded for now, but we can make it dynamic in the future if needed.
export type ReviewingAuthority =
  | 'Trakhees'
  | 'Nakheel'
  | 'DEWA'
  | 'Empower'
  | 'RTA'
  | 'EHS'
  | 'DCAA'
  | 'DM'
  | 'DU'
  | 'Etisalat'
  | 'Green Building'
  | 'Third Party'
  | 'DCD'
  | 'DDA';

export type NocStage =
  | 'Design NOC'
  | 'Construction NOC'
  | 'Information NOC'
  | 'Handover NOC';

export type NocStatus =
  | 'Approved'
  | 'Rejected'
  | 'Not Started'
  | 'Pending for Payment'
  | 'Not Needed'
  | 'Expired'
  | 'Submitted';

export type SubmittedBy =
  | 'Consultant'
  | 'Client'
  | 'Contractor'
  | 'Specialists';

export interface NocRequirement {
  id: string;
  title: string;
  isSatisfied: boolean;
  notes?: string;
  fileName?: string;
}

export interface NocResubmissionEntry {
  id: string;
  projectNocId: string;
  revision: string;
  rejectionReason: string;
  rejectionDate: string;
  resubmissionDate: string;
  resubmittedBy: string;
}

export interface NocMatrixRequirement {
  id: string;
  matrixItemId: string;
  title: string;
  mandatory: boolean;
  sortOrder: number;
}

export interface NocMatrixItem {
  id: string;
  masterAuthorityId: number;
  sequenceNo: number;
  stage: NocStage;
  reviewingAuthority: ReviewingAuthority;
  description: string;
  submittedBy: SubmittedBy;
  blockingSequenceNo: number | null;
  validityDays: number;
  defaultFee: number;
  active: boolean;
  requirements: NocMatrixRequirement[];
  createdAt?: string;
  updatedAt?: string;
}

export interface NocMatrixRevision {
  id: string;
  masterAuthorityId: number;
  matrixItemId?: string | null;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'REORDER';
  changedBy: string;
  changedByName?: string;
  changedByRole?: string;
  changeSummary: string;
  previousData?: Record<string, unknown> | null;
  newData?: Record<string, unknown> | null;
  propagatedProjectsCount: number;
  propagatedNocsCount: number;
  createdAt: string;
}

export interface ProjectNocItem {
  id: string;
  projectCode: string;
  sequenceNumber: number;
  stage: NocStage;
  reviewingAuthority: ReviewingAuthority;
  description: string;
  submittedBy: SubmittedBy;
  referenceNumber: string;
  status: NocStatus;
  paymentFee: number;
  isPaid: boolean;
  payerType?: NocPayerType;
  receiptFileUrl?: string;
  planDate: string;
  applyDate: string | null;
  issuanceDate: string | null;
  expiryDate: string | null;
  blockingSequenceNumber: number | null;
  blockingSequenceDescription?: string;
  requirements: NocRequirement[];
  rejectionReason?: string;
  revision: string;
  resubmissionHistory?: NocResubmissionEntry[];
  overrideReason?: string;
  overriddenBy?: string;
  overriddenAt?: string;
  updatedAt: string;
}

export interface AssignedProject {
  code: string;
  name: string;
  masterAuthority: MasterAuthority;
  projectType: string;
  location: string;
  contractType: string;
  currentStage: string;
  lifecycleStage: ProjectLifecycleStage;
  milestones?: StageMilestoneDates;
  assignedRoles: {
    authorityEngineer: string;
    architectEngineer: string;
    mepEngineer: string;
    structureEngineer: string;
    civilEngineer: string;
    residentEngineer: string;
    areaManager: string;
    docController: string;
  };
}

export type DisciplineStageStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Under Review'
  | 'Client Approval'
  | 'Approved'
  | 'On Hold';

export type ThirdPartySpecialistType =
  | 'Vertical Transportation'
  | 'Traffic Impact Study'
  | 'Green Building'
  | 'Topographical'
  | 'Geotechnical';

export interface ThirdPartySpecialistRecord {
  id: string;
  type: ThirdPartySpecialistType;
  fileName?: string;
  fileSize?: string;
  uploadedBy?: string;
  uploadedAt?: string;
  status: 'Pending' | 'Uploaded' | 'Approved';
}

export interface DisciplineDetail {
  status: DisciplineStageStatus;
  updatedBy: string;
  updatedAt: string;
  remarks?: string;
}

export interface ProjectDisciplineStatus {
  projectCode: string;
  architecture: DisciplineDetail;
  structure: DisciplineDetail;
  mep: DisciplineDetail;
  authorities: {
    designStage: DisciplineStageStatus;
    constructionStage: DisciplineStageStatus;
    revisionStage: DisciplineStageStatus;
    updatedBy: string;
    updatedAt: string;
  };
  specialists: ThirdPartySpecialistRecord[];
}

export interface SubmittalDelayItem {
  nocId: string;
  projectCode: string;
  projectName: string;
  description: string;
  reviewingAuthority: ReviewingAuthority;
  planDate: string;
  applyDate: string | null;
  daysDelayed: number;
  planDelayDays?: number;
  delayType: 'Unsubmitted Delay' | 'Pending Authority Review';
}

export type NocPayerType = 'client' | 'contractor' | 'consultant_advance';