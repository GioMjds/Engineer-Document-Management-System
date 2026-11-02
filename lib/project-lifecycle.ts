import type {
  AssignedProject,
  ProjectNocItem,
  ProjectLifecycleStage,
  StageGateReadiness,
  StageGatePrerequisiteItem,
  ProjectDocumentItem,
} from '@/types/noc';

export function getNextLifecycleStage(
  current: ProjectLifecycleStage,
): ProjectLifecycleStage | 'Completed' {
  switch (current) {
    case 'Pre-Construction':
      return 'Construction';
    case 'Construction':
      return 'Handover';
    case 'Handover':
    case 'Completed':
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

export function canUserModifyMilestones(role: string): boolean {
  return canUserAdvanceStage(role);
}

function isNocSatisfied(noc?: ProjectNocItem): boolean {
  if (!noc) return false;
  return noc.status === 'Approved' || noc.status === 'Not Needed';
}

export function evaluateStageGateReadiness(
  project: AssignedProject,
  allNocs: ProjectNocItem[],
  projectDocuments?: ProjectDocumentItem[],
): StageGateReadiness {
  const currentStage = (project.lifecycleStage ||
    'Pre-Construction') as ProjectLifecycleStage;

  if (currentStage === 'Completed') {
    return {
      stage: 'Completed',
      nextStage: 'Completed',
      totalPrerequisites: 0,
      satisfiedPrerequisites: 0,
      readinessPercentage: 100,
      isGateReady: true,
      prerequisites: [],
    };
  }

  const nextStage = getNextLifecycleStage(currentStage);
  const projectNocs = allNocs.filter((n) => n.projectCode === project.code);
  const milestones = project.milestones || {};

  const prerequisites: StageGatePrerequisiteItem[] = [];

  if (currentStage === 'Pre-Construction') {
    const topoDoc = projectDocuments?.find(
      (d) =>
        d.title.toLowerCase().includes('topographical') ||
        d.title.toLowerCase().includes('survey') ||
        d.docNumber.toLowerCase().includes('topo'),
    );
    const topoSpecialist = milestones.disciplineStatus?.specialists?.find(
      (s) => s.type === 'Topographical',
    );
    const isTopoSatisfied =
      topoSpecialist?.status === 'Approved' ||
      Boolean(topoDoc) ||
      Boolean(milestones.preConstruction?.surveyCompletionDate);

    prerequisites.push({
      id: 'gate-topo',
      title: 'Topographical Affection Survey Completed',
      category: 'specialist_study',
      isSatisfied: isTopoSatisfied,
      sourceReference:
        topoSpecialist?.fileName ||
        topoDoc?.docNumber ||
        milestones.preConstruction?.surveyCompletionDate ||
        (topoSpecialist?.status === 'Approved' ? 'Approved Study' : undefined),
      mandatoryForNextStage: true,
      actionHint:
        'Upload & approve topographical survey in Specialist Studies, Technical Submittals, or set survey date in milestones.',
    });

    const geotechDoc = projectDocuments?.find(
      (d) =>
        d.title.toLowerCase().includes('geotechnical') ||
        d.title.toLowerCase().includes('soil') ||
        d.docNumber.toLowerCase().includes('geo'),
    );
    const geotechSpecialist = milestones.disciplineStatus?.specialists?.find(
      (s) => s.type === 'Geotechnical',
    );
    const isGeotechSatisfied =
      geotechSpecialist?.status === 'Approved' || Boolean(geotechDoc);

    prerequisites.push({
      id: 'gate-geotech',
      title: 'Geotechnical Soil Investigation Approved',
      category: 'specialist_study',
      isSatisfied: isGeotechSatisfied,
      sourceReference:
        geotechSpecialist?.fileName ||
        geotechDoc?.docNumber ||
        (geotechSpecialist?.status === 'Approved' ? 'Approved Study' : undefined),
      mandatoryForNextStage: true,
      actionHint:
        'Upload & approve geotechnical report in Specialist Studies (Third-Party Studies drawer).',
    });

    prerequisites.push({
      id: 'gate-concept',
      title: 'Concept Master Plan & Affection Sign-Off',
      category: 'regulatory_milestone',
      isSatisfied: Boolean(milestones.preConstruction?.conceptApprovalDate),
      sourceReference: milestones.preConstruction?.conceptApprovalDate,
      mandatoryForNextStage: true,
      actionHint:
        'Set Concept Approval date in Milestone Dates Reference below.',
    });

    // Dynamic statutory authority NOCs assigned to this project for Pre-Construction
    const preConNocs = projectNocs.filter(
      (n) => n.stage === 'Design NOC' || n.stage === 'Information NOC',
    );
    for (const noc of preConNocs) {
      prerequisites.push({
        id: `gate-noc-${noc.id || noc.sequenceNumber}`,
        title: `${noc.reviewingAuthority ? noc.reviewingAuthority + ': ' : ''}${noc.description}`,
        category: 'authority_noc',
        isSatisfied: isNocSatisfied(noc),
        sourceReference:
          noc.referenceNumber ||
          (noc.status === 'Approved'
            ? 'Approved'
            : noc.status === 'Not Needed'
              ? 'Exempt'
              : 'Pending Authority Clearance'),
        mandatoryForNextStage: true,
        actionHint:
          'Set NOC status to Approved or Not Needed (Exempt) in tracker table.',
      });
    }

    prerequisites.push({
      id: 'gate-permit',
      title: 'Official Building Permit Issuance',
      category: 'regulatory_milestone',
      isSatisfied: Boolean(milestones.preConstruction?.buildingPermitDate),
      sourceReference:
        milestones.preConstruction?.buildingPermitDate || 'Pending Issuance',
      mandatoryForNextStage: true,
      actionHint:
        'Record Building Permit Issuance date in Milestone Dates Reference below.',
    });
  } else if (currentStage === 'Construction') {
    // Dynamic statutory authority NOCs assigned to this project for Construction
    const constrNocs = projectNocs.filter(
      (n) => n.stage === 'Construction NOC',
    );
    for (const noc of constrNocs) {
      prerequisites.push({
        id: `gate-noc-${noc.id || noc.sequenceNumber}`,
        title: `${noc.reviewingAuthority ? noc.reviewingAuthority + ': ' : ''}${noc.description}`,
        category: 'authority_noc',
        isSatisfied: isNocSatisfied(noc),
        sourceReference:
          noc.referenceNumber ||
          (noc.status === 'Approved'
            ? 'Approved'
            : noc.status === 'Not Needed'
              ? 'Exempt'
              : 'Pending Authority Clearance'),
        mandatoryForNextStage: true,
        actionHint:
          'Set NOC status to Approved or Not Needed (Exempt) in tracker table.',
      });
    }

    const structDoc = projectDocuments?.find(
      (d) =>
        d.discipline === 'structure' &&
        (d.status === 'approved' || d.status === 'ready_for_authority'),
    );
    const isStructSatisfied =
      milestones.disciplineStatus?.structure?.status === 'Approved' ||
      milestones.disciplineStatus?.authorities?.constructionStage === 'Approved' ||
      Boolean(structDoc);

    prerequisites.push({
      id: 'gate-superstructure',
      title: 'Core & Structural Superstructure Inspection',
      category: 'discipline_approval',
      isSatisfied: isStructSatisfied,
      sourceReference:
        structDoc?.docNumber ||
        (milestones.disciplineStatus?.structure?.status === 'Approved'
          ? 'Structure Discipline Approved'
          : milestones.disciplineStatus?.authorities?.constructionStage === 'Approved'
            ? 'Authorities Construction Approved'
            : undefined),
      mandatoryForNextStage: true,
      actionHint:
        'Approve Structure discipline progress or ensure an approved structural drawing exists.',
    });

    const mepDoc = projectDocuments?.find(
      (d) =>
        d.discipline === 'mep' &&
        (d.status === 'approved' || d.status === 'ready_for_authority'),
    );
    const isMepSatisfied =
      milestones.disciplineStatus?.mep?.status === 'Approved' ||
      Boolean(milestones.handover?.commissioningDate) ||
      Boolean(mepDoc);

    prerequisites.push({
      id: 'gate-mep-submittal',
      title: 'MEP Riser & Chilled Water Commissioning Sign-off',
      category: 'discipline_approval',
      isSatisfied: isMepSatisfied,
      sourceReference:
        mepDoc?.docNumber ||
        (milestones.disciplineStatus?.mep?.status === 'Approved'
          ? 'MEP Discipline Approved'
          : undefined) ||
        milestones.handover?.commissioningDate,
      mandatoryForNextStage: false,
      actionHint:
        'Approve MEP discipline progress or ensure an approved MEP drawing exists.',
    });
  } else {
    // Handover Stage: Dynamic statutory authority NOCs assigned to this project
    const handoverNocs = projectNocs.filter(
      (n) => n.stage === 'Handover NOC',
    );
    for (const noc of handoverNocs) {
      prerequisites.push({
        id: `gate-noc-${noc.id || noc.sequenceNumber}`,
        title: `${noc.reviewingAuthority ? noc.reviewingAuthority + ': ' : ''}${noc.description}`,
        category: 'authority_noc',
        isSatisfied: isNocSatisfied(noc),
        sourceReference:
          noc.referenceNumber ||
          (noc.status === 'Approved'
            ? 'Approved'
            : noc.status === 'Not Needed'
              ? 'Exempt'
              : 'Pending Authority Inspection'),
        mandatoryForNextStage: true,
        actionHint:
          'Set NOC status to Approved or Not Needed (Exempt) in tracker table.',
      });
    }

    if (handoverNocs.length === 0) {
      const dcdDate = milestones.handover?.civilDefenceInspectionDate;
      prerequisites.push({
        id: 'gate-dcd',
        title: 'Civil Defence (DCD) Fire & Life Safety Clearance',
        category: 'authority_noc',
        isSatisfied: Boolean(dcdDate),
        sourceReference: dcdDate || 'Pending DCD Inspection',
        mandatoryForNextStage: true,
        actionHint:
          'Record Civil Defence (DCD) Inspection date in Milestone Dates Reference below or assign Handover NOC.',
      });
    }

    prerequisites.push({
      id: 'gate-bcc',
      title: 'Building Completion Certificate (BCC)',
      category: 'regulatory_milestone',
      isSatisfied: Boolean(milestones.handover?.bccIssuanceDate),
      sourceReference:
        milestones.handover?.bccIssuanceDate || 'Pending Authority Inspection',
      mandatoryForNextStage: true,
      actionHint:
        'Record Building Completion Certificate (BCC) issuance date in Milestone Dates Reference below.',
    });
  }

  // Merge custom stage prerequisites defined for this stage
  if (milestones.customPrerequisites && Array.isArray(milestones.customPrerequisites)) {
    const stageCustoms = milestones.customPrerequisites.filter(
      (cp) => cp.stage === currentStage,
    );
    for (const cp of stageCustoms) {
      prerequisites.push({
        id: cp.id,
        title: cp.title,
        category: cp.category,
        isSatisfied: cp.isSatisfied,
        sourceReference: cp.sourceReference || 'Custom Gate Requirement',
        mandatoryForNextStage: cp.mandatoryForNextStage ?? true,
        actionHint: cp.actionHint || 'Mark satisfied when requirement is fulfilled.',
        isCustom: true,
      });
    }
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
