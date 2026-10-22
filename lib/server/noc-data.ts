import { createClient } from '@/lib/supabase/server';
import {
  SEED_PROJECTS,
  INITIAL_NOCS_PROJECT_26001,
  INITIAL_NOCS_PROJECT_23016,
  INITIAL_NOCS_PROJECT_23015,
} from '@/lib/noc-tracker';
import { getAuthorityName } from '@/lib/noc-matrix';
import type {
  AssignedProject,
  ProjectNocItem,
  MasterAuthority,
  ReviewingAuthority,
  NocStage,
  NocStatus,
  SubmittedBy,
  NocPayerType,
  NocRequirement,
  NocResubmissionEntry,
  ProjectLifecycleStage,
  StageMilestoneDates,
} from '@/types/noc';

export interface NocTrackerData {
  projects: AssignedProject[];
  nocs: ProjectNocItem[];
  isLive: boolean;
}

interface RawProfile {
  id: string;
  full_name: string | null;
  role: string;
}

interface RawProjectMember {
  user_id?: string;
  discipline?: string | null;
  profiles: RawProfile | null;
}

interface RawDbProject {
  id: string;
  code: string;
  description: string | null;
  client_name?: string | null;
  master_authority_id: number;
  stage: string | null;
  contractor_name?: string | null;
  client_contractor_amount?: number | null;
  milestones?: StageMilestoneDates | null;
  project_members?: RawProjectMember[] | null;
}

interface RawNocRequirement {
  id: string;
  title: string;
  is_satisfied: boolean;
  file_url: string | null;
}

interface RawResubmission {
  id: string;
  revision: string;
  rejection_reason: string;
  rejection_date: string;
  resubmission_date: string;
  resubmitted_by: string;
}

interface RawDbNoc {
  id: string;
  project_id: string;
  sequence_no: number;
  stage: string;
  reviewing_authority_id: number;
  description: string;
  submitted_by: string;
  status_code: string;
  payment_fee: number | string;
  is_paid: boolean;
  payer_type: string | null;
  receipt_file_url: string | null;
  plan_date: string | null;
  apply_date: string | null;
  receive_date: string | null;
  expiry_date: string | null;
  reference_no: string | null;
  blocking_sequence_no: number | null;
  current_revision: string | null;
  override_reason: string | null;
  overridden_by: string | null;
  overridden_at: string | null;
  updated_at: string;
  project_noc_requirements?: RawNocRequirement[] | null;
  noc_resubmission_history?: RawResubmission[] | null;
}

// Maps database project record into AssignedProject model.
function mapDbProjectToAssigned(
  p: RawDbProject,
  masterAuth: MasterAuthority,
  clientConsultantAmount?: number,
): AssignedProject {
  const seed = SEED_PROJECTS.find((sp) => sp.code === p.code);
  const roles: AssignedProject['assignedRoles'] = {
    authorityEngineer: seed?.assignedRoles.authorityEngineer ?? 'Unassigned',
    architectEngineer: seed?.assignedRoles.architectEngineer ?? 'Unassigned',
    mepEngineer: seed?.assignedRoles.mepEngineer ?? 'Unassigned',
    structureEngineer: seed?.assignedRoles.structureEngineer ?? 'Unassigned',
    civilEngineer: seed?.assignedRoles.civilEngineer ?? 'Unassigned',
    residentEngineer: seed?.assignedRoles.residentEngineer ?? 'Unassigned',
    areaManager: seed?.assignedRoles.areaManager ?? 'Unassigned',
    docController: seed?.assignedRoles.docController ?? 'Unassigned',
  };

  if (p.project_members && Array.isArray(p.project_members)) {
    for (const pm of p.project_members) {
      const profile = pm.profiles;
      if (!profile) continue;
      const name = profile.full_name || 'Engineer';
      const lower = name.toLowerCase();
      switch (profile.role) {
        case 'authority_engineer':
          roles.authorityEngineer = name;
          break;
        case 'resident_engineer':
          roles.residentEngineer = name;
          break;
        case 'area_manager':
          roles.areaManager = name;
          break;
        case 'dc':
        case 'doc_controller':
          roles.docController = name;
          break;
        case 'engineer':
          if (pm.discipline === 'mep' || lower.includes('mep')) {
            roles.mepEngineer = name;
          } else if (
            pm.discipline === 'architect' ||
            lower.includes('architect')
          ) {
            roles.architectEngineer = name;
          } else if (
            pm.discipline === 'structure' ||
            lower.includes('structur')
          ) {
            roles.structureEngineer = name;
          } else if (
            pm.discipline === 'civil' ||
            lower.includes('civil') ||
            lower.includes('ismail')
          ) {
            roles.civilEngineer = name;
          } else if (roles.civilEngineer === 'Unassigned') {
            roles.civilEngineer = name;
          }
          break;
      }
    }
  }

  const stageMap: Record<string, ProjectLifecycleStage> = {
    planning: 'Pre-Construction',
    design: 'Pre-Construction',
    construction: 'Construction',
    handover: 'Handover',
    completed: 'Handover',
  };

  return {
    id: p.id,
    code: p.code,
    name: p.description || p.code,
    masterAuthority: masterAuth,
    projectType: 'Commercial & Residential',
    location: 'Dubai, UAE',
    contractType: 'Design & Supervision',
    contractorName: p.contractor_name || seed?.contractorName || undefined,
    clientContractorAmount:
      p.client_contractor_amount != null
        ? Number(p.client_contractor_amount)
        : (seed?.clientContractorAmount ?? 0),
    clientConsultantAmount:
      clientConsultantAmount ?? seed?.clientConsultantAmount ?? undefined,
    currentStage: p.stage
      ? p.stage.charAt(0).toUpperCase() + p.stage.slice(1)
      : 'Pre-Construction',
    lifecycleStage: p.stage
      ? stageMap[p.stage] || 'Pre-Construction'
      : 'Pre-Construction',
    milestones:
      (p.milestones as StageMilestoneDates) || seed?.milestones || undefined,
    assignedRoles: roles,
  };
}

