import { useMemo } from 'react';
import { calculateSubmittalDelays } from '@/lib/project-status';
import { calculateDaysRemaining, isExpiringSoon } from '@/lib/noc-tracker';
import type { AssignedProject, ProjectNocItem } from '@/types/noc';

export interface ProjectNocStats {
  total: number;
  approved: number;
  /** Days until the soonest approved NOC expires; negative = lapsed; null = none. */
  nextExpiryDays: number | null;
}

/**
 * All derived dashboard numbers in one place. `scope` ('all' | project code)
 * now applies to EVERY section, not just the card grid.
 */
export function useDashboardData(
  projects: AssignedProject[],
  nocs: ProjectNocItem[],
  scope: string,
) {
  return useMemo(() => {
    const scopedProjects =
      scope === 'all' ? projects : projects.filter((p) => p.code === scope);
    const codes = new Set(scopedProjects.map((p) => p.code));
    const scopedNocs = nocs.filter((n) => codes.has(n.projectCode));

    const delayItems = calculateSubmittalDelays(scopedNocs, projects);
    const expiringNocs = scopedNocs.filter(
      (n) => n.status === 'Approved' && isExpiringSoon(n.expiryDate),
    );

    const avg = (xs: number[]) =>
      xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0;
    const avgDelayDays = avg(delayItems.map((d) => d.daysDelayed));
    const avgPlanDelayDays = avg(
      delayItems.map((d) => d.planDelayDays ?? d.daysDelayed),
    );

    const approvedCount = scopedNocs.filter(
      (n) => n.status === 'Approved',
    ).length;
    const clearanceRate = scopedNocs.length
      ? Math.round((approvedCount / scopedNocs.length) * 100)
      : 0;

    const stageDistribution: Record<string, number> = {};
    for (const p of scopedProjects) {
      const stage = p.lifecycleStage || 'Pre-Construction';
      stageDistribution[stage] = (stageDistribution[stage] ?? 0) + 1;
    }

    const nocStats: Record<string, ProjectNocStats> = {};
    for (const n of scopedNocs) {
      const s = (nocStats[n.projectCode] ??= {
        total: 0,
        approved: 0,
        nextExpiryDays: null,
      });
      s.total += 1;
      if (n.status === 'Approved') {
        s.approved += 1;
        const d = calculateDaysRemaining(n.expiryDate);
        if (d != null && (s.nextExpiryDays === null || d < s.nextExpiryDays)) {
          s.nextExpiryDays = d;
        }
      }
    }

    return {
      scopedProjects,
      scopedNocs,
      delayItems,
      expiringNocs,
      avgDelayDays,
      avgPlanDelayDays,
      approvedCount,
      clearanceRate,
      stageDistribution,
      nocStats,
    };
  }, [projects, nocs, scope]);
}
