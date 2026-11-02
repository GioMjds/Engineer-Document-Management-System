'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  advanceProjectStageAction,
  updateProjectMilestonesAction,
  updateProjectDisciplineStatusAction,
} from '@/app/actions/noc';
import type { ExecutiveKpiSummary } from '@/app/loaders/ceo';
import { StageGateDrawer } from '@/components/lifecycle/stage-gate-drawer';
import { buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { can } from '@/lib/permissions';
import {
  evaluateStageGateReadiness,
} from '@/lib/project-lifecycle';
import { cn } from '@/lib/utils';
import type {
  AssignedProject,
  DisciplineStageStatus,
  ProjectDisciplineStatus,
  ProjectLifecycleStage,
  ProjectNocItem,
  StageMilestoneDates,
  ThirdPartySpecialistType,
} from '@/types/noc';
import { Building2, FolderPlus } from 'lucide-react';
import { ActionQueue } from './action-queue';
import { AreaManagerSummaryCards } from './area-manager-summary-cards';
import { AttentionTiles, type QueueFilter } from './attention-tiles';
import { EngineerSummaryCards } from './engineer-summary-cards';
import { ExecutiveSummaryCards } from './executive-summary-cards';
import { FinancialPortfolioWidget } from './financial-portfolio-widget';
import { PortfolioTable } from './portfolio-table';
import { ProjectDisciplineCard } from './project-discipline-card';
import { useDashboardData } from './use-dashboard-data';

interface ExecutiveDashboardClientProps {
  projects: AssignedProject[];
  initialNocs: ProjectNocItem[];
  currentUserRole: string;
  initialDisciplineStatuses?: Record<string, ProjectDisciplineStatus>;
  initialEngineerStats?: {
    totalUploaded: number;
    underReview: number;
    requiringRevision: number;
  };
  initialAreaManagerStats?: {
    escalatedDrawingsCount: number;
  };
  executiveSummary?: ExecutiveKpiSummary;
}

const now = () => new Date().toISOString();

const ALL_SPECIALIST_TYPES = [
  'Vertical Transportation',
  'Traffic Impact Study',
  'Green Building',
  'Topographical',
  'Geotechnical',
] satisfies ThirdPartySpecialistType[];

function emptyStatus(projectCode: string): ProjectDisciplineStatus {
  const base = {
    status: 'Not Started' as const,
    updatedBy: 'Unassigned',
    updatedAt: now(),
  };
  return {
    projectCode,
    architecture: { ...base },
    structure: { ...base },
    mep: { ...base },
    authorities: {
      designStage: 'Not Started',
      constructionStage: 'Not Started',
      revisionStage: 'Not Started',
      updatedBy: 'Unassigned',
      updatedAt: now(),
    },
    specialists: ALL_SPECIALIST_TYPES.map((type, idx) => ({
      id: `spec-${projectCode}-${idx + 1}`,
      type,
      status: 'Pending' as const,
    })),
  };
}

export function ExecutiveDashboardClient({
  projects,
  initialNocs,
  currentUserRole,
  initialDisciplineStatuses,
  initialEngineerStats,
  initialAreaManagerStats,
  executiveSummary,
}: ExecutiveDashboardClientProps) {
  const [projectList, setProjectList] = useState<AssignedProject[]>(projects);
  const [milestonesMap, setMilestonesMap] = useState<
    Record<string, StageMilestoneDates>
  >(() => {
    const initialMap: Record<string, StageMilestoneDates> = {};
    for (const p of projects) {
      if (p.milestones && Object.keys(p.milestones).length > 0) {
        initialMap[p.code] = p.milestones;
      }
    }
    return initialMap;
  });
  const [disciplineStatuses, setDisciplineStatuses] = useState<
    Record<string, ProjectDisciplineStatus>
  >(() => ({ ...initialDisciplineStatuses }));
  const [gateDrawerProjectCode, setGateDrawerProjectCode] = useState<
    string | null
  >(null);
  const currentRole = currentUserRole || 'admin';
  const [scope, setScope] = useState<string>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [nocItems] = useState<ProjectNocItem[]>(initialNocs);

  const data = useDashboardData(projectList, nocItems, scope);
  const isEngineer =
    currentRole === 'engineer' ||
    currentRole === 'architect_engineer' ||
    currentRole === 'structure_engineer' ||
    currentRole === 'mep_engineer';
  const isCeo = currentRole === 'ceo';
  const isAreaManager = currentRole === 'area_manager';
  const canViewFinancials = can(currentRole, 'amount.consultant.view');

  const activeExecutiveSummary = useMemo<ExecutiveKpiSummary>(() => {
    if (
      executiveSummary &&
      currentRole === currentUserRole &&
      scope === 'all'
    ) {
      return executiveSummary;
    }

    const totalProjects = data.scopedProjects.length;
    const totalNocs = data.scopedNocs.length;
    const approvedNocs = data.scopedNocs.filter(
      (n) => n.status === 'Approved',
    ).length;
    const completionPct =
      totalNocs > 0 ? Math.round((approvedNocs / totalNocs) * 100) : 0;
    const criticalDelays = data.delayItems.length;
    const expiring = data.expiringNocs.length;

    const financials = data.scopedProjects.map((p) => ({
      projectId: p.code,
      projectName: p.name,
      stage: p.lifecycleStage || 'Pre-Construction',
      contractorAmount: p.clientContractorAmount || 0,
      consultantAmount: p.clientConsultantAmount || 0,
    }));

    return {
      activeProjectsCount: totalProjects,
      nocCompletionPercentage: completionPct,
      criticalDelaysCount: criticalDelays,
      expiringNocsCount: expiring,
      reviewBacklogCount: 1,
      totalContractorAmount: financials.reduce(
        (s, f) => s + f.contractorAmount,
        0,
      ),
      totalConsultantAmount: financials.reduce(
        (s, f) => s + f.consultantAmount,
        0,
      ),
      projectFinancials: financials,
    };
  }, [
    executiveSummary,
    currentRole,
    currentUserRole,
    scope, // ← added
    data.scopedProjects, // ← was projectList
    data.scopedNocs, // ← was nocItems
    data.delayItems.length,
    data.expiringNocs.length,
  ]);

  const engineerStats = useMemo(() => {
    if (
      initialEngineerStats &&
      currentRole === currentUserRole &&
      scope === 'all'
    ) {
      return initialEngineerStats;
    }

    let totalUploaded = 0;
    let underReview = 0;
    let requiringRevision = 0;

    for (const project of data.scopedProjects) {
      const status = disciplineStatuses[project.code];
      if (!status) continue;
      const disciplines: ('architecture' | 'structure' | 'mep')[] =
        currentRole === 'architect_engineer'
          ? ['architecture']
          : currentRole === 'structure_engineer'
            ? ['structure']
            : currentRole === 'mep_engineer'
              ? ['mep']
              : ['architecture', 'structure', 'mep'];

      for (const d of disciplines) {
        const item = status[d];
        if (!item) continue;
        if (item.status !== 'Not Started') {
          totalUploaded += 1;
        }
        if (
          item.status === 'Under Review' ||
          item.status === 'Client Approval'
        ) {
          underReview += 1;
        }
        if (item.status === 'On Hold') {
          requiringRevision += 1;
        }
      }
    }

    return { totalUploaded, underReview, requiringRevision };
  }, [
    initialEngineerStats,
    currentRole,
    currentUserRole,
    scope,
    data.scopedProjects,
    disciplineStatuses,
  ]);

  /* ---------- mutations (local state) ---------- */
  const patch = (
    code: string,
    fn: (c: ProjectDisciplineStatus) => ProjectDisciplineStatus,
  ) =>
    setDisciplineStatuses((prev) => {
      const current = prev[code] ?? emptyStatus(code);
      const nextStatus = fn(current);
      void updateProjectDisciplineStatusAction(code, nextStatus);
      return { ...prev, [code]: nextStatus };
    });

  const handleUpdateDiscipline = (
    code: string,
    discipline: 'architecture' | 'structure' | 'mep',
    status: DisciplineStageStatus,
    remarks?: string,
  ) => {
    const actor =
      currentRole === 'admin'
        ? 'System Administrator'
        : currentRole.replace(/_/g, ' ');
    patch(code, (c) => ({
      ...c,
      [discipline]: {
        ...c[discipline],
        status,
        remarks: remarks !== undefined ? remarks : c[discipline].remarks,
        updatedBy: actor,
        updatedAt: now(),
      },
    }));
  };

  const handleUpdateAuthorityStage = (
    code: string,
    stageKey: 'designStage' | 'constructionStage' | 'revisionStage',
    status: DisciplineStageStatus,
  ) => {
    const actor =
      currentRole === 'admin'
        ? 'System Administrator'
        : currentRole.replace(/_/g, ' ');
    patch(code, (c) => ({
      ...c,
      authorities: {
        ...c.authorities,
        [stageKey]: status,
        updatedBy: actor,
        updatedAt: now(),
      },
    }));
  };

  const handleUploadSpecialistFile = (
    code: string,
    type: ThirdPartySpecialistType,
    fileName: string,
    fileSize: string,
  ) => {
    const actor =
      currentRole === 'admin'
        ? 'System Administrator'
        : currentRole.replace(/_/g, ' ');
    patch(code, (c) => {
      const list = c.specialists || [];
      const exists = list.some((s) => s.type === type);
      const updatedItem = {
        id: `spec-${code}-${type.toLowerCase().replace(/\s+/g, '-')}`,
        type,
        fileName,
        fileSize,
        uploadedBy: actor,
        uploadedAt: now(),
        status: 'Uploaded' as const,
      };

      const updatedSpecialists = exists
        ? list.map((s) => (s.type === type ? { ...s, ...updatedItem } : s))
        : [...list, updatedItem];

      return {
        ...c,
        specialists: updatedSpecialists,
      };
    });
  };

  const handleApproveSpecialistFile = (
    code: string,
    type: ThirdPartySpecialistType,
  ) =>
    patch(code, (c) => {
      const list = c.specialists || [];
      const exists = list.some((s) => s.type === type);
      const updatedSpecialists = exists
        ? list.map((s) =>
            s.type === type ? { ...s, status: 'Approved' as const } : s,
          )
        : [
            ...list,
            {
              id: `spec-${code}-${type.toLowerCase().replace(/\s+/g, '-')}`,
              type,
              status: 'Approved' as const,
              uploadedAt: now(),
            },
          ];

      return {
        ...c,
        specialists: updatedSpecialists,
      };
    });

  const handleAdvanceProjectStage = async (
    code: string,
    newStage: ProjectLifecycleStage,
  ) => {
    setProjectList((prev) =>
      prev.map((p) =>
        p.code === code
          ? {
              ...p,
              lifecycleStage: newStage,
              currentStage: `${newStage} Stage`,
            }
          : p,
      ),
    );
    await advanceProjectStageAction(code, newStage);
  };

  const handleUpdateProjectMilestones = async (
    code: string,
    milestones: StageMilestoneDates,
  ) => {
    setMilestonesMap((prev) => ({ ...prev, [code]: milestones }));
    setProjectList((prev) =>
      prev.map((p) => (p.code === code ? { ...p, milestones } : p)),
    );
    await updateProjectMilestonesAction(code, milestones);
  };

  /* ---------- derived ---------- */
  const withMilestones = (p: AssignedProject): AssignedProject => ({
    ...p,
    milestones: milestonesMap[p.code] || p.milestones,
  });

  const drawerProject = useMemo(() => {
    const found = gateDrawerProjectCode
      ? projectList.find((p) => p.code === gateDrawerProjectCode)
      : null;
    return found
      ? { ...found, milestones: milestonesMap[found.code] || found.milestones }
      : null;
  }, [projectList, gateDrawerProjectCode, milestonesMap]);

  const scopeOptions = useMemo(
    () => [
      {
        value: 'all',
        label:
          projectList.length > 0
            ? `All Projects (${projectList.length})`
            : 'All Projects',
      },
      ...projectList.map((p) => ({
        value: p.code,
        label: `#${p.code} · ${p.name}`,
      })),
    ],
    [projectList],
  );

  const selectedScopeLabel = useMemo(() => {
    if (scope === 'all') {
      return projectList.length > 0
        ? `All Projects (${projectList.length})`
        : 'All Projects';
    }
    const found = projectList.find((p) => p.code === scope);
    return found ? `#${found.code} · ${found.name}` : 'All Projects';
  }, [scope, projectList]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <header className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Executive Command Deck
          </h1>
          <p className="text-sm text-muted-foreground">
            Portfolio oversight, submittal delays and 14-day expiry alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-muted-foreground" aria-hidden />
            <Select
              value={scope}
              items={scopeOptions}
              onValueChange={(v) => v && setScope(v)}
            >
              <SelectTrigger
                className="h-10 w-64 text-sm"
                aria-label="Project scope"
              >
                <SelectValue placeholder="All Projects">
                  {selectedScopeLabel}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {scopeOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {currentRole === 'admin' && (
            <Link
              href="/projects/new"
              className={cn(
                buttonVariants({ size: 'default' }),
                'h-10 gap-1.5',
              )}
            >
              <FolderPlus className="size-4" aria-hidden />
              New project
            </Link>
          )}
        </div>
      </header>


      {isEngineer && (
        <EngineerSummaryCards
          totalUploaded={engineerStats.totalUploaded}
          underReview={engineerStats.underReview}
          requiringRevision={engineerStats.requiringRevision}
        />
      )}

      {isCeo && (
        <ExecutiveSummaryCards
          activeProjectsCount={activeExecutiveSummary.activeProjectsCount}
          nocCompletionPercentage={
            activeExecutiveSummary.nocCompletionPercentage
          }
          criticalDelaysCount={activeExecutiveSummary.criticalDelaysCount}
          expiringNocsCount={activeExecutiveSummary.expiringNocsCount}
          reviewBacklogCount={activeExecutiveSummary.reviewBacklogCount}
        />
      )}

      {isAreaManager && (
        <AreaManagerSummaryCards
          totalActiveProjects={data.scopedProjects.length}
          escalatedDrawingsCount={
            initialAreaManagerStats?.escalatedDrawingsCount ??
            activeExecutiveSummary.reviewBacklogCount
          }
          pendingAuthorityApprovals={
            data.scopedNocs.filter(
              (n) =>
                n.status === 'Submitted' || n.status === 'Pending for Payment',
            ).length
          }
          totalContractorAmount={activeExecutiveSummary.totalContractorAmount}
          totalConsultantAmount={activeExecutiveSummary.totalConsultantAmount}
        />
      )}

      <AttentionTiles
        totalProjects={data.scopedProjects.length}
        delayedCount={data.delayItems.length}
        avgDelayDays={data.avgDelayDays}
        avgPlanDelayDays={data.avgPlanDelayDays}
        expiringCount={data.expiringNocs.length}
        approvedNocCount={data.approvedCount}
        totalNocCount={data.scopedNocs.length}
        clearanceRate={data.clearanceRate}
        stageDistribution={data.stageDistribution}
        activeFilter={queueFilter}
        onSelectFilter={setQueueFilter}
      />

      {(canViewFinancials || isCeo) && (
        <FinancialPortfolioWidget
          totalContractorAmount={activeExecutiveSummary.totalContractorAmount}
          totalConsultantAmount={activeExecutiveSummary.totalConsultantAmount}
          projectFinancials={activeExecutiveSummary.projectFinancials}
        />
      )}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <ActionQueue
            delayItems={data.delayItems}
            expiringNocs={data.expiringNocs}
            filter={queueFilter}
          />
        </div>
        <LifecyclePipeline distribution={data.stageDistribution} />
      </div>

      <PortfolioTable
        projects={data.scopedProjects}
        nocStats={data.nocStats}
        statusFor={(code) => disciplineStatuses[code] ?? emptyStatus(code)}
        renderDetail={(project) => {
          const p = withMilestones(project);
          return (
            <ProjectDisciplineCard
              project={p}
              statusRecord={
                disciplineStatuses[project.code] ?? emptyStatus(project.code)
              }
              userRole={currentRole}
              readiness={evaluateStageGateReadiness(p, nocItems)}
              milestones={milestonesMap[project.code]}
              onOpenGateDetails={() => setGateDrawerProjectCode(project.code)}
              onUpdateDiscipline={handleUpdateDiscipline}
              onUpdateAuthorityStage={handleUpdateAuthorityStage}
              onUploadSpecialistFile={handleUploadSpecialistFile}
              onApproveSpecialistFile={handleApproveSpecialistFile}
            />
          );
        }}
      />

      {drawerProject && (
        <StageGateDrawer
          project={drawerProject}
          readiness={evaluateStageGateReadiness(
            drawerProject,
            nocItems,
          )}
          currentUserRole={currentRole}
          isOpen
          onClose={() => setGateDrawerProjectCode(null)}
          onAdvanceStage={(s) =>
            handleAdvanceProjectStage(drawerProject.code, s)
          }
          onUpdateMilestones={(m) =>
            handleUpdateProjectMilestones(drawerProject.code, m)
          }
        />
      )}
    </div>
  );
}

/* ---------- Lifecycle pipeline (small enough to live here) ---------- */
const STAGE_ORDER = ['pre-construction', 'construction', 'handover'];
const stageRank = (s: string) => {
  const i = STAGE_ORDER.indexOf(s.toLowerCase().replace(/\s+/g, '-'));
  return i === -1 ? 99 : i;
};

function LifecyclePipeline({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const entries = Object.entries(distribution).sort(
    ([a], [b]) => stageRank(a) - stageRank(b),
  );
  const total = entries.reduce((sum, [, n]) => sum + n, 0);

  return (
    <section
      aria-labelledby="pipeline-heading"
      className="rounded-lg border border-border bg-card p-4"
    >
      <h2 id="pipeline-heading" className="text-sm font-semibold">
        Lifecycle pipeline
      </h2>
      <p className="text-xs text-muted-foreground">
        Projects by construction stage.
      </p>
      {total === 0 ? (
        <p className="mt-6 text-center text-sm text-muted-foreground">
          No projects in this scope.
        </p>
      ) : (
        <ul className="mt-4 space-y-4">
          {entries.map(([stage, count]) => (
            <li key={stage}>
              <div className="flex items-baseline justify-between text-sm">
                <span>{stage}</span>
                <span className="font-mono tabular-nums">{count}</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted" aria-hidden>
                <div
                  className="h-full rounded-full bg-primary"
                  style={{ width: `${(count / total) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