// Maps database NOC row to ProjectNocItem.
function mapDbNocToItem(
  row: RawDbNoc,
  projectCode: string,
  reviewingAuth: ReviewingAuthority,
): ProjectNocItem {
  const stageMap = {
    design: 'Design NOC',
    information: 'Information NOC',
    construction: 'Construction NOC',
    handover: 'Handover NOC',
  } satisfies Record<string, NocStage>;

  const statusMap = {
    approved: 'Approved',
    obtained: 'Approved',
    rejected: 'Rejected',
    submitted: 'Submitted',
    applied: 'Submitted',
    not_started: 'Not Started',
    pending_payment: 'Pending for Payment',
    pending_for_payment: 'Pending for Payment',
    not_needed: 'Not Needed',
    expired: 'Expired',
  } satisfies Record<string, NocStatus>;

  const submitterMap = {
    consultant: 'Consultant',
    client: 'Client',
    contractor: 'Contractor',
    specialist: 'Specialists',
    specialists: 'Specialists',
  } satisfies Record<string, SubmittedBy>;

  const requirements: NocRequirement[] = (
    row.project_noc_requirements || []
  ).map((r) => ({
    id: r.id,
    title: r.title,
    isSatisfied: Boolean(r.is_satisfied),
    fileName: r.file_url ?? undefined,
  }));

  const resubmissionHistory: NocResubmissionEntry[] = (
    row.noc_resubmission_history || []
  ).map((h) => ({
    id: h.id,
    projectNocId: row.id,
    revision: h.revision,
    rejectionReason: h.rejection_reason,
    rejectionDate: h.rejection_date,
    resubmissionDate: h.resubmission_date,
    resubmittedBy: h.resubmitted_by,
  }));

  return {
    id: row.id,
    projectCode,
    sequenceNumber: row.sequence_no,
    stage: stageMap[row.stage as keyof typeof stageMap] || 'Design NOC',
    reviewingAuthority: reviewingAuth,
    description: row.description,
    submittedBy:
      submitterMap[row.submitted_by as keyof typeof submitterMap] ||
      'Consultant',
    referenceNumber: row.reference_no || '',
    status:
      statusMap[row.status_code as keyof typeof statusMap] || 'Not Started',
    paymentFee: Number(row.payment_fee) || 0,
    isPaid: Boolean(row.is_paid),
    payerType: (row.payer_type as NocPayerType) || undefined,
    receiptFileUrl: row.receipt_file_url ?? undefined,
    planDate: row.plan_date || new Date().toISOString().split('T')[0],
    applyDate: row.apply_date ?? null,
    issuanceDate: row.receive_date ?? null,
    expiryDate: row.expiry_date ?? null,
    blockingSequenceNumber: row.blocking_sequence_no ?? null,
    requirements,
    revision: row.current_revision || 'R00',
    resubmissionHistory,
    overrideReason: row.override_reason ?? undefined,
    overriddenBy: row.overridden_by ?? undefined,
    overriddenAt: row.overridden_at ?? undefined,
    updatedAt: row.updated_at,
  };
}

