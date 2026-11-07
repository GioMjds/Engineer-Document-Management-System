export type ProjectLifecycleStage =
  | 'Pre-Construction'
  | 'Construction'
  | 'Handover'
  | 'Completed';

export type StageGateCategory =
  | 'authority_noc'
  | 'specialist_study'
  | 'regulatory_milestone'
  | 'discipline_approval'
  | 'commercial_milestone'
  | 'safety_quality'
  | (string & {});

export interface CustomStagePrerequisite {
  id: string;
  title: string;
  category: StageGateCategory;
  stage: ProjectLifecycleStage;
  isSatisfied: boolean;
  mandatoryForNextStage?: boolean;
  sourceReference?: string;
  actionHint?: string;
  createdAt?: string;
}

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
  customPrerequisites?: CustomStagePrerequisite[];
  disciplineStatus?: ProjectDisciplineStatus;
}

export interface StageGatePrerequisiteItem {
  id: string;
  title: string;
  category: StageGateCategory;
  isSatisfied: boolean;
  sourceReference?: string;
  mandatoryForNextStage: boolean;
  actionHint?: string;
  isCustom?: boolean;
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

// Dynamic master authority name.
export type MasterAuthority = string;

export interface MasterAuthorityRecord {
  id: number;
  name: string;
  jurisdiction?: string | null;
}

// Dynamic reviewing authority name.
export type ReviewingAuthority = string;

export interface ReviewingAuthorityRecord {
  id: number;
  name: string;
}

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
  reviewingAuthorityId: number;
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

export type AssignedRoleKey =
  | 'authorityEngineer'
  | 'architectEngineer'
  | 'mepEngineer'
  | 'structureEngineer'
  | 'civilEngineer'
  | 'residentEngineer'
  | 'areaManager'
  | 'docController';

export interface AssignedMember {
  id: string;
  name: string;
}

export interface AssignedProject {
  id?: string;
  code: string;
  name: string;
  masterAuthority: MasterAuthority;
  projectType: string;
  location: string;
  contractType: string;
  contractorName?: string;
  clientContractorAmount?: number;
  clientConsultantAmount?: number;
  currentStage: string;
  lifecycleStage: ProjectLifecycleStage;
  milestones?: StageMilestoneDates;
  assignedRoles: Record<AssignedRoleKey, string>;
  assignedMembers?: Partial<Record<AssignedRoleKey, AssignedMember[]>>;
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
  status: 'Pending' | 'Uploaded' | 'Approved' | 'Rejected';
  revision?: string;
  remarks?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  fileUrl?: string;
  filePath?: string;
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

export interface ProjectDocumentItem {
  id: string;
  docNumber: string;
  title: string;
  discipline?: string | null;
  revision: string;
  status: string;
  fileName?: string | null;
  filePath?: string | null;
  fileSize?: number | null;
  updatedAt?: string;
}
