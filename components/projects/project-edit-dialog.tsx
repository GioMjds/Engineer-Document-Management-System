'use client';

import { useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AlertTriangle, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { updateProject } from '@/app/actions/admin';
import {
  PROJECT_STAGES,
  STAGE_LABELS,
  updateProjectSchema,
  type ProjectEditDetails,
} from '@/lib/project-edit';
import { EmailListInput } from './email-list-input';
import type { AssignedProject, MasterAuthorityRecord } from '@/types/noc';

interface ProjectEditDialogProps {
  project: AssignedProject;
  details: ProjectEditDetails;
  authorities: MasterAuthorityRecord[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function ProjectEditDialog({
  project,
  details,
  authorities,
  open,
  onOpenChange,
}: ProjectEditDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState('');

  const [initial] = useState(() => ({
    name: project.name,
    summary: details.summary,
    stage: details.stage,
    client_name: details.clientName,
    contractor_name: details.contractorName,
    client_emails: details.clientEmails,
    contractor_emails: details.contractorEmails,
    master_authority_id: details.masterAuthorityId,
  }));
  const [values, setValues] = useState(initial);
  const set = <K extends keyof typeof initial>(k: K, v: (typeof initial)[K]) =>
    setValues((s) => ({ ...s, [k]: v }));

  const hasChanges = JSON.stringify(values) !== JSON.stringify(initial);
  const authorityChanged =
    values.master_authority_id !== initial.master_authority_id;

  const handleSave = () => {
    if (!project.id) {
      toast.error('Project identifier not found in live database.');
      return;
    }
    const projectId = project.id;
    const parsed = updateProjectSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? 'Invalid project data.');
      return;
    }
    setError('');

    startTransition(async () => {
      const res = await updateProject(projectId, parsed.data);
      if (!res.ok) {
        setError(res.error || 'Failed to update project.');
        return;
      }
      toast.success(`Project ${project.code} updated.`);
      onOpenChange(false);
      router.refresh();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-5 overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            Edit project
          </DialogTitle>
          <DialogDescription className="text-xs">
            Project code <span className="font-mono">{project.code}</span>{' '}
            cannot be changed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field id="edit-name" label="Project name">
            <Input
              id="edit-name"
              value={values.name}
              onChange={(e) => set('name', e.target.value)}
            />
          </Field>

          <Field id="edit-summary" label="Description">
            <Textarea
              id="edit-summary"
              rows={3}
              maxLength={500}
              value={values.summary}
              onChange={(e) => set('summary', e.target.value)}
            />
          </Field>

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="edit-stage" label="Stage">
              <Select
                value={values.stage}
                onValueChange={(v) => set('stage', v as typeof values.stage)}
              >
                <SelectTrigger id="edit-stage" className="w-full">
                  <SelectValue>{STAGE_LABELS[values.stage]}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PROJECT_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {STAGE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="edit-authority" label="Master authority">
              <Select
                value={String(values.master_authority_id)}
                onValueChange={(v) => set('master_authority_id', Number(v))}
              >
                <SelectTrigger id="edit-authority" className="w-full">
                  <SelectValue>
                    {authorities.find((a) => a.id === values.master_authority_id)
                      ?.name ?? project.masterAuthority}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {authorities.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          {authorityChanged && (
            <p
              role="status"
              className="flex items-start gap-2 rounded-md border border-amber-600/30 bg-amber-50 p-2 text-xs text-amber-800 dark:border-amber-400/30 dark:bg-amber-950/40 dark:text-amber-300"
            >
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              Existing NOCs were created from the previous authority and are
              not regenerated.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="edit-client" label="Client name">
              <Input
                id="edit-client"
                value={values.client_name}
                onChange={(e) => set('client_name', e.target.value)}
              />
            </Field>
            <Field id="edit-contractor" label="Contractor name">
              <Input
                id="edit-contractor"
                value={values.contractor_name}
                onChange={(e) => set('contractor_name', e.target.value)}
              />
            </Field>
            <Field
              id="edit-client-emails"
              label="Client emails"
              hint="Press Enter or comma to add each address."
            >
              <EmailListInput
                id="edit-client-emails"
                value={values.client_emails}
                onChange={(v) => set('client_emails', v)}
              />
            </Field>
            <Field
              id="edit-contractor-emails"
              label="Contractor emails"
              hint="Press Enter or comma to add each address."
            >
              <EmailListInput
                id="edit-contractor-emails"
                value={values.contractor_emails}
                onChange={(v) => set('contractor_emails', v)}
              />
            </Field>
          </div>

          {error && (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          )}
        </div>

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
