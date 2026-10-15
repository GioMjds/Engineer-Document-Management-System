'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, FolderPlus, UserCheck } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StageGateDrawer } from '@/components/lifecycle/stage-gate-drawer';
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
import {
  evaluateStageGateReadiness,
  INITIAL_PROJECT_MILESTONES,
} from '@/lib/project-lifecycle';
import { INITIAL_PROJECT_DISCIPLINE_STATUS } from '@/lib/project-status';
import { ActionQueue } from './action-queue';
import { AttentionTiles, type QueueFilter } from './attention-tiles';
import { PortfolioTable } from './portfolio-table';
import { ProjectDisciplineCard } from './project-discipline-card';
import { useDashboardData } from './use-dashboard-data';

interface ExecutiveDashboardClientProps {
  projects: AssignedProject[];
  initialNocs: ProjectNocItem[];
  currentUserRole: string;
}

/** Dev-only. Set NEXT_PUBLIC_ENABLE_ROLE_PREVIEW=true in .env.local to show it. */
const ROLE_PREVIEW_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_ROLE_PREVIEW === 'true';
const AVAILABLE_ROLES = [
  { value: 'admin', label: 'Admin (Full Access)' },
  { value: 'ceo', label: 'CEO (Read Only Portfolio)' },
  { value: 'area_manager', label: 'Area Manager (Executive Review)' },
  { value: 'architect_engineer', label: 'Architect Engineer (Engr. Abram)' },
  { value: 'structure_engineer', label: 'Structure Engineer (Engr. Khalid)' },
  { value: 'mep_engineer', label: 'MEP Engineer (Engr. Hisham)' },
  { value: 'authority_engineer', label: 'Authority Engineer (Engr. Rasha)' },
  { value: 'resident_engineer', label: 'Resident Engineer (Engr. Abdel)' },
  { value: 'engineer', label: 'Engineer (Discipline Engineer)' },
  { value: 'dc', label: 'Document Controller (Ms. Jalilah)' },
  {
    value: 'doc_controller',
    label: 'Document Controller (Legacy doc_controller)',
  },
];

const now = () => new Date().toISOString();

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
    specialists: [],
  };
}

export function ExecutiveDashboardClient({
  projects,
  initialNocs,
  currentUserRole,
}: ExecutiveDashboardClientProps) {
  // NOTE: `projects` must already be scoped to the user's assignments on the
  // server (getNocTrackerData + RLS). Client-side filtering is not a security boundary.
  const [projectList, setProjectList] = useState<AssignedProject[]>(projects);
  const [milestonesMap, setMilestonesMap] = useState<
    Record<string, StageMilestoneDates>
  >(INITIAL_PROJECT_MILESTONES);
  const [disciplineStatuses, setDisciplineStatuses] = useState<
    Record<string, ProjectDisciplineStatus>
  >(INITIAL_PROJECT_DISCIPLINE_STATUS);
  const [gateDrawerProjectCode, setGateDrawerProjectCode] = useState<
    string | null
  >(null);
  const [currentRole, setCurrentRole] = useState<string>(
    currentUserRole || 'admin',
  );
  const [scope, setScope] = useState<string>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [nocItems] = useState<ProjectNocItem[]>(initialNocs);

  const data = useDashboardData(projectList, nocItems, scope);

  /* ---------- mutations (still local state; persist to Supabase next) ---------- */
  const patch = (
    code: string,
    fn: (c: ProjectDisciplineStatus) => ProjectDisciplineStatus,
  ) =>
    setDisciplineStatuses((prev) =>
      prev[code] ? { ...prev, [code]: fn(prev[code]) } : prev,
    );

  const handleUpdateDiscipline = (
    code: string,
    discipline: 'architecture' | 'structure' | 'mep',
    status: DisciplineStageStatus,
    remarks?: string,
  ) =>
    patch(code, (c) => ({
      ...c,
      [discipline]: {
        ...c[discipline],
        status,
        remarks: remarks !== undefined ? remarks : c[discipline].remarks,
        updatedAt: now(),
      },
    }));

  const handleUpdateAuthorityStage = (
    code: string,
    stageKey: 'designStage' | 'constructionStage' | 'revisionStage',
    status: DisciplineStageStatus,
  ) =>
    patch(code, (c) => ({
      ...c,
      authorities: { ...c.authorities, [stageKey]: status, updatedAt: now() },
    }));

  const handleUploadSpecialistFile = (
    code: string,
    type: ThirdPartySpecialistType,
    fileName: string,
    fileSize: string,
  ) =>
    patch(code, (c) => ({
      ...c,
      specialists: c.specialists.map((s) =>
        s.type === type
          ? {
              ...s,
              fileName,
              fileSize,
              uploadedBy: 'You',
              uploadedAt: now(),
              status: 'Uploaded' as const,
            }
          : s,
      ),
    }));

  const handleApproveSpecialistFile = (
    code: string,
    type: ThirdPartySpecialistType,
  ) =>
    patch(code, (c) => ({
      ...c,
      specialists: c.specialists.map((s) =>
        s.type === type ? { ...s, status: 'Approved' as const } : s,
      ),
    }));

  const handleAdvanceProjectStage = (
    code: string,
    newStage: ProjectLifecycleStage,
  ) =>
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

  const handleUpdateProjectMilestones = (
    code: string,
    milestones: StageMilestoneDates,
  ) => {
    setMilestonesMap((prev) => ({ ...prev, [code]: milestones }));
    setProjectList((prev) =>
      prev.map((p) => (p.code === code ? { ...p, milestones } : p)),
    );
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
            <Select value={scope} onValueChange={(v) => v && setScope(v)}>
              <SelectTrigger
                className="h-10 w-64 text-sm"
                aria-label="Project scope"
              >
                <SelectValue placeholder="All projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  All projects ({projectList.length})
                </SelectItem>
                {projectList.map((p) => (
                  <SelectItem key={p.code} value={p.code}>
                    #{p.code} · {p.name}
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

      {ROLE_PREVIEW_ENABLED && (
        <div className="flex w-fit items-center gap-2 rounded-lg border border-dashed border-warning bg-warning-subtle px-3 py-1.5 text-warning-fg">
          <UserCheck className="size-4" aria-hidden />
          <span className="text-xs font-semibold">Dev role preview</span>
          <Select
            value={currentRole}
            onValueChange={(v) => v && setCurrentRole(v)}
          >
            <SelectTrigger
              className="h-8 w-56 border-0 bg-transparent text-xs font-semibold"
              aria-label="Preview role"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AVAILABLE_ROLES.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-xs">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
              readiness={evaluateStageGateReadiness(
                p,
                nocItems,
                disciplineStatuses[project.code],
              )}
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
            disciplineStatuses[drawerProject.code],
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
