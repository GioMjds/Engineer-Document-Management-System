'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, ShieldCheck, Building2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NocAlertBanner } from './noc-alert-banner';
import { NocDataTable } from './noc-data-table';
import { NocInspectorDrawer } from './noc-inspector-drawer';
import { ProjectLifecycleStepper } from '@/components/lifecycle/project-lifecycle-stepper';
import { StageGateDrawer } from '@/components/lifecycle/stage-gate-drawer';
import {
  evaluateStageGateReadiness,
  INITIAL_PROJECT_MILESTONES,
} from '@/lib/project-lifecycle';
import { INITIAL_PROJECT_DISCIPLINE_STATUS } from '@/lib/project-status';
import type {
  AssignedProject,
  ProjectNocItem,
  NocStage,
  ReviewingAuthority,
  ProjectLifecycleStage,
  StageMilestoneDates,
} from '@/types/noc';
import { isExpiringSoon, isPlanDueOrAtRisk } from '@/lib/noc-tracker';

interface NocTrackerClientProps {
  projects: AssignedProject[];
  initialNocs: ProjectNocItem[];
  currentUserRole: string;
}

const STAGES = [
  'Design NOC',
  'Construction NOC',
  'Information NOC',
  'Handover NOC',
] satisfies NocStage[];

export function NocTrackerClient({
  projects,
  initialNocs,
  currentUserRole,
}: NocTrackerClientProps) {
  const [projectList, setProjectList] = useState<AssignedProject[]>(projects);
  const [milestonesMap, setMilestonesMap] =
    useState<Record<string, StageMilestoneDates>>(INITIAL_PROJECT_MILESTONES);
  const [isGateDrawerOpen, setIsGateDrawerOpen] = useState(false);
  const [selectedProjectCode, setSelectedProjectCode] = useState<string>(
    projects[0]?.code || '23016',
  );
  const [nocItems, setNocItems] = useState<ProjectNocItem[]>(initialNocs);
  const [activeStage, setActiveStage] = useState<string>('Design NOC');
  const [searchQuery, setSearchQuery] = useState('');
  const [authorityFilter, setAuthorityFilter] = useState<string>('all');
  const [urgentFilter, setUrgentFilter] = useState<string | null>(null);
  const [selectedNoc, setSelectedNoc] = useState<ProjectNocItem | null>(null);

  const currentProject = useMemo(() => {
    const proj =
      projectList.find((p) => p.code === selectedProjectCode) || projectList[0];
    if (!proj) return proj;
    return {
      ...proj,
      milestones: milestonesMap[proj.code] || proj.milestones,
    };
  }, [projectList, selectedProjectCode, milestonesMap]);

  const currentGateReadiness = useMemo(() => {
    if (!currentProject) {
      return {
        stage: 'Pre-Construction' as ProjectLifecycleStage,
        nextStage: 'Construction' as ProjectLifecycleStage,
        totalPrerequisites: 0,
        satisfiedPrerequisites: 0,
        readinessPercentage: 0,
        isGateReady: false,
        prerequisites: [],
      };
    }
    return evaluateStageGateReadiness(
      currentProject,
      nocItems,
      INITIAL_PROJECT_DISCIPLINE_STATUS[currentProject.code],
    );
  }, [currentProject, nocItems]);

  const projectNocs = useMemo(
    () => nocItems.filter((i) => i.projectCode === selectedProjectCode),
    [nocItems, selectedProjectCode],
  );

  const filteredNocs = useMemo(() => {
    return projectNocs.filter((item) => {
      // Stage tab filter
      if (activeStage !== 'all' && item.stage !== activeStage) {
        return false;
      }

      // Urgent filter from ribbon
      if (urgentFilter === 'expiring') {
        if (!isExpiringSoon(item.expiryDate) || item.status === 'Approved')
          return false;
      } else if (urgentFilter === 'rejected') {
        if (item.status !== 'Rejected') return false;
      } else if (urgentFilter === 'pending-payment') {
        if (item.status !== 'Pending for Payment') return false;
      } else if (urgentFilter === 'due-risk') {
        if (
          !(
            (item.status === 'Not Started' || !item.applyDate) &&
            item.status !== 'Approved' &&
            item.status !== 'Not Needed' &&
            isPlanDueOrAtRisk(item.planDate)
          )
        ) {
          return false;
        }
      }

      // Reviewing authority filter
      if (
        authorityFilter !== 'all' &&
        item.reviewingAuthority !== authorityFilter
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesDesc = item.description.toLowerCase().includes(query);
        const matchesAuth = item.reviewingAuthority
          .toLowerCase()
          .includes(query);
        const matchesRef = item.referenceNumber.toLowerCase().includes(query);
        const matchesSubmitter = item.submittedBy.toLowerCase().includes(query);
        const matchesPayer = item.payerType
          ? item.payerType.toLowerCase().includes(query)
          : false;
        const matchesOverride = item.overrideReason
          ? item.overrideReason.toLowerCase().includes(query)
          : false;
        if (
          !matchesDesc &&
          !matchesAuth &&
          !matchesRef &&
          !matchesSubmitter &&
          !matchesPayer &&
          !matchesOverride
        ) {
          return false;
        }
      }

      return true;
    });
  }, [projectNocs, activeStage, urgentFilter, authorityFilter, searchQuery]);

  function handleUpdateNoc(updated: ProjectNocItem) {
    setNocItems((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
    if (selectedNoc?.id === updated.id) {
      setSelectedNoc(updated);
    }
  }

  // Advance project lifecycle stage and close gate drawer.
  function handleAdvanceStage(newStage: ProjectLifecycleStage) {
    if (!currentProject) return;
    setProjectList((prev) =>
      prev.map((p) =>
        p.code === currentProject.code
          ? { ...p, lifecycleStage: newStage }
          : p,
      ),
    );
    setIsGateDrawerOpen(false);
  }

  // Update regulatory milestone dates for current project.
  function handleUpdateMilestones(updatedMilestones: StageMilestoneDates) {
    if (!currentProject) return;
    setMilestonesMap((prev) => ({
      ...prev,
      [currentProject.code]: updatedMilestones,
    }));
    setProjectList((prev) =>
      prev.map((p) =>
        p.code === currentProject.code
          ? { ...p, milestones: updatedMilestones }
          : p,
      ),
    );
  }

  const distinctAuthorities = useMemo(() => {
    const set = new Set<ReviewingAuthority>();
    projectNocs.forEach((n) => set.add(n.reviewingAuthority));
    return Array.from(set).sort();
  }, [projectNocs]);

  return (
    <div className="space-y-4">
      {/* Top Project Context Header */}
      <section className="p-4 border rounded bg-card space-y-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-bold bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 px-2 py-0.5 rounded">
                Project {currentProject.code}
              </span>
              <h1 className="text-lg font-semibold tracking-tight">
                {currentProject.name}
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded font-medium border bg-muted text-muted-foreground uppercase tracking-wider">
                {currentUserRole.replace('_', ' ')}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground mt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-zinc-500" />
                Master Authority:{' '}
                <strong className="text-foreground">
                  {currentProject.masterAuthority}
                </strong>
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                {currentProject.location}
              </span>
              <span className="flex items-center gap-1">
                <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                Type: {currentProject.projectType} · Contract:{' '}
                {currentProject.contractType}
              </span>
            </div>
          </div>

          {/* Project Switcher */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="text-xs text-muted-foreground font-medium">
              Switch Project:
            </span>
            <Select
              value={selectedProjectCode}
              onValueChange={(val) => {
                if (val) {
                  setSelectedProjectCode(val);
                  setSelectedNoc(null);
                }
              }}
            >
              <SelectTrigger className="w-45 h-8 text-xs font-mono">
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                {projectList.map((p) => (
                  <SelectItem
                    key={p.code}
                    value={p.code}
                    className="text-xs font-mono"
                  >
                    {p.code} - {p.name.substring(0, 20)}...
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Assigned Discipline Engineers Bar */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span>
            Authority:{' '}
            <strong className="text-foreground">
              {currentProject.assignedRoles.authorityEngineer}
            </strong>
          </span>
          <span>
            Architect:{' '}
            <strong className="text-foreground">
              {currentProject.assignedRoles.architectEngineer}
            </strong>
          </span>
          <span>
            MEP:{' '}
            <strong className="text-foreground">
              {currentProject.assignedRoles.mepEngineer}
            </strong>
          </span>
          <span>
            Structure:{' '}
            <strong className="text-foreground">
              {currentProject.assignedRoles.structureEngineer}
            </strong>
          </span>
          <span>
            Civil:{' '}
            <strong className="text-foreground">
              {currentProject.assignedRoles.civilEngineer}
            </strong>
          </span>
          <span>
            RE:{' '}
            <strong className="text-foreground">
              {currentProject.assignedRoles.residentEngineer}
            </strong>
          </span>
          <span>
            AM:{' '}
            <strong className="text-foreground">
              {currentProject.assignedRoles.areaManager}
            </strong>
          </span>
          <span>
            DC:{' '}
            <strong className="text-foreground">
              {currentProject.assignedRoles.docController}
            </strong>
          </span>
        </div>
      </section>

      {/* Project lifecycle stepper ribbon. */}
      {currentProject && (
        <ProjectLifecycleStepper
          currentStage={currentProject.lifecycleStage || 'Pre-Construction'}
          readiness={currentGateReadiness}
          milestones={currentProject.milestones}
          onOpenGateDetails={() => setIsGateDrawerOpen(true)}
        />
      )}

      {/* Urgent Action Alert Ribbon */}
      <NocAlertBanner
        items={projectNocs}
        activeFilter={urgentFilter}
        onSelectFilter={setUrgentFilter}
      />

      {/* Stage Tab Navigation & Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-1">
        {/* Stage Tabs */}
        <div
          className="flex items-center gap-1 overflow-x-auto pb-1 md:pb-0"
          role="tablist"
        >
          {STAGES.map((st) => {
            const count = projectNocs.filter((n) => n.stage === st).length;
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
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
                }`}
              >
                <span>{st}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            role="tab"
            aria-selected={activeStage === 'all'}
            onClick={() => {
              setActiveStage('all');
              setUrgentFilter(null);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border transition-colors whitespace-nowrap ${
              activeStage === 'all'
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:bg-muted hover:text-foreground'
            }`}
          >
            <span>All Stages</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded font-mono bg-muted text-muted-foreground">
              {projectNocs.length}
            </span>
          </button>
        </div>

        {/* Search & Filter Toolbar */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 md:w-56">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search NOCs, ref, submitter..."
              className="pl-8 h-8 text-xs bg-card"
            />
          </div>

          <Select
            value={authorityFilter}
            onValueChange={(val) => setAuthorityFilter(val || 'all')}
          >
            <SelectTrigger className="w-35 h-8 text-xs bg-card">
              <Filter className="h-3 w-3 mr-1 text-muted-foreground" />
              <SelectValue placeholder="All Authorities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Authorities
              </SelectItem>
              {distinctAuthorities.map((auth) => (
                <SelectItem key={auth} value={auth} className="text-xs">
                  {auth}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Tabular Data Grid */}
      <NocDataTable
        items={filteredNocs}
        allNocs={nocItems}
        selectedNocId={selectedNoc?.id || null}
        onSelectNoc={(item) => setSelectedNoc(item)}
      />

      {/* Slide-Over Inspector Drawer */}
      <NocInspectorDrawer
        item={selectedNoc}
        allNocs={nocItems}
        isOpen={Boolean(selectedNoc)}
        currentUserRole={currentUserRole}
        onClose={() => setSelectedNoc(null)}
        onUpdateNoc={handleUpdateNoc}
      />

      {/* Stage gate verification and readiness drawer. */}
      {currentProject && (
        <StageGateDrawer
          project={currentProject}
          readiness={currentGateReadiness}
          currentUserRole={currentUserRole}
          isOpen={isGateDrawerOpen}
          onClose={() => setIsGateDrawerOpen(false)}
          onAdvanceStage={handleAdvanceStage}
          onUpdateMilestones={handleUpdateMilestones}
        />
      )}
    </div>
  );
}
