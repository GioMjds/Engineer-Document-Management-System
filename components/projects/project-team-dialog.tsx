'use client';

import { useCallback, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users, ShieldCheck, HardHat, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateProjectMembers } from '@/app/actions/admin';
import type { AssignedProject } from '@/types/noc';

export interface ProfileItem {
  id: string;
  full_name: string | null;
  role: string;
  email: string | null;
}

interface RoleOption {
  id: string;
  label: string;
  roleBadge: string;
  suggested: boolean;
}

interface ProjectTeamDialogProps {
  project: AssignedProject;
  teamProfiles: ProfileItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Formats user role into human-readable label.
function formatRoleBadge(role: string): string {
  switch (role) {
    case 'resident_engineer':
      return 'Resident Engineer';
    case 'area_manager':
      return 'Area Manager';
    case 'authority_engineer':
      return 'Authority Engineer';
    case 'dc':
    case 'doc_controller':
      return 'Doc Controller';
    case 'engineer':
      return 'Discipline Engineer';
    case 'admin':
      return 'System Admin';
    case 'ceo':
      return 'Executive';
    default:
      return role.replace(/_/g, ' ');
  }
}

// Formats clean profile name without appending redundant technical role enums.
function getCleanProfileName(profile: ProfileItem): string {
  return profile.full_name?.trim() || profile.email?.trim() || 'Unknown';
}

export function ProjectTeamDialog({
  project,
  teamProfiles,
  open,
  onOpenChange,
}: ProjectTeamDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Match by true database member UUID first, fallback to profile full name
  const findProfileIdByName = (name?: string) => {
    if (!name || name === 'Unassigned') return 'unassigned';
    const match = teamProfiles.find(
      (p) =>
        (p.full_name && p.full_name.toLowerCase() === name.toLowerCase()) ||
        (p.full_name && name.toLowerCase().includes(p.full_name.toLowerCase())),
    );
    return match ? match.id : 'unassigned';
  };

  const [reId, setReId] = useState<string>(
    () =>
      project.assignedMemberIds?.residentEngineer ||
      findProfileIdByName(project.assignedRoles?.residentEngineer),
  );
  const [amId, setAmId] = useState<string>(
    () =>
      project.assignedMemberIds?.areaManager ||
      findProfileIdByName(project.assignedRoles?.areaManager),
  );
  const [aeId, setAeId] = useState<string>(
    () =>
      project.assignedMemberIds?.authorityEngineer ||
      findProfileIdByName(project.assignedRoles?.authorityEngineer),
  );
  const [dcId, setDcId] = useState<string>(
    () =>
      project.assignedMemberIds?.docController ||
      findProfileIdByName(project.assignedRoles?.docController),
  );
  const [archId, setArchId] = useState<string>(
    () =>
      project.assignedMemberIds?.architectEngineer ||
      findProfileIdByName(project.assignedRoles?.architectEngineer),
  );
  const [structId, setStructId] = useState<string>(
    () =>
      project.assignedMemberIds?.structureEngineer ||
      findProfileIdByName(project.assignedRoles?.structureEngineer),
  );
  const [mepId, setMepId] = useState<string>(
    () =>
      project.assignedMemberIds?.mepEngineer ||
      findProfileIdByName(project.assignedRoles?.mepEngineer),
  );
  const [civilId, setCivilId] = useState<string>(
    () =>
      project.assignedMemberIds?.civilEngineer ||
      findProfileIdByName(project.assignedRoles?.civilEngineer),
  );

  const handleSave = () => {
    const projectId = project.id;
    if (!projectId) {
      toast.error('Project identifier not found in live database.');
      return;
    }

    startTransition(async () => {
      const members: Array<{
        userId: string;
        discipline?: 'mep' | 'architect' | 'structure' | 'civil';
      }> = [];

      if (reId !== 'unassigned') members.push({ userId: reId });
      if (amId !== 'unassigned') members.push({ userId: amId });
      if (aeId !== 'unassigned') members.push({ userId: aeId });
      if (dcId !== 'unassigned') members.push({ userId: dcId });
      if (archId !== 'unassigned')
        members.push({ userId: archId, discipline: 'architect' });
      if (structId !== 'unassigned')
        members.push({ userId: structId, discipline: 'structure' });
      if (mepId !== 'unassigned')
        members.push({ userId: mepId, discipline: 'mep' });
      if (civilId !== 'unassigned')
        members.push({ userId: civilId, discipline: 'civil' });

      const res = await updateProjectMembers(projectId, members);
      if (!res.ok) {
        toast.error(res.error || 'Failed to update project team members.');
        return;
      }

      toast.success(`Team assignments updated for project ${project.code}.`);
      onOpenChange(false);
      router.refresh();
    });
  };

  const getRoleOptions = useCallback(
    (targetRole: string) => {
      const isSuggested = (p: ProfileItem) => {
        if (targetRole === 'dc') {
          return p.role === 'dc' || p.role === 'doc_controller';
        }
        return p.role === targetRole;
      };

      const suggested: RoleOption[] = [];
      const others: RoleOption[] = [];

      for (const p of teamProfiles) {
        const item: RoleOption = {
          id: p.id,
          label: getCleanProfileName(p),
          roleBadge: formatRoleBadge(p.role),
          suggested: isSuggested(p),
        };
        if (item.suggested) {
          suggested.push(item);
        } else {
          others.push(item);
        }
      }

      const unassignedOption = {
        id: 'unassigned',
        label: '— Unassigned —',
        roleBadge: '',
        suggested: false,
      } satisfies RoleOption;

      return {
        suggested,
        others,
        all: [unassignedOption, ...suggested, ...others],
      };
    },
    [teamProfiles],
  );

  const reOptions = useMemo(
    () => getRoleOptions('resident_engineer'),
    [getRoleOptions],
  );
  const amOptions = useMemo(
    () => getRoleOptions('area_manager'),
    [getRoleOptions],
  );
  const aeOptions = useMemo(
    () => getRoleOptions('authority_engineer'),
    [getRoleOptions],
  );
  const dcOptions = useMemo(
    () => getRoleOptions('dc'),
    [getRoleOptions],
  );
  const archOptions = useMemo(
    () => getRoleOptions('engineer'),
    [getRoleOptions],
  );
  const structOptions = useMemo(
    () => getRoleOptions('engineer'),
    [getRoleOptions],
  );
  const mepOptions = useMemo(
    () => getRoleOptions('engineer'),
    [getRoleOptions],
  );
  const civilOptions = useMemo(
    () => getRoleOptions('engineer'),
    [getRoleOptions],
  );

  const renderRoleSelect = (
    id: string,
    label: string,
    value: string,
    onChange: (val: string) => void,
    options: {
      suggested: RoleOption[];
      others: RoleOption[];
      all: RoleOption[];
    },
  ) => {
    return (
      <div className="space-y-1.5 min-w-0">
        <Label htmlFor={id} className="text-xs font-medium text-foreground">
          {label}
        </Label>
        <Select
          value={value}
          items={options.all.map((opt) => ({
            value: opt.id,
            label: opt.label,
          }))}
          onValueChange={(val) => onChange(val ?? 'unassigned')}
        >
          <SelectTrigger id={id} className="h-9 w-full min-w-0 text-xs">
            <SelectValue placeholder="— Unassigned —" />
          </SelectTrigger>
          <SelectContent className="max-h-60 overflow-y-auto">
            <SelectItem
              value="unassigned"
              className="text-xs text-muted-foreground"
            >
              — Unassigned —
            </SelectItem>
            {options.suggested.length > 0 && (
              <SelectGroup>
                <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Suggested for this role
                </SelectLabel>
                {options.suggested.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    <span className="truncate">{opt.label}</span>
                    <span className="ml-auto pl-2 text-[10px] text-muted-foreground shrink-0">
                      {opt.roleBadge}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
            {options.others.length > 0 && (
              <SelectGroup>
                <SelectSeparator />
                <SelectLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Other Staff
                </SelectLabel>
                {options.others.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id} className="text-xs">
                    <span className="truncate">{opt.label}</span>
                    <span className="ml-auto pl-2 text-[10px] text-muted-foreground shrink-0">
                      {opt.roleBadge}
                    </span>
                  </SelectItem>
                ))}
              </SelectGroup>
            )}
          </SelectContent>
        </Select>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto overflow-x-hidden sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
              <Users className="size-4" />
            </span>
            <DialogTitle className="text-base font-semibold">
              Manage Team: {project.code} - {project.name}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Assign registered staff to oversight and discipline engineering roles for this project.
          </DialogDescription>
        </DialogHeader>

        {/* Project Context Pill Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="font-semibold text-foreground">{project.code}</span>
            <span className="text-muted-foreground">•</span>
            <span className="truncate text-muted-foreground">{project.name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {project.masterAuthority && (
              <Badge variant="outline" className="text-[11px] font-normal">
                {project.masterAuthority}
              </Badge>
            )}
            {project.lifecycleStage && (
              <Badge variant="secondary" className="text-[11px] font-normal">
                {project.lifecycleStage}
              </Badge>
            )}
          </div>
        </div>

        <div className="space-y-4 py-1">
          {/* Executive & Oversight */}
          <div className="rounded-md border border-border bg-muted/10 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldCheck className="size-3.5 text-muted-foreground" />
              Management & Permitting Oversight
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {renderRoleSelect(
                're-select',
                'Resident Engineer (RE)',
                reId,
                setReId,
                reOptions,
              )}
              {renderRoleSelect(
                'am-select',
                'Area Manager (AM)',
                amId,
                setAmId,
                amOptions,
              )}
              {renderRoleSelect(
                'ae-select',
                'Authority Engineer',
                aeId,
                setAeId,
                aeOptions,
              )}
              {renderRoleSelect(
                'dc-select',
                'Document Controller (DC)',
                dcId,
                setDcId,
                dcOptions,
              )}
            </div>
          </div>

          {/* Discipline Engineers */}
          <div className="rounded-md border border-border bg-muted/10 p-3.5 space-y-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <HardHat className="size-3.5 text-muted-foreground" />
              Discipline Engineers
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {renderRoleSelect(
                'arch-select',
                'Architectural Engineer',
                archId,
                setArchId,
                archOptions,
              )}
              {renderRoleSelect(
                'struct-select',
                'Structural Engineer',
                structId,
                setStructId,
                structOptions,
              )}
              {renderRoleSelect(
                'mep-select',
                'MEP Engineer',
                mepId,
                setMepId,
                mepOptions,
              )}
              {renderRoleSelect(
                'civil-select',
                'Civil Engineer',
                civilId,
                setCivilId,
                civilOptions,
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            className="h-9 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={handleSave}
            disabled={isPending}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-1.5 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Assignments'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
