import { createClient } from '@/lib/supabase/server';
import {
  SEED_PROJECTS,
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
  user_id: string;
  profiles: RawProfile | null;
}

interface RawDbProject {
  id: string;
  code: string;
  description: string;
  client_name: string | null;
  master_authority_id: number;
  stage: string;
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
          if (lower.includes('mep')) {
            roles.mepEngineer = name;
          } else if (lower.includes('architect')) {
            roles.architectEngineer = name;
          } else if (lower.includes('structur')) {
            roles.structureEngineer = name;
          } else if (lower.includes('civil') || lower.includes('ismail')) {
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
    code: p.code,
    name: p.description || p.code,
    masterAuthority: masterAuth,
    projectType: 'Commercial & Residential',
    location: 'Dubai, UAE',
    contractType: 'Design & Supervision',
    currentStage: p.stage
      ? p.stage.charAt(0).toUpperCase() + p.stage.slice(1)
      : 'Pre-Construction',
    lifecycleStage: stageMap[p.stage] || 'Pre-Construction',
    assignedRoles: roles,
  };
}

// Maps database NOC row to ProjectNocItem.
function mapDbNocToItem(
  row: RawDbNoc,
  projectCode: string,
  reviewingAuth: ReviewingAuthority,
): ProjectNocItem {
  const stageMap: Record<string, NocStage> = {
    design: 'Design NOC',
    information: 'Information NOC',
    construction: 'Construction NOC',
    handover: 'Handover NOC',
  };

  const statusMap: Record<string, NocStatus> = {
    approved: 'Approved',
    obtained: 'Approved',
    rejected: 'Rejected',
    submitted: 'Submitted',
    not_started: 'Not Started',
    pending_payment: 'Pending for Payment',
    pending_for_payment: 'Pending for Payment',
    not_needed: 'Not Needed',
    expired: 'Expired',
  };

  const submitterMap: Record<string, SubmittedBy> = {
    consultant: 'Consultant',
    client: 'Client',
    contractor: 'Contractor',
    specialist: 'Specialists',
    specialists: 'Specialists',
  };

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
    stage: stageMap[row.stage] || 'Design NOC',
    reviewingAuthority: reviewingAuth,
    description: row.description,
    submittedBy: submitterMap[row.submitted_by] || 'Consultant',
    referenceNumber: row.reference_no || '',
    status: statusMap[row.status_code] || 'Not Started',
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
    nocs: [...INITIAL_NOCS_PROJECT_23016, ...INITIAL_NOCS_PROJECT_23015],
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
        project_members (
          user_id,
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

    if (projectsError || !dbProjects || dbProjects.length === 0) {
      return fallbackData;
    }

    // 2. Fetch reviewing authorities lookup map
    const { data: dbRevAuths } = await supabase
      .from('reviewing_authorities')
      .select('id, name');

    const revAuthMap = new Map<number, string>();
    if (dbRevAuths) {
      for (const a of dbRevAuths) {
        revAuthMap.set(a.id, a.name);
      }
    }

    // 3. Map projects to AssignedProject
    const projectMap = new Map<string, AssignedProject>();
    const projectDbIdToCode = new Map<string, string>();

    for (const rawProj of dbProjects as unknown as RawDbProject[]) {
      const masterAuth = getAuthorityName(rawProj.master_authority_id);
      const assigned = mapDbProjectToAssigned(rawProj, masterAuth);
      projectMap.set(rawProj.code, assigned);
      projectDbIdToCode.set(rawProj.id, rawProj.code);
    }

    // 4. Fetch project NOCs for accessible projects
    const projectIds = Array.from(projectDbIdToCode.keys());
    const { data: dbNocs, error: nocsError } = await supabase
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

    if (nocsError || !dbNocs || dbNocs.length === 0) {
      return {
        projects: Array.from(projectMap.values()),
        nocs: [...INITIAL_NOCS_PROJECT_23016, ...INITIAL_NOCS_PROJECT_23015],
        isLive: true,
      };
    }

    // 5. Map NOC records
    const mappedNocs: ProjectNocItem[] = (dbNocs as unknown as RawDbNoc[]).map(
      (row) => {
        const projectCode = projectDbIdToCode.get(row.project_id) || '23016';
        const reviewingAuthName = (revAuthMap.get(row.reviewing_authority_id) ||
          'DEWA') as ReviewingAuthority;
        return mapDbNocToItem(row, projectCode, reviewingAuthName);
      },
    );

    return {
      projects: Array.from(projectMap.values()),
      nocs: mappedNocs,
      isLive: true,
    };
  } catch {
    return fallbackData;
  }
}