// Fetches live project and NOC data with automatic fallback to seed items.
export async function getNocTrackerData(): Promise<NocTrackerData> {
  const fallbackData: NocTrackerData = {
    projects: SEED_PROJECTS,
    nocs: [
      ...INITIAL_NOCS_PROJECT_26001,
      ...INITIAL_NOCS_PROJECT_23016,
      ...INITIAL_NOCS_PROJECT_23015,
    ],
    isLive: false,
  };

  try {
    const supabase = await createClient();

    // 1. Fetch accessible projects via RLS policy
    const { data: dbProjects, error: projectsError } = await supabase
      .from('projects')
      .select(
        `
        id,
        code,
        description,
        client_name,
        master_authority_id,
        stage,
        contractor_name,
        client_contractor_amount,
        milestones,
        project_members (
          user_id,
          discipline,
          profiles (
            id,
            full_name,
            role
          )
        )
      `,
      )
      .is('archived_at', null)
      .order('code', { ascending: true });

    if (projectsError) {
      return fallbackData;
    }

    if (!dbProjects || dbProjects.length === 0) {
      return {
        projects: [],
        nocs: [],
        isLive: true,
      };
    }

    // 2. Fetch master and reviewing authorities lookup maps
    const [{ data: dbMasterAuths }, { data: dbRevAuths }] = await Promise.all([
      supabase.from('master_authorities').select('id, name'),
      supabase.from('reviewing_authorities').select('id, name'),
    ]);

    const masterAuthMap = new Map<number, string>();
    if (dbMasterAuths) {
      for (const a of dbMasterAuths) {
        masterAuthMap.set(a.id, a.name);
      }
    }

    const revAuthMap = new Map<number, string>();
    if (dbRevAuths) {
      for (const a of dbRevAuths) {
        revAuthMap.set(a.id, a.name);
      }
    }

    // 3. Fetch confidential consultant amounts if caller has permission
    const { data: confidentialRows } = await supabase
      .from('project_confidential')
      .select('project_id, client_consultant_amount');

    const confidentialMap = new Map<string, number>();
    if (confidentialRows) {
      for (const row of confidentialRows) {
        confidentialMap.set(
          row.project_id,
          Number(row.client_consultant_amount) || 0,
        );
      }
    }

    // 4. Map projects to AssignedProject
    const projectMap = new Map<string, AssignedProject>();
    const projectDbIdToCode = new Map<string, string>();

    for (const rawProj of dbProjects as unknown as RawDbProject[]) {
      const masterAuth = getAuthorityName(
        rawProj.master_authority_id,
        masterAuthMap,
      );
      const consultantAmt = confidentialMap.get(rawProj.id);
      const assigned = mapDbProjectToAssigned(
        rawProj,
        masterAuth,
        consultantAmt,
      );
      projectMap.set(rawProj.code, assigned);
      projectDbIdToCode.set(rawProj.id, rawProj.code);
    }

    // 4. Fetch project NOCs for accessible projects
    const projectIds = Array.from(projectDbIdToCode.keys());
    const { data: dbNocs } = await supabase
      .from('project_nocs')
      .select(
        `
        id,
        project_id,
        sequence_no,
        stage,
        reviewing_authority_id,
        description,
        submitted_by,
        status_code,
        payment_fee,
        is_paid,
        payer_type,
        receipt_file_url,
        plan_date,
        apply_date,
        receive_date,
        expiry_date,
        reference_no,
        remarks,
        file_url,
        blocking_sequence_no,
        current_revision,
        override_reason,
        overridden_by,
        overridden_at,
        updated_at,
        project_noc_requirements (
          id,
          title,
          is_satisfied,
          file_url
        ),
        noc_resubmission_history (
          id,
          revision,
          rejection_reason,
          rejection_date,
          resubmission_date,
          resubmitted_by
        )
      `,
      )
      .in('project_id', projectIds)
      .order('sequence_no', { ascending: true });

    const seedNocsMap: Record<string, ProjectNocItem[]> = {
      '26001': INITIAL_NOCS_PROJECT_26001,
      '23016': INITIAL_NOCS_PROJECT_23016,
      '23015': INITIAL_NOCS_PROJECT_23015,
    };

    // 5. Map NOC records from database
    const mappedNocs: ProjectNocItem[] = (dbNocs || []).map((row) => {
      const projectCode = projectDbIdToCode.get(row.project_id) || '26001';
      const reviewingAuthName = (revAuthMap.get(row.reviewing_authority_id) ||
        `Authority #${row.reviewing_authority_id}`) as ReviewingAuthority;
      return mapDbNocToItem(
        row as unknown as RawDbNoc,
        projectCode,
        reviewingAuthName,
      );
    });

    // Ensure every accessible project has NOCs available (fallback to seed if DB has none)
    const combinedNocs = [...mappedNocs];
    for (const projectCode of projectMap.keys()) {
      const hasNocs = combinedNocs.some((n) => n.projectCode === projectCode);
      if (!hasNocs && seedNocsMap[projectCode]) {
        combinedNocs.push(...seedNocsMap[projectCode]);
      }
    }

    return {
      projects: Array.from(projectMap.values()),
      nocs: combinedNocs,
      isLive: true,
    };
  } catch {
    return fallbackData;
  }
}
