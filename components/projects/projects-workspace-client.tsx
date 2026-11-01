'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import type { Route } from 'next';
import {
  Building2,
  FolderPlus,
  HardHat,
  LayoutGrid,
  MapPin,
  Search,
  ShieldCheck,
  TableProperties,
  UserCheck,
  Users,
  Layers,
  FileText,
} from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatCurrencyAED } from '@/utils/formatters';
import type { AssignedProject, ProjectLifecycleStage } from '@/types/noc';
import { ProjectTeamDialog, type ProfileItem } from './project-team-dialog';

interface ProjectsWorkspaceClientProps {
  projects: AssignedProject[];
  currentUser: {
    id: string;
    role: string;
    name?: string | null;
  };
  teamProfiles: ProfileItem[];
  canCreateProject: boolean;
  canManageMembers: boolean;
  canViewConsultantAmount: boolean;
}

const STAGE_FILTERS = [
  { value: 'all', label: 'All Lifecycle Stages' },
  { value: 'Pre-Construction', label: 'Pre-Construction' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Handover', label: 'Handover' },
];

const ROLE_FILTERS = [
  { value: 'all', label: 'All Roles & Assignments' },
  { value: 'my_assigned', label: 'Assigned to Me' },
  { value: 'admin', label: 'Admin (System Oversight)' },
  { value: 'resident_engineer', label: 'Resident Engineer (RE)' },
  { value: 'area_manager', label: 'Area Manager (AM)' },
  { value: 'authority_engineer', label: 'Authority Engineer' },
  { value: 'dc', label: 'Document Controller (DC)' },
  { value: 'architect_engineer', label: 'Architectural Engineer' },
  { value: 'structure_engineer', label: 'Structural Engineer' },
  { value: 'mep_engineer', label: 'MEP Engineer' },
  { value: 'civil_engineer', label: 'Civil Engineer' },
];

function stageTone(stage: ProjectLifecycleStage) {
  switch (stage) {
    case 'Pre-Construction':
      return 'border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/10';
    case 'Construction':
      return 'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10';
    case 'Handover':
      return 'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10';
    case 'Completed':
      return 'border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-500/10';
    default:
      return 'border-muted text-muted-foreground bg-muted/40';
  }
}

export function ProjectsWorkspaceClient({
  projects,
  currentUser,
  teamProfiles,
  canCreateProject,
  canManageMembers,
  canViewConsultantAmount,
}: ProjectsWorkspaceClientProps) {
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [editingProject, setEditingProject] = useState<AssignedProject | null>(
    null,
  );

  const currentUserName = currentUser.name?.toLowerCase() || '';
  const isAdmin = currentUser.role === 'admin';

  // Metrics summary
  const metrics = useMemo(() => {
    const total = projects.length;
    const preConstruction = projects.filter(
      (p) => p.lifecycleStage === 'Pre-Construction',
    ).length;
    const construction = projects.filter(
      (p) => p.lifecycleStage === 'Construction',
    ).length;
    const handover = projects.filter(
      (p) => p.lifecycleStage === 'Handover',
    ).length;

    // Check if fully staffed across 8 disciplines
    const fullyStaffed = projects.filter((p) => {
      const r = p.assignedRoles;
      if (!r) return false;
      return (
        r.residentEngineer !== 'Unassigned' &&
        r.areaManager !== 'Unassigned' &&
        r.authorityEngineer !== 'Unassigned' &&
        r.docController !== 'Unassigned' &&
        r.architectEngineer !== 'Unassigned' &&
        r.structureEngineer !== 'Unassigned' &&
        r.mepEngineer !== 'Unassigned' &&
        r.civilEngineer !== 'Unassigned'
      );
    }).length;

    return { total, preConstruction, construction, handover, fullyStaffed };
  }, [projects]);

  // Filtering logic
  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();

    return projects.filter((p) => {
      // Stage filter
      if (stageFilter !== 'all' && p.lifecycleStage !== stageFilter) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        const roles = p.assignedRoles;
        if (roleFilter === 'my_assigned') {
          if (isAdmin) {
            // Admin is overseer of all projects
            return true;
          }
          if (!currentUserName) return false;
          const assignedNames = Object.values(roles || {}).map((n) =>
            n.toLowerCase(),
          );
          if (!assignedNames.some((n) => n.includes(currentUserName))) {
            return false;
          }
        } else if (roleFilter === 'admin') {
          // Admin has oversight on all projects
          return true;
        } else if (roleFilter === 'resident_engineer') {
          if (!roles || roles.residentEngineer === 'Unassigned') return false;
        } else if (roleFilter === 'area_manager') {
          if (!roles || roles.areaManager === 'Unassigned') return false;
        } else if (roleFilter === 'authority_engineer') {
          if (!roles || roles.authorityEngineer === 'Unassigned') return false;
        } else if (roleFilter === 'dc') {
          if (!roles || roles.docController === 'Unassigned') return false;
        } else if (roleFilter === 'architect_engineer') {
          if (!roles || roles.architectEngineer === 'Unassigned') return false;
        } else if (roleFilter === 'structure_engineer') {
          if (!roles || roles.structureEngineer === 'Unassigned') return false;
        } else if (roleFilter === 'mep_engineer') {
          if (!roles || roles.mepEngineer === 'Unassigned') return false;
        } else if (roleFilter === 'civil_engineer') {
          if (!roles || roles.civilEngineer === 'Unassigned') return false;
        }
      }

      // Search query
      if (q) {
        const assignedNames = Object.values(p.assignedRoles || {}).join(' ');
        const matchesQuery = [
          p.code,
          p.name,
          p.location,
          p.masterAuthority,
          p.contractorName || '',
          p.projectType,
          assignedNames,
        ].some((text) => text.toLowerCase().includes(q));

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [projects, query, stageFilter, roleFilter, isAdmin, currentUserName]);

  // Check user assignment on a given project
  const getUserAssignment = (p: AssignedProject) => {
    if (isAdmin) {
      return 'Admin System Oversight';
    }
    if (!currentUserName || !p.assignedRoles) return null;
    const r = p.assignedRoles;
    if (r.residentEngineer.toLowerCase().includes(currentUserName))
      return 'Resident Engineer';
    if (r.areaManager.toLowerCase().includes(currentUserName))
      return 'Area Manager';
    if (r.authorityEngineer.toLowerCase().includes(currentUserName))
      return 'Authority Engineer';
    if (r.docController.toLowerCase().includes(currentUserName))
      return 'Document Controller';
    if (r.architectEngineer.toLowerCase().includes(currentUserName))
      return 'Architectural Engineer';
    if (r.structureEngineer.toLowerCase().includes(currentUserName))
      return 'Structural Engineer';
    if (r.mepEngineer.toLowerCase().includes(currentUserName))
      return 'MEP Engineer';
    if (r.civilEngineer.toLowerCase().includes(currentUserName))
      return 'Civil Engineer';
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-(--site-navy) text-(--site-cyan) dark:bg-[#0e1c30]">
              <Building2 className="size-4" />
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
              Projects Directory
            </h1>
          </div>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Check projects and multidisciplinary team role assignments across all active sites.
          </p>
        </div>

        {canCreateProject && (
          <Link
            href="/projects/new"
            className={cn(
              buttonVariants(),
              'h-9 gap-1.5 self-start bg-primary text-primary-foreground hover:bg-primary/90 sm:self-auto',
            )}
          >
            <FolderPlus className="size-4" aria-hidden />
            Register Project
          </Link>
        )}
      </header>

      {/* KPI Stats Ribbon */}
      <section
        aria-label="Projects directory summary metrics"
        className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Projects
            </span>
            <span className="flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Building2 className="size-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {metrics.total}
            </span>
            <span className="text-xs text-muted-foreground">in scope</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Pre-Construction
            </span>
            <span className="flex size-7 items-center justify-center rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <Layers className="size-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {metrics.preConstruction}
            </span>
            <span className="text-xs text-muted-foreground">design & NOC</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Construction Stage
            </span>
            <span className="flex size-7 items-center justify-center rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HardHat className="size-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {metrics.construction}
            </span>
            <span className="text-xs text-muted-foreground">supervision</span>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Staffed Projects
            </span>
            <span className="flex size-7 items-center justify-center rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="size-3.5" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
              {metrics.fullyStaffed}
            </span>
            <span className="text-xs text-muted-foreground">
              of {metrics.total} complete
            </span>
          </div>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section
        aria-label="Filter and search projects"
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between"
      >
        <div className="flex flex-1 flex-col gap-2.5 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <label htmlFor="projects-search-input" className="sr-only">
              Search projects by code, title, or personnel
            </label>
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              id="projects-search-input"
              type="search"
              placeholder="Search code, title, personnel..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 bg-background pl-9 text-xs sm:text-sm"
            />
          </div>

          <div className="w-full sm:w-48">
            <Select
              value={stageFilter}
              items={STAGE_FILTERS}
              onValueChange={(val) => setStageFilter(val ?? 'all')}
            >
              <SelectTrigger
                aria-label="Filter by lifecycle stage"
                className="h-9 bg-background text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_FILTERS.map((s) => (
                  <SelectItem key={s.value} value={s.value} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-56">
            <Select
              value={roleFilter}
              items={ROLE_FILTERS}
              onValueChange={(val) => setRoleFilter(val ?? 'all')}
            >
              <SelectTrigger
                aria-label="Filter by role assignment"
                className="h-9 bg-background text-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_FILTERS.map((r) => (
                  <SelectItem key={r.value} value={r.value} className="text-xs">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <p className="text-xs text-muted-foreground" aria-live="polite">
            Showing <strong className="text-foreground">{filteredProjects.length}</strong> of{' '}
            {projects.length}
          </p>

          <div
            className="flex items-center rounded-md border border-border bg-muted/40 p-0.5"
            role="group"
            aria-label="View layout switch"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('grid')}
              aria-pressed={viewMode === 'grid'}
              aria-label="Grid card view"
              className={cn(
                'size-7 p-0',
                viewMode === 'grid' &&
                  'bg-background text-foreground shadow-xs',
              )}
            >
              <LayoutGrid className="size-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setViewMode('table')}
              aria-pressed={viewMode === 'table'}
              aria-label="Table list view"
              className={cn(
                'size-7 p-0',
                viewMode === 'table' &&
                  'bg-background text-foreground shadow-xs',
              )}
            >
              <TableProperties className="size-3.5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      {filteredProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-12 text-center">
          <Building2 className="mx-auto size-10 text-muted-foreground/60" />
          <h2 className="mt-3 text-base font-semibold">No Projects Found</h2>
          <p className="mt-1 text-xs text-muted-foreground max-w-sm mx-auto">
            No projects match the selected filters or assigned roles. Adjust your search criteria or clear the filters.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 h-8 text-xs"
            onClick={() => {
              setQuery('');
              setStageFilter('all');
              setRoleFilter('all');
            }}
          >
            Clear Filters
          </Button>
        </div>
      ) : viewMode === 'grid' ? (
        <ul className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {filteredProjects.map((p) => {
            const userAssignment = getUserAssignment(p);
            return (
              <ProjectGridCard
                key={p.code}
                project={p}
                userAssignment={userAssignment}
                canManageMembers={canManageMembers}
                canViewConsultantAmount={canViewConsultantAmount}
                highlightedRole={roleFilter}
                onManageMembers={() => setEditingProject(p)}
              />
            );
          })}
        </ul>
      ) : (
        <ProjectsTableView
          projects={filteredProjects}
          canManageMembers={canManageMembers}
          canViewConsultantAmount={canViewConsultantAmount}
          onManageMembers={(p) => setEditingProject(p)}
        />
      )}

      {/* Admin Team Assignment Dialog */}
      {editingProject && (
        <ProjectTeamDialog
          key={editingProject.id || editingProject.code}
          project={editingProject}
          teamProfiles={teamProfiles}
          open={!!editingProject}
          onOpenChange={(open) => !open && setEditingProject(null)}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Card (Grid View)
// ---------------------------------------------------------------------------

function ProjectGridCard({
  project,
  userAssignment,
  canManageMembers,
  canViewConsultantAmount,
  highlightedRole,
  onManageMembers,
}: {
  project: AssignedProject;
  userAssignment: string | null;
  canManageMembers: boolean;
  canViewConsultantAmount: boolean;
  highlightedRole: string;
  onManageMembers: () => void;
}) {
  const roles = project.assignedRoles || {
    residentEngineer: 'Unassigned',
    areaManager: 'Unassigned',
    authorityEngineer: 'Unassigned',
    docController: 'Unassigned',
    architectEngineer: 'Unassigned',
    structureEngineer: 'Unassigned',
    mepEngineer: 'Unassigned',
    civilEngineer: 'Unassigned',
  };

  const isRoleHighlighted = (roleKey: string) => {
    return highlightedRole === roleKey;
  };

  return (
    <li className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-xs transition-colors hover:border-ring/50">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Link
            href={`/projects/${project.code}` as Route}
            className="rounded bg-(--site-navy) px-2.5 py-0.5 font-mono text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-[#0e1c30] dark:text-(--site-cyan)"
          >
            {project.code}
          </Link>
          <Badge
            variant="outline"
            className={cn('text-xs font-medium', stageTone(project.lifecycleStage))}
          >
            {project.lifecycleStage}
          </Badge>
        </div>

        {userAssignment && (
          <Badge
            variant="outline"
            className="border-(--site-cyan)/30 bg-(--site-cyan)/10 text-(--site-cyan) text-[11px] font-medium"
          >
            <UserCheck className="mr-1 size-3" />
            {userAssignment}
          </Badge>
        )}
      </div>

      {/* Project Title and Metadata */}
      <div className="mt-3 space-y-1.5">
        <h2 className="text-base font-bold tracking-tight text-foreground">
          <Link
            href={`/projects/${project.code}` as Route}
            className="hover:underline"
          >
            {project.name}
          </Link>
        </h2>
        <div className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
          <p className="flex items-center gap-1.5 truncate">
            <ShieldCheck className="size-3.5 shrink-0 text-muted-foreground/80" />
            <span className="truncate">{project.masterAuthority}</span>
          </p>
          <p className="flex items-center gap-1.5 truncate">
            <MapPin className="size-3.5 shrink-0 text-muted-foreground/80" />
            <span className="truncate">{project.location}</span>
          </p>
        </div>
        {project.contractorName && (
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
            <HardHat className="size-3.5 shrink-0 text-muted-foreground/80" />
            <span className="truncate">General Contractor: {project.contractorName}</span>
          </p>
        )}
      </div>

      {/* Commercial Values */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-md border border-border/80 bg-muted/20 p-2.5 text-xs">
        <div>
          <span className="text-[11px] text-muted-foreground">Contractor Contract</span>
          <p className="font-mono font-semibold text-foreground">
            {formatCurrencyAED(project.clientContractorAmount)}
          </p>
        </div>
        {canViewConsultantAmount && (
          <div>
            <span className="text-[11px] text-muted-foreground">Consultant Contract</span>
            <p className="font-mono font-semibold text-foreground">
              {formatCurrencyAED(project.clientConsultantAmount)}
            </p>
          </div>
        )}
      </div>

      {/* Role Assignment Breakdown */}
      <div className="mt-4 space-y-2 border-t border-border pt-3.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Assigned Roles & Personnel
          </span>
          <span className="text-[11px] text-muted-foreground">
            8 disciplines
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          {/* Resident Engineer */}
          <RoleItemTile
            title="Resident Eng"
            name={roles.residentEngineer}
            highlight={isRoleHighlighted('resident_engineer')}
          />
          {/* Area Manager */}
          <RoleItemTile
            title="Area Manager"
            name={roles.areaManager}
            highlight={isRoleHighlighted('area_manager')}
          />
          {/* Authority Engineer */}
          <RoleItemTile
            title="Auth Engineer"
            name={roles.authorityEngineer}
            highlight={isRoleHighlighted('authority_engineer')}
          />
          {/* Document Controller */}
          <RoleItemTile
            title="Doc Controller"
            name={roles.docController}
            highlight={isRoleHighlighted('dc')}
          />
          {/* Architectural */}
          <RoleItemTile
            title="Architectural"
            name={roles.architectEngineer}
            highlight={isRoleHighlighted('architect_engineer')}
          />
          {/* Structural */}
          <RoleItemTile
            title="Structural"
            name={roles.structureEngineer}
            highlight={isRoleHighlighted('structure_engineer')}
          />
          {/* MEP */}
          <RoleItemTile
            title="MEP Engineer"
            name={roles.mepEngineer}
            highlight={isRoleHighlighted('mep_engineer')}
          />
          {/* Civil */}
          <RoleItemTile
            title="Civil Engineer"
            name={roles.civilEngineer}
            highlight={isRoleHighlighted('civil_engineer')}
          />
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/noc-tracker/${project.code}` as Route}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 gap-1.5 text-xs',
            )}
          >
            <ShieldCheck className="size-3.5" />
            NOC Tracker
          </Link>
          <Link
            href={`/projects/${project.code}` as Route}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 gap-1.5 text-xs',
            )}
          >
            <FileText className="size-3.5" />
            Documents
          </Link>
        </div>

        {canManageMembers && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onManageMembers}
            className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
          >
            <Users className="size-3.5" />
            Manage Team
          </Button>
        )}
      </div>
    </li>
  );
}

function RoleItemTile({
  title,
  name,
  highlight,
}: {
  title: string;
  name: string;
  highlight?: boolean;
}) {
  const isUnassigned = !name || name === 'Unassigned';

  return (
    <div
      className={cn(
        'rounded border p-2 transition-colors',
        highlight
          ? 'border-primary bg-primary/10'
          : 'border-border/60 bg-muted/20',
      )}
    >
      <span className="block text-[10px] font-medium uppercase tracking-tight text-muted-foreground truncate">
        {title}
      </span>
      <span
        className={cn(
          'mt-0.5 block truncate text-xs font-medium',
          isUnassigned
            ? 'text-muted-foreground/60 italic'
            : 'text-foreground',
        )}
        title={name}
      >
        {name || 'Unassigned'}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Projects Table View
// ---------------------------------------------------------------------------

function ProjectsTableView({
  projects,
  canManageMembers,
  canViewConsultantAmount,
  onManageMembers,
}: {
  projects: AssignedProject[];
  canManageMembers: boolean;
  canViewConsultantAmount: boolean;
  onManageMembers: (p: AssignedProject) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-220 text-left text-xs">
          <caption className="sr-only">List of assigned projects and roles</caption>
          <thead className="border-b border-border bg-muted/40 font-semibold uppercase tracking-wider text-muted-foreground">
            <tr>
              <th scope="col" className="px-3 py-2.5">
                Code
              </th>
              <th scope="col" className="px-3 py-2.5">
                Project Name
              </th>
              <th scope="col" className="px-3 py-2.5">
                Stage
              </th>
              <th scope="col" className="px-3 py-2.5">
                Authority
              </th>
              <th scope="col" className="px-3 py-2.5">
                Management (RE / AM)
              </th>
              <th scope="col" className="px-3 py-2.5">
                Permitting (Auth / DC)
              </th>
              <th scope="col" className="px-3 py-2.5">
                Discipline Engineers
              </th>
              <th scope="col" className="px-3 py-2.5">
                Contractor Sum
              </th>
              {canViewConsultantAmount && (
                <th scope="col" className="px-3 py-2.5">
                  Consultant Sum
                </th>
              )}
              <th scope="col" className="px-3 py-2.5 text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {projects.map((p) => {
              const r = p.assignedRoles;
              return (
                <tr
                  key={p.code}
                  className="transition-colors hover:bg-muted/30"
                >
                  <td className="px-3 py-2.5 font-mono font-bold text-foreground">
                    <Link
                      href={`/projects/${p.code}` as Route}
                      className="hover:underline"
                    >
                      {p.code}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-foreground">
                    <Link
                      href={`/projects/${p.code}` as Route}
                      className="block max-w-xs truncate hover:underline"
                      title={p.name}
                    >
                      {p.name}
                    </Link>
                    <span className="block text-[11px] text-muted-foreground truncate">
                      {p.location}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px] font-medium',
                        stageTone(p.lifecycleStage),
                      )}
                    >
                      {p.lifecycleStage}
                    </Badge>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground truncate max-w-36">
                    {p.masterAuthority}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block truncate">RE: {r?.residentEngineer || '—'}</span>
                    <span className="block truncate text-muted-foreground">
                      AM: {r?.areaManager || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block truncate">AE: {r?.authorityEngineer || '—'}</span>
                    <span className="block truncate text-muted-foreground">
                      DC: {r?.docController || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                    <span className="block truncate">
                      Arch: {r?.architectEngineer || '—'} · Struct: {r?.structureEngineer || '—'}
                    </span>
                    <span className="block truncate">
                      MEP: {r?.mepEngineer || '—'} · Civil: {r?.civilEngineer || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono">
                    {formatCurrencyAED(p.clientContractorAmount)}
                  </td>
                  {canViewConsultantAmount && (
                    <td className="px-3 py-2.5 font-mono text-muted-foreground">
                      {formatCurrencyAED(p.clientConsultantAmount)}
                    </td>
                  )}
                  <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                    <Link
                      href={`/projects/${p.code}` as Route}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'h-7 px-2 text-[11px]',
                      )}
                    >
                      Docs
                    </Link>
                    <Link
                      href={`/noc-tracker/${p.code}` as Route}
                      className={cn(
                        buttonVariants({ variant: 'outline', size: 'sm' }),
                        'h-7 px-2 text-[11px]',
                      )}
                    >
                      NOCs
                    </Link>
                    {canManageMembers && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onManageMembers(p)}
                        className="h-7 px-2 text-[11px] text-primary"
                      >
                        Team
                      </Button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
