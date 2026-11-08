'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
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
  Pencil,
  Trash2,
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
import type { AssignedProject, ProjectLifecycleStage, MasterAuthorityRecord } from '@/types/noc';
import type { ProjectEditDetails } from '@/lib/project-edit';
import { ProjectTeamDialog } from './project-team-dialog';
import { ProjectEditDialog } from './project-edit-dialog';
import type { ProfileItem } from './team-assignment-fields';
import { DeleteProjectDialog } from './delete-project-dialog';
import { ProjectDialogModal } from './project-dialog-modal';
import { ProjectRegistrationForm } from '@/app/(app)/projects/new/project-form';

interface ProjectsWorkspaceClientProps {
  projects: AssignedProject[];
  currentUser: {
    id: string;
    role: string;
    name?: string | null;
  };
  teamProfiles: ProfileItem[];
  authorities?: MasterAuthorityRecord[];
  editDetails?: Record<string, ProjectEditDetails>;
  canCreateProject: boolean;
  canDeleteProject?: boolean;
  canManageMembers: boolean;
  canViewConsultantAmount: boolean;
  initialOpenCreate?: boolean;
}

type RoleFieldKey = keyof AssignedProject['assignedRoles'];

interface RoleDefinition {
  field: RoleFieldKey;
  filterKey: string;
  label: string;
  shortLabel: string;
}

// Canonical definition of engineering discipline roles.
const PROJECT_ROLE_DEFINITIONS = [
  {
    field: 'residentEngineer',
    filterKey: 'resident_engineer',
    label: 'Resident Engineer',
    shortLabel: 'Resident Eng',
  },
  {
    field: 'areaManager',
    filterKey: 'area_manager',
    label: 'Area Manager',
    shortLabel: 'Area Manager',
  },
  {
    field: 'authorityEngineer',
    filterKey: 'authority_engineer',
    label: 'Authority Engineer',
    shortLabel: 'Auth Engineer',
  },
  {
    field: 'docController',
    filterKey: 'dc',
    label: 'Document Controller',
    shortLabel: 'Doc Controller',
  },
  {
    field: 'architectEngineer',
    filterKey: 'architect_engineer',
    label: 'Architectural Engineer',
    shortLabel: 'Architectural',
  },
  {
    field: 'structureEngineer',
    filterKey: 'structure_engineer',
    label: 'Structural Engineer',
    shortLabel: 'Structural',
  },
  {
    field: 'mepEngineer',
    filterKey: 'mep_engineer',
    label: 'MEP Engineer',
    shortLabel: 'MEP Engineer',
  },
  {
    field: 'civilEngineer',
    filterKey: 'civil_engineer',
    label: 'Civil Engineer',
    shortLabel: 'Civil Engineer',
  },
] satisfies RoleDefinition[];

const ROLE_FILTER_TO_FIELD_MAP = Object.fromEntries(
  PROJECT_ROLE_DEFINITIONS.map((def) => [def.filterKey, def.field]),
) as Record<string, RoleFieldKey>;

const STAGE_FILTERS = [
  { value: 'all', label: 'All Lifecycle Stages' },
  { value: 'Pre-Construction', label: 'Pre-Construction' },
  { value: 'Construction', label: 'Construction' },
  { value: 'Handover', label: 'Handover' },
] as const;

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
] as const;

const STAGE_TONES = {
  'Pre-Construction':
    'border-sky-500/30 text-sky-700 dark:text-sky-400 bg-sky-500/10',
  Construction:
    'border-amber-500/30 text-amber-700 dark:text-amber-400 bg-amber-500/10',
  Handover:
    'border-emerald-500/30 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10',
  Completed:
    'border-purple-500/30 text-purple-700 dark:text-purple-400 bg-purple-500/10',
} satisfies Record<ProjectLifecycleStage, string>;

const DEFAULT_ASSIGNED_ROLES = {
  residentEngineer: 'Unassigned',
  areaManager: 'Unassigned',
  authorityEngineer: 'Unassigned',
  docController: 'Unassigned',
  architectEngineer: 'Unassigned',
  structureEngineer: 'Unassigned',
  mepEngineer: 'Unassigned',
  civilEngineer: 'Unassigned',
} satisfies AssignedProject['assignedRoles'];

function stageTone(stage: ProjectLifecycleStage): string {
  return STAGE_TONES[stage] ?? 'border-muted text-muted-foreground bg-muted/40';
}

