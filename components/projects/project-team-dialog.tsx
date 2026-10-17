'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Users } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
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

interface ProjectTeamDialogProps {
  project: AssignedProject;
  teamProfiles: ProfileItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectTeamDialog({
  project,
  teamProfiles,
  open,
  onOpenChange,
}: ProjectTeamDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Find initial matches by profile name if available
  const findProfileIdByName = (name?: string) => {
    if (!name || name === 'Unassigned') return 'unassigned';
    const match = teamProfiles.find(
      (p) =>
        (p.full_name && p.full_name.toLowerCase() === name.toLowerCase()) ||
        (p.full_name && name.toLowerCase().includes(p.full_name.toLowerCase())),
    );
    return match ? match.id : 'unassigned';
  };

  const [reId, setReId] = useState<string>(() =>
    findProfileIdByName(project.assignedRoles?.residentEngineer),
  );
  const [amId, setAmId] = useState<string>(() =>
    findProfileIdByName(project.assignedRoles?.areaManager),
  );
  const [aeId, setAeId] = useState<string>(() =>
    findProfileIdByName(project.assignedRoles?.authorityEngineer),
  );
  const [dcId, setDcId] = useState<string>(() =>
    findProfileIdByName(project.assignedRoles?.docController),
  );
  const [archId, setArchId] = useState<string>(() =>
    findProfileIdByName(project.assignedRoles?.architectEngineer),
  );
  const [structId, setStructId] = useState<string>(() =>
    findProfileIdByName(project.assignedRoles?.structureEngineer),
  );
  const [mepId, setMepId] = useState<string>(() =>
    findProfileIdByName(project.assignedRoles?.mepEngineer),
  );
  const [civilId, setCivilId] = useState<string>(() =>
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

      toast.success(
        `Team assignments updated for project ${project.code}.`,
      );
      onOpenChange(false);
      router.refresh();
    });
  };

  const getOptionsForRole = (primaryRole?: string) => {
    // Show role matches first, then other team members
    const matched = primaryRole
      ? teamProfiles.filter((p) => p.role === primaryRole)
      : [];
    const others = primaryRole
      ? teamProfiles.filter((p) => p.role !== primaryRole)
      : teamProfiles;

    return [
      { id: 'unassigned', label: '— Unassigned —' },
      ...matched.map((p) => ({
        id: p.id,
        label: `${p.full_name || p.email} (${p.role})`,
      })),
      ...others.map((p) => ({
        id: p.id,
        label: `${p.full_name || p.email} (${p.role})`,
      })),
    ];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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

        <div className="space-y-4 py-2">
          {/* Executive & Oversight */}
          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Management & Permitting Oversight
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="re-select" className="text-xs">
                  Resident Engineer (RE)
                </Label>
                <Select
                  value={reId}
                  items={getOptionsForRole('resident_engineer').map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  onValueChange={(val) => setReId(val ?? 'unassigned')}
                >
                  <SelectTrigger id="re-select" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptionsForRole('resident_engineer').map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="am-select" className="text-xs">
                  Area Manager (AM)
                </Label>
                <Select
                  value={amId}
                  items={getOptionsForRole('area_manager').map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  onValueChange={(val) => setAmId(val ?? 'unassigned')}
                >
                  <SelectTrigger id="am-select" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptionsForRole('area_manager').map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ae-select" className="text-xs">
                  Authority Engineer
                </Label>
                <Select
                  value={aeId}
                  items={getOptionsForRole('authority_engineer').map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  onValueChange={(val) => setAeId(val ?? 'unassigned')}
                >
                  <SelectTrigger id="ae-select" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptionsForRole('authority_engineer').map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dc-select" className="text-xs">
                  Document Controller (DC)
                </Label>
                <Select
                  value={dcId}
                  items={getOptionsForRole('dc').map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  onValueChange={(val) => setDcId(val ?? 'unassigned')}
                >
                  <SelectTrigger id="dc-select" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptionsForRole('dc').map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Discipline Engineers */}
          <div className="rounded-md border border-border bg-muted/20 p-3 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Discipline Engineers
            </h3>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="arch-select" className="text-xs">
                  Architectural Engineer
                </Label>
                <Select
                  value={archId}
                  items={getOptionsForRole('engineer').map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  onValueChange={(val) => setArchId(val ?? 'unassigned')}
                >
                  <SelectTrigger id="arch-select" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptionsForRole('engineer').map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="struct-select" className="text-xs">
                  Structural Engineer
                </Label>
                <Select
                  value={structId}
                  items={getOptionsForRole('engineer').map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  onValueChange={(val) => setStructId(val ?? 'unassigned')}
                >
                  <SelectTrigger id="struct-select" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptionsForRole('engineer').map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="mep-select" className="text-xs">
                  MEP Engineer
                </Label>
                <Select
                  value={mepId}
                  items={getOptionsForRole('engineer').map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  onValueChange={(val) => setMepId(val ?? 'unassigned')}
                >
                  <SelectTrigger id="mep-select" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptionsForRole('engineer').map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="civil-select" className="text-xs">
                  Civil Engineer
                </Label>
                <Select
                  value={civilId}
                  items={getOptionsForRole('engineer').map((opt) => ({
                    value: opt.id,
                    label: opt.label,
                  }))}
                  onValueChange={(val) => setCivilId(val ?? 'unassigned')}
                >
                  <SelectTrigger id="civil-select" className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {getOptionsForRole('engineer').map((opt) => (
                      <SelectItem key={opt.id} value={opt.id} className="text-xs">
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
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
            {isPending ? 'Saving...' : 'Save Assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
