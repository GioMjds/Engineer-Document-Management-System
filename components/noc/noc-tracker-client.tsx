'use client';

import {
  advanceProjectStageAction,
  updateProjectMilestonesAction,
  updateProjectDisciplineStatusAction,
} from '@/app/actions/noc';
import { ProjectLifecycleStepper } from '@/components/lifecycle/project-lifecycle-stepper';
import { StageGateDrawer } from '@/components/lifecycle/stage-gate-drawer';
import { ProjectDisciplineCard } from '@/components/dashboard/project-discipline-card';
import { emptyDisciplineStatus } from '@/lib/project-status';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { matchesUrgentFilter } from '@/lib/noc-summary';
import {
  evaluateStageGateReadiness,
} from '@/lib/project-lifecycle';
import { createClient } from '@/lib/supabase/client';
import type {
  AssignedProject,
  DisciplineStageStatus,
  NocStage,
  ProjectDisciplineStatus,
  ProjectDocumentItem,
  ProjectLifecycleStage,
  ProjectNocItem,
  ReviewingAuthority,
  StageMilestoneDates,
  ThirdPartySpecialistType,
} from '@/types/noc';
import { Filter, Search } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { NocAlertBanner } from './noc-alert-banner';
import { NocDataTable } from './noc-data-table';
import { NocInspectorDrawer } from './noc-inspector-drawer';
import { NocProjectHeader } from './noc-project-header';

interface NocTrackerClientProps {
  /** The project from the URL (/noc-tracker/[projectId]). */
  project: AssignedProject;
  /** NOCs for this project only (filtered on the server). */
  initialNocs: ProjectNocItem[];
  /** Technical submittals and specialist studies for this project */
  projectDocuments?: ProjectDocumentItem[];
  currentUserRole: string;
}

const STAGES = [
  'Design NOC',
  'Construction NOC',
  'Information NOC',
  'Handover NOC',
] satisfies NocStage[];

const ALL_AUTHORITIES = 'all';

const tabClass = (active: boolean) =>
  `flex h-9 items-center gap-1.5 whitespace-nowrap rounded border px-3 text-xs font-medium transition-colors motion-reduce:transition-none ${
    active
      ? 'border-primary bg-primary text-primary-foreground shadow-xs'
      : 'border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground'
  }`;

const countClass = (active: boolean) =>
  `rounded px-1.5 py-0.5 font-mono text-xs ${
    active
      ? 'bg-primary-foreground/20 text-primary-foreground'
      : 'bg-muted text-muted-foreground'
  }`;