export function ProjectsWorkspaceClient({
  projects,
  currentUser,
  teamProfiles,
  authorities = [],
  editDetails = {},
  canCreateProject,
  canDeleteProject = false,
  canManageMembers,
  canViewConsultantAmount,
  initialOpenCreate = false,
}: ProjectsWorkspaceClientProps) {
  const router = useRouter();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(initialOpenCreate);
  const [query, setQuery] = useState('');
  const [stageFilter, setStageFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [editingProject, setEditingProject] = useState<AssignedProject | null>(
    null,
  );
  const [editingDetails, setEditingDetails] = useState<AssignedProject | null>(
    null,
  );
  const [deletingProject, setDeletingProject] = useState<{
    id: string;
    code: string;
    name: string;
  } | null>(null);

  const currentUserName = currentUser.name?.toLowerCase() || '';
  const isAdmin = currentUser.role === 'admin';

  // Compute portfolio stage and staffing metrics in a single pass.
  const metrics = useMemo(() => {
    let preConstruction = 0;
    let construction = 0;
    let handover = 0;
    let fullyStaffed = 0;

    for (const p of projects) {
      if (p.lifecycleStage === 'Pre-Construction') preConstruction++;
      else if (p.lifecycleStage === 'Construction') construction++;
      else if (p.lifecycleStage === 'Handover') handover++;

      const r = p.assignedRoles;
      if (r && r.residentEngineer && r.residentEngineer !== 'Unassigned') {
        const hasStaff = Object.values(r).some(
          (name) => name && name !== 'Unassigned',
        );
        if (hasStaff) fullyStaffed++;
      }
    }

    return {
      total: projects.length,
      preConstruction,
      construction,
      handover,
      fullyStaffed,
    };
  }, [projects]);

  // Filter projects by stage, role, and text query.
  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();

    return projects.filter((p) => {
      // Stage filter
      if (stageFilter !== 'all' && p.lifecycleStage !== stageFilter) {
        return false;
      }

      // Role filter
      if (roleFilter !== 'all') {
        if (roleFilter === 'admin') {
          return true;
        }

        const roles = p.assignedRoles;
        if (!roles) return false;

        if (roleFilter === 'my_assigned') {
          if (isAdmin) return true;
          if (!currentUserName) return false;
          const assignedNames = Object.values(roles);
          if (
            !assignedNames.some((n) =>
              n?.toLowerCase().includes(currentUserName),
            )
          ) {
            return false;
          }
        } else {
          const roleKey = ROLE_FILTER_TO_FIELD_MAP[roleFilter];
          if (roleKey) {
            const assignee = roles[roleKey];
            if (!assignee || assignee === 'Unassigned') return false;
          }
        }
      }

      // Search query short-circuit check.
      if (q) {
        const matchesQuery =
          p.code.toLowerCase().includes(q) ||
          p.name.toLowerCase().includes(q) ||
          p.location.toLowerCase().includes(q) ||
          p.masterAuthority.toLowerCase().includes(q) ||
          Boolean(p.contractorName?.toLowerCase().includes(q)) ||
          p.projectType.toLowerCase().includes(q) ||
          (p.assignedRoles &&
            Object.values(p.assignedRoles).some((name) =>
              name?.toLowerCase().includes(q),
            ));

        if (!matchesQuery) return false;
      }

      return true;
    });
  }, [projects, query, stageFilter, roleFilter, isAdmin, currentUserName]);

  // Determine active user assignment label for a project.
  const getUserAssignment = (p: AssignedProject): string | null => {
    if (isAdmin) return 'Admin';
    if (!currentUserName || !p.assignedRoles) return null;

    const matchedRole = PROJECT_ROLE_DEFINITIONS.find((def) =>
      p.assignedRoles[def.field]?.toLowerCase().includes(currentUserName),
    );

    return matchedRole ? matchedRole.label : null;
  };

  const handleDeleteProject = (p: AssignedProject) => {
    setDeletingProject({
      id: p.id || '',
      code: p.code,
      name: p.name,
    });
  };

  const summaryCards = [
    {
      title: 'Total Projects',
      value: metrics.total,
      caption: 'in scope',
      icon: Building2,
      colorClass: 'bg-muted text-muted-foreground',
    },
    {
      title: 'Pre-Construction',
      value: metrics.preConstruction,
      caption: 'design & NOC',
      icon: Layers,
      colorClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
    },
    {
      title: 'Construction Stage',
      value: metrics.construction,
      caption: 'supervision',
      icon: HardHat,
      colorClass: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    },
    {
      title: 'Staffed Projects',
      value: metrics.fullyStaffed,
      caption: `of ${metrics.total} complete`,
      icon: UserCheck,
      colorClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    },
  ];

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
            Check projects and multidisciplinary team role assignments across
            all active sites.
          </p>
        </div>

        {canCreateProject && (
          <Button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="h-9 gap-1.5 self-start bg-primary text-primary-foreground hover:bg-primary/90 sm:self-auto"
          >
            <FolderPlus className="size-4" aria-hidden />
            Register Project
          </Button>
        )}
      </header>

      {/* KPI Stats Ribbon */}
      <section
        aria-label="Projects directory summary metrics"
        className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-lg border border-border bg-card p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  {card.title}
                </span>
                <span
                  className={cn(
                    'flex size-7 items-center justify-center rounded-md',
                    card.colorClass,
                  )}
                >
                  <Icon className="size-3.5" />
                </span>
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold tracking-tight text-foreground">
                  {card.value}
                </span>
                <span className="text-xs text-muted-foreground">
                  {card.caption}
                </span>
              </div>
            </div>
          );
        })}
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
            Showing{' '}
            <strong className="text-foreground">
              {filteredProjects.length}
            </strong>{' '}
            of {projects.length}
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
            No projects match the selected filters or assigned roles. Adjust
            your search criteria or clear the filters.
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
          {filteredProjects.map((p) => (
            <ProjectGridCard
              key={p.code}
              project={p}
              userAssignment={getUserAssignment(p)}
              canManageMembers={canManageMembers}
              canDeleteProject={canDeleteProject}
              canViewConsultantAmount={canViewConsultantAmount}
              highlightedRole={roleFilter}
              onManageMembers={() => setEditingProject(p)}
              onEditProject={
                canCreateProject ? () => setEditingDetails(p) : undefined
              }
              onDeleteProject={() => handleDeleteProject(p)}
            />
          ))}
        </ul>
      ) : (
        <ProjectsTableView
          projects={filteredProjects}
          canManageMembers={canManageMembers}
          canDeleteProject={canDeleteProject}
          canViewConsultantAmount={canViewConsultantAmount}
          onManageMembers={(p) => setEditingProject(p)}
          onEditProject={canCreateProject ? setEditingDetails : undefined}
          onDeleteProject={handleDeleteProject}
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

      {/* Edit Project Details Dialog */}
      {editingDetails?.id && editDetails[editingDetails.id] && (
        <ProjectEditDialog
          key={editingDetails.id}
          project={editingDetails}
          details={editDetails[editingDetails.id]}
          authorities={authorities}
          open
          onOpenChange={(open) => !open && setEditingDetails(null)}
        />
      )}

      {/* Admin Safe Delete Project Dialog */}
      {deletingProject && (
        <DeleteProjectDialog
          key={deletingProject.id || deletingProject.code}
          open={!!deletingProject}
          onOpenChange={(open) => !open && setDeletingProject(null)}
          project={deletingProject}
        />
      )}

      {/* Admin Register Project Modal */}
      {canCreateProject && (
        <ProjectDialogModal
          open={isCreateModalOpen}
          onOpenChange={(open) => {
            setIsCreateModalOpen(open);
            if (!open && typeof window !== 'undefined' && window.location.search.includes('create=true')) {
              router.replace('/projects', { scroll: false });
            }
          }}
        >
          {isCreateModalOpen && (
            <ProjectRegistrationForm
              authorities={authorities}
              teamProfiles={teamProfiles}
            />
          )}
        </ProjectDialogModal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Project Card (Grid View)
// ---------------------------------------------------------------------------

interface ProjectGridCardProps {
  project: AssignedProject;
  userAssignment: string | null;
  canManageMembers: boolean;
  canDeleteProject?: boolean;
  canViewConsultantAmount: boolean;
  highlightedRole: string;
  onManageMembers: () => void;
  onEditProject?: () => void;
  onDeleteProject?: () => void;
}

function ProjectGridCard({
  project,
  userAssignment,
  canManageMembers,
  canDeleteProject = false,
  canViewConsultantAmount,
  highlightedRole,
  onManageMembers,
  onEditProject,
  onDeleteProject,
}: ProjectGridCardProps) {
  const roles = project.assignedRoles || DEFAULT_ASSIGNED_ROLES;
  // Distinct people across all slots.
  const headcount = new Set(
    Object.values(project.assignedMembers ?? {})
      .flat()
      .map((m) => m.id),
  ).size;

  return (
    <li className="flex flex-col rounded-lg border border-border bg-card p-5 shadow-xs transition-colors hover:border-ring/50">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="rounded bg-(--site-navy) px-2.5 py-0.5 font-mono text-xs font-bold text-white transition-opacity hover:opacity-90 dark:bg-[#0e1c30] dark:text-(--site-cyan)">
            {project.code}
          </h1>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium',
              stageTone(project.lifecycleStage),
            )}
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
          {project.name}
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
            <span className="truncate">
              General Contractor: {project.contractorName}
            </span>
          </p>
        )}
      </div>

      {/* Commercial Values */}
      <div className="mt-3.5 grid grid-cols-2 gap-2 rounded-md border border-border/80 bg-muted/20 p-2.5 text-xs">
        <div>
          <span className="text-[11px] text-muted-foreground">
            Contractor Contract
          </span>
          <p className="font-mono font-semibold text-foreground">
            {formatCurrencyAED(project.clientContractorAmount)}
          </p>
        </div>
        {canViewConsultantAmount && (
          <div>
            <span className="text-[11px] text-muted-foreground">
              Consultant Contract
            </span>
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
            {headcount} assigned
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 text-xs">
          {PROJECT_ROLE_DEFINITIONS.map((def) => (
            <RoleItemTile
              key={def.field}
              title={def.shortLabel}
              name={roles[def.field]}
              highlight={highlightedRole === def.filterKey}
            />
          ))}
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Link
            href={`/noc-tracker/${project.code}`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 gap-1.5 text-xs',
            )}
          >
            <ShieldCheck className="size-3.5" />
            NOC Tracker
          </Link>
          <Link
            href={`/projects/${project.code}`}
            className={cn(
              buttonVariants({ variant: 'outline', size: 'sm' }),
              'h-8 gap-1.5 text-xs',
            )}
          >
            <FileText className="size-3.5" />
            See Projects
          </Link>
        </div>

        <div className="flex items-center gap-1.5">
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

          {onEditProject && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onEditProject}
              className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/10 hover:text-primary"
            >
              <Pencil className="size-3.5" />
              Edit project
            </Button>
          )}

          {canDeleteProject && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDeleteProject}
              className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              title="Safely Delete or Archive Project"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
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
  name?: string;
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
          'mt-0.5 line-clamp-2 break-words text-xs font-medium',
          isUnassigned ? 'text-muted-foreground/60 italic' : 'text-foreground',
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

