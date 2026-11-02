import type {
  ProjectNocItem,
  AssignedProject,
  SubmittalDelayItem,
} from '@/types/noc';

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
    case 'structure':
    case 'mep':
      return normalized === 'engineer' || normalized === 'resident_engineer' || normalized === 'area_manager';
    case 'authorities':
      return normalized === 'authority_engineer' || normalized === 'dc';
    default:
      return false;
  }
}
