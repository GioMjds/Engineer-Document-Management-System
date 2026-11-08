'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { updateProjectMembers } from '@/app/actions/admin';
import type { AssignedProject } from '@/types/noc';
import {
  TEAM_FIELDS,
  collectMembers,
  isSameTeam,
  type TeamAssignment,
} from '@/lib/team-assignment';
import {
  TeamAssignmentFields,
  type ProfileItem,
} from './team-assignment-fields';

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

  const [initial] = useState<TeamAssignment>(
    () =>
      Object.fromEntries(
        TEAM_FIELDS.map((f) => [
          f.key,
          (project.assignedMembers?.[f.projectKey] ?? []).map((m) => m.id),
        ]),
      ) as TeamAssignment,
  );
  const [team, setTeam] = useState<TeamAssignment>(initial);
  const hasChanges = !isSameTeam(team, initial);

  const handleSave = () => {
    if (!project.id) {
      toast.error('Project identifier not found in live database.');
      return;
    }
    const projectId = project.id;

    startTransition(async () => {
      const res = await updateProjectMembers(projectId, collectMembers(team));
      if (!res.ok) {
        toast.error(res.error || 'Failed to update project team members.');
        return;
      }

      toast.success(`Team assignments updated for project ${project.code}.`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Manage team
          </DialogTitle>
          <DialogDescription className="truncate text-xs">
            <span className="font-mono">{project.code}</span> · {project.name}
          </DialogDescription>
        </DialogHeader>

        <TeamAssignmentFields
          team={team}
          profiles={teamProfiles}
          onChange={(key, ids) => setTeam((t) => ({ ...t, [key]: ids }))}
        />

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasChanges}
          >
            {isPending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
            {isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