interface ProjectsTableViewProps {
  projects: AssignedProject[];
  canManageMembers: boolean;
  canDeleteProject?: boolean;
  canViewConsultantAmount: boolean;
  onManageMembers: (p: AssignedProject) => void;
  onEditProject?: (p: AssignedProject) => void;
  onDeleteProject?: (p: AssignedProject) => void;
}

function ProjectsTableView({
  projects,
  canManageMembers,
  canDeleteProject = false,
  canViewConsultantAmount,
  onManageMembers,
  onEditProject,
  onDeleteProject,
}: ProjectsTableViewProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full min-w-220 text-left text-xs">
          <caption className="sr-only">
            List of assigned projects and roles
          </caption>
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
          <tbody className="divide-y border-border">
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
                    <span className="block truncate">
                      RE: {r?.residentEngineer || '—'}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      AM: {r?.areaManager || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block truncate">
                      AE: {r?.authorityEngineer || '—'}
                    </span>
                    <span className="block truncate text-muted-foreground">
                      DC: {r?.docController || '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-muted-foreground">
                    <span className="block truncate">
                      Arch: {r?.architectEngineer || '—'} · Struct:{' '}
                      {r?.structureEngineer || '—'}
                    </span>
                    <span className="block truncate">
                      MEP: {r?.mepEngineer || '—'} · Civil:{' '}
                      {r?.civilEngineer || '—'}
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
                    {onEditProject && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onEditProject(p)}
                        className="h-7 px-2 text-[11px] text-primary"
                      >
                        Edit
                      </Button>
                    )}
                    {canDeleteProject && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeleteProject?.(p)}
                        className="h-7 px-2 text-[11px] text-destructive hover:bg-destructive/10 hover:text-destructive"
                        title="Safely Delete or Archive Project"
                      >
                        Delete
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