export function NocTrackerClient({
  project,
  initialNocs,
  projectDocuments = [],
  currentUserRole,
}: NocTrackerClientProps) {
  const router = useRouter();
  const [lifecycleStage, setLifecycleStage] = useState<ProjectLifecycleStage>(
    project.lifecycleStage || 'Pre-Construction',
  );
  const [milestones, setMilestones] = useState<StageMilestoneDates>(
    project.milestones || {},
  );
  const [disciplineStatus, setDisciplineStatus] = useState<ProjectDisciplineStatus>(
    () => project.milestones?.disciplineStatus || emptyDisciplineStatus(project.code),
  );
  const [isGateDrawerOpen, setIsGateDrawerOpen] = useState(false);
  const [nocItems, setNocItems] = useState<ProjectNocItem[]>(initialNocs);
  const [activeStage, setActiveStage] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [authorityFilter, setAuthorityFilter] =
    useState<string>(ALL_AUTHORITIES);
  const [urgentFilter, setUrgentFilter] = useState<string | null>(null);
  const [selectedNoc, setSelectedNoc] = useState<ProjectNocItem | null>(null);

  // Sync initialNocs when parent server component re-renders.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => setNocItems(initialNocs), 0);
    return () => window.clearTimeout(timeoutId);
  }, [initialNocs]);

  // Subscribe to real-time database changes for milestone synchronization across roles.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`realtime-project-${project.code}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'projects',
          filter: `code=eq.${project.code}`,
        },
        (payload) => {
          if (payload.new && 'milestones' in payload.new) {
            const newMilestones = payload.new.milestones as StageMilestoneDates;
            if (newMilestones) {
              setMilestones(newMilestones);
              if (newMilestones.disciplineStatus) {
                setDisciplineStatus(newMilestones.disciplineStatus);
              }
            }
          }
          if (payload.new && 'stage' in payload.new) {
            const stageMap: Record<string, ProjectLifecycleStage> = {
              planning: 'Pre-Construction',
              design: 'Pre-Construction',
              construction: 'Construction',
              handover: 'Handover',
              completed: 'Completed',
            };
            const rawStage = payload.new.stage as string;
            const nextLifecycle = stageMap[rawStage] || 'Pre-Construction';
            setLifecycleStage(nextLifecycle);
          }
          router.refresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'project_nocs',
          filter: project.id ? `project_id=eq.${project.id}` : undefined,
        },
        () => {
          router.refresh();
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: project.id ? `project_id=eq.${project.id}` : undefined,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [project.code, project.id, router]);

  const currentProject = useMemo(
    () => ({
      ...project,
      lifecycleStage,
      milestones: {
        ...milestones,
        disciplineStatus,
      },
    }),
    [project, lifecycleStage, milestones, disciplineStatus],
  );

  const currentGateReadiness = useMemo(
    () =>
      evaluateStageGateReadiness(
        currentProject,
        nocItems,
        projectDocuments,
      ),
    [currentProject, nocItems, projectDocuments],
  );

  const filteredNocs = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return nocItems.filter((item) => {
      if (activeStage !== 'all' && item.stage !== activeStage) return false;
      if (urgentFilter && !matchesUrgentFilter(item, urgentFilter))
        return false;
      if (
        authorityFilter !== ALL_AUTHORITIES &&
        item.reviewingAuthority !== authorityFilter
      ) {
        return false;
      }
      if (query) {
        const haystack = [
          item.description,
          item.reviewingAuthority,
          item.referenceNumber,
          item.submittedBy,
          item.payerType,
          item.overrideReason,
        ];
        if (!haystack.some((v) => v?.toLowerCase().includes(query))) {
          return false;
        }
      }
      return true;
    });
  }, [nocItems, activeStage, urgentFilter, authorityFilter, searchQuery]);

  const authorityItems = useMemo(() => {
    const set = new Set<ReviewingAuthority>();
    nocItems.forEach((n) => set.add(n.reviewingAuthority));
    return [
      { value: ALL_AUTHORITIES, label: 'All authorities' },
      ...Array.from(set)
        .sort()
        .map((a) => ({ value: a as string, label: a as string })),
    ];
  }, [nocItems]);

  function handleUpdateNoc(updated: ProjectNocItem) {
    setNocItems((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    if (selectedNoc?.id === updated.id) setSelectedNoc(updated);
  }

  async function handleAdvanceStage(newStage: ProjectLifecycleStage) {
    const prev = lifecycleStage;
    setLifecycleStage(newStage);
    setIsGateDrawerOpen(false);
    const res = await advanceProjectStageAction(project.code, newStage);
    if (!res.success) {
      setLifecycleStage(prev);
      toast.error(res.error || 'Failed to advance stage.');
    }
  }

  useEffect(() => {
    const status = milestones.disciplineStatus;
    if (status) {
      const timeoutId = window.setTimeout(() => {
        setDisciplineStatus(status);
      }, 0);
      return () => window.clearTimeout(timeoutId);
    }
  }, [milestones.disciplineStatus]);

  const patchDisciplineStatus = async (
    fn: (c: ProjectDisciplineStatus) => ProjectDisciplineStatus,
  ) => {
    const base = emptyDisciplineStatus(project.code);
    const current = {
      ...base,
      ...disciplineStatus,
      architecture: {
        ...base.architecture,
        ...(disciplineStatus?.architecture || {}),
      },
      structure: {
        ...base.structure,
        ...(disciplineStatus?.structure || {}),
      },
      mep: {
        ...base.mep,
        ...(disciplineStatus?.mep || {}),
      },
      authorities: {
        ...base.authorities,
        ...(disciplineStatus?.authorities || {}),
      },
      specialists: disciplineStatus?.specialists || base.specialists,
    };
    const nextStatus = fn(current);

    setDisciplineStatus(nextStatus);
    const updatedMilestones: StageMilestoneDates = {
      ...milestones,
      disciplineStatus: nextStatus,
    };
    setMilestones(updatedMilestones);

    try {
      const res = await updateProjectDisciplineStatusAction(
        project.code,
        nextStatus,
      );
      if (res.success) {
        toast.success(`Discipline progress updated for #${project.code}`);
      } else {
        toast.error(res.error || 'Failed to update discipline progress.');
        setDisciplineStatus(current);
      }
    } catch {
      toast.error('Network error updating discipline progress.');
      setDisciplineStatus(current);
    }
  };

  const handleUpdateDiscipline = (
    _code: string,
    discipline: 'architecture' | 'structure' | 'mep',
    status: DisciplineStageStatus,
    remarks?: string,
  ) => {
    const actor =
      currentUserRole === 'admin'
        ? 'System Administrator'
        : currentUserRole.replace(/_/g, ' ');
    void patchDisciplineStatus((c) => ({
      ...c,
      [discipline]: {
        ...c[discipline],
        status,
        remarks: remarks !== undefined ? remarks : c[discipline].remarks,
        updatedBy: actor,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const handleUpdateAuthorityStage = (
    _code: string,
    stageKey: 'designStage' | 'constructionStage' | 'revisionStage',
    status: DisciplineStageStatus,
  ) => {
    const actor =
      currentUserRole === 'admin'
        ? 'System Administrator'
        : currentUserRole.replace(/_/g, ' ');
    void patchDisciplineStatus((c) => ({
      ...c,
      authorities: {
        ...c.authorities,
        [stageKey]: status,
        updatedBy: actor,
        updatedAt: new Date().toISOString(),
      },
    }));
  };

  const handleUploadSpecialistFile = (
    _code: string,
    type: ThirdPartySpecialistType,
    fileName: string,
    fileSize: string,
    revision?: string,
  ) => {
    const actor =
      currentUserRole === 'admin'
        ? 'System Administrator'
        : currentUserRole.replace(/_/g, ' ');
    void patchDisciplineStatus((c) => {
      const list = c.specialists || [];
      const exists = list.some((s) => s.type === type);
      const prev = list.find((s) => s.type === type);
      const computedRevision =
        revision ||
        (prev?.revision
          ? `R${String(parseInt(prev.revision.replace(/\D/g, '') || '0', 10) + 1).padStart(2, '0')}`
          : 'R00');

      const updatedItem = {
        id: prev?.id || `spec-${project.code}-${type.toLowerCase().replace(/\s+/g, '-')}`,
        type,
        fileName,
        fileSize,
        revision: computedRevision,
        uploadedBy: actor,
        uploadedAt: new Date().toISOString(),
        status: 'Uploaded' as const,
        remarks: undefined,
        reviewedBy: undefined,
        reviewedAt: undefined,
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
    _code: string,
    type: ThirdPartySpecialistType,
    remarks?: string,
  ) => {
    const actor =
      currentUserRole === 'admin'
        ? 'System Administrator'
        : currentUserRole.replace(/_/g, ' ');
    void patchDisciplineStatus((c) => {
      const list = c.specialists || [];
      const exists = list.some((s) => s.type === type);
      const updatedSpecialists = exists
        ? list.map((s) =>
            s.type === type
              ? {
                  ...s,
                  status: 'Approved' as const,
                  remarks: remarks || s.remarks,
                  reviewedBy: actor,
                  reviewedAt: new Date().toISOString(),
                }
              : s,
          )
        : [
            ...list,
            {
              id: `spec-${project.code}-${type.toLowerCase().replace(/\s+/g, '-')}`,
              type,
              status: 'Approved' as const,
              uploadedAt: new Date().toISOString(),
              reviewedBy: actor,
              reviewedAt: new Date().toISOString(),
            },
          ];

      return {
        ...c,
        specialists: updatedSpecialists,
      };
    });
  };

  const handleRejectSpecialistFile = (
    _code: string,
    type: ThirdPartySpecialistType,
    remarks: string,
  ) => {
    const actor =
      currentUserRole === 'admin'
        ? 'System Administrator'
        : currentUserRole.replace(/_/g, ' ');
    void patchDisciplineStatus((c) => {
      const list = c.specialists || [];
      const updatedSpecialists = list.map((s) =>
        s.type === type
          ? {
              ...s,
              status: 'Rejected' as const,
              remarks,
              reviewedBy: actor,
              reviewedAt: new Date().toISOString(),
            }
          : s,
      );

      return {
        ...c,
        specialists: updatedSpecialists,
      };
    });
  };

  const handleRemoveSpecialistFile = (
    _code: string,
    type: ThirdPartySpecialistType,
  ) => {
    void patchDisciplineStatus((c) => {
      const list = c.specialists || [];
      const updatedSpecialists = list.map((s) =>
        s.type === type
          ? {
              id: s.id,
              type,
              status: 'Pending' as const,
            }
          : s,
      );

      return {
        ...c,
        specialists: updatedSpecialists,
      };
    });
  };

  async function handleUpdateMilestones(updated: StageMilestoneDates) {
    const prev = milestones;
    setMilestones(updated);
    const res = await updateProjectMilestonesAction(project.code, updated);
    if (!res.success) {
      setMilestones(prev);
      toast.error(res.error || 'Failed to update milestones.');
    }
  }

  return (
    <div className="space-y-4">
      <NocProjectHeader project={currentProject} />

      <ProjectLifecycleStepper
        currentStage={lifecycleStage}
        readiness={currentGateReadiness}
        milestones={milestones}
        onOpenGateDetails={() => setIsGateDrawerOpen(true)}
      />

      <ProjectDisciplineCard
        project={currentProject}
        statusRecord={disciplineStatus}
        userRole={currentUserRole}
        hideHeaderAndStepper
        onUpdateDiscipline={handleUpdateDiscipline}
        onUpdateAuthorityStage={handleUpdateAuthorityStage}
        onUploadSpecialistFile={handleUploadSpecialistFile}
        onApproveSpecialistFile={handleApproveSpecialistFile}
        onRejectSpecialistFile={handleRejectSpecialistFile}
        onRemoveSpecialistFile={handleRemoveSpecialistFile}
      />

      <NocAlertBanner
        items={nocItems}
        activeFilter={urgentFilter}
        onSelectFilter={setUrgentFilter}
      />

      <div className="flex flex-col items-stretch justify-between gap-3 pt-1 md:flex-row md:items-center">
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0"
          role="tablist"
          aria-label="NOC stage"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeStage === 'all'}
            onClick={() => {
              setActiveStage('all');
              setUrgentFilter(null);
            }}
            className={tabClass(activeStage === 'all')}
          >
            <span>All Stages</span>
            <span className={countClass(activeStage === 'all')}>
              {nocItems.length}
            </span>
          </button>
          {STAGES.map((st) => {
            const isActive = activeStage === st;
            return (
              <button
                key={st}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => {
                  setActiveStage(st);
                  setUrgentFilter(null);
                }}
                className={tabClass(isActive)}
              >
                <span>{st}</span>
                <span className={countClass(isActive)}>
                  {nocItems.filter((n) => n.stage === st).length}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-64">
            <label htmlFor="noc-search" className="sr-only">
              Search NOCs
            </label>
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="noc-search"
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ref, authority, submitter…"
              className="h-9 bg-card pl-8 text-xs"
            />
          </div>

          <Select
            value={authorityFilter}
            items={authorityItems}
            onValueChange={(val) => setAuthorityFilter(val ?? ALL_AUTHORITIES)}
          >
            <SelectTrigger
              aria-label="Filter by reviewing authority"
              className="h-9 w-44 bg-card text-xs"
            >
              <Filter
                className="mr-1 size-3 text-muted-foreground"
                aria-hidden
              />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {authorityItems.map((item) => (
                <SelectItem
                  key={item.value}
                  value={item.value}
                  className="text-xs"
                >
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <NocDataTable
        items={filteredNocs}
        allNocs={nocItems}
        selectedNocId={selectedNoc?.id || null}
        onSelectNoc={(item) => setSelectedNoc(item)}
      />

      <NocInspectorDrawer
        item={selectedNoc}
        allNocs={nocItems}
        projectDocuments={projectDocuments}
        isOpen={Boolean(selectedNoc)}
        currentUserRole={currentUserRole}
        onClose={() => setSelectedNoc(null)}
        onUpdateNoc={handleUpdateNoc}
      />

      <StageGateDrawer
        project={currentProject}
        readiness={currentGateReadiness}
        currentUserRole={currentUserRole}
        isOpen={isGateDrawerOpen}
        onClose={() => setIsGateDrawerOpen(false)}
        onAdvanceStage={handleAdvanceStage}
        onUpdateMilestones={handleUpdateMilestones}
      />
    </div>
  );
}
