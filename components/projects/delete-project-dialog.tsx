'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  Archive,
  FileText,
  Loader2,
  ShieldAlert,
  Trash2,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
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
import {
  deleteProjectAction,
  getProjectDeletionImpact,
} from '@/app/actions/admin';

export interface DeleteProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  project: {
    id: string;
    code: string;
    name: string;
  };
  redirectToProjectsOnDelete?: boolean;
  onSuccess?: () => void;
}

export function DeleteProjectDialog({
  open,
  onOpenChange,
  project,
  redirectToProjectsOnDelete = false,
  onSuccess,
}: DeleteProjectDialogProps) {
  const router = useRouter();
  const [mode, setMode] = useState<'archive' | 'purge'>('archive');
  const [confirmationInput, setConfirmationInput] = useState('');
  const [isPending, startTransition] = useTransition();
  const [impact, setImpact] = useState<{
    documentsCount: number;
    nocsCount: number;
    membersCount: number;
    loading: boolean;
  }>({
    documentsCount: 0,
    nocsCount: 0,
    membersCount: 0,
    loading: true,
  });

  // Fetch live dependency counts when dialog opens.
  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    getProjectDeletionImpact(project.id)
      .then((res) => {
        if (isMounted && res.ok) {
          setImpact({
            documentsCount: res.documentsCount ?? 0,
            nocsCount: res.nocsCount ?? 0,
            membersCount: res.membersCount ?? 0,
            loading: false,
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setImpact((prev) => ({ ...prev, loading: false }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [open, project.id]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setConfirmationInput('');
      setMode('archive');
    }
    onOpenChange(nextOpen);
  };

  const isCodeMatched =
    confirmationInput.trim().toUpperCase() === project.code.trim().toUpperCase();

  const handleDelete = () => {
    if (!isCodeMatched) return;

    startTransition(async () => {
      const res = await deleteProjectAction({
        projectId: project.id,
        confirmCode: confirmationInput,
        mode,
      });

      if (!res.ok) {
        toast.error(res.error || 'Failed to delete project.');
        return;
      }

      toast.success(
        mode === 'archive'
          ? `Project ${project.code} moved to archive.`
          : `Project ${project.code} permanently purged.`,
      );

      onOpenChange(false);
      onSuccess?.();

      if (redirectToProjectsOnDelete) {
        router.push('/projects');
      } else {
        router.refresh();
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="size-5 shrink-0" />
            <DialogTitle className="text-base font-semibold">
              Safely Delete Project {project.code}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground pt-1">
            Confirm project removal for{' '}
            <span className="font-semibold text-foreground">
              {project.code} — {project.name}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2 text-xs">
          {/* Linked Record Impact Metrics */}
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
              Associated Records in Project Scope
            </span>
            {impact.loading ? (
              <div className="flex items-center gap-2 text-muted-foreground py-1">
                <Loader2 className="size-3.5 animate-spin" />
                <span>Checking project dependencies...</span>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                <div className="rounded border border-border/60 bg-background/60 p-2">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                    <FileText className="size-3" />
                    <span>Documents</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {impact.documentsCount}
                  </span>
                </div>
                <div className="rounded border border-border/60 bg-background/60 p-2">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                    <AlertTriangle className="size-3" />
                    <span>NOC Items</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {impact.nocsCount}
                  </span>
                </div>
                <div className="rounded border border-border/60 bg-background/60 p-2">
                  <div className="flex items-center justify-center gap-1 text-muted-foreground text-[10px]">
                    <Users className="size-3" />
                    <span>Members</span>
                  </div>
                  <span className="text-sm font-bold text-foreground">
                    {impact.membersCount}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mode Selector */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-foreground">
              Select Deletion Strategy
            </Label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setMode('archive')}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                  mode === 'archive'
                    ? 'border-primary bg-primary/5 text-primary shadow-xs'
                    : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Archive className="size-3.5 text-primary" />
                  <span>Archive (Soft Delete)</span>
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground leading-tight">
                  Recommended. Hides project from active views while preserving all documents and audit history.
                </span>
              </button>

              <button
                type="button"
                onClick={() => setMode('purge')}
                className={`flex flex-col items-start rounded-lg border p-3 text-left transition-all ${
                  mode === 'purge'
                    ? 'border-destructive bg-destructive/10 text-destructive shadow-xs'
                    : 'border-border bg-background hover:bg-muted/40 text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                  <Trash2 className="size-3.5 text-destructive" />
                  <span>Permanent Purge</span>
                </div>
                <span className="mt-1 text-[11px] text-muted-foreground leading-tight">
                  Irreversible. Permanently purges project, storage files, reviews, and NOC items.
                </span>
              </button>
            </div>
          </div>

          {/* Safety Code Input Guard */}
          <div className="space-y-1.5 border-t border-border pt-3">
            <Label htmlFor="confirm-code" className="text-xs text-foreground">
              Type project code{' '}
              <span className="font-mono font-bold text-destructive">
                {project.code}
              </span>{' '}
              to confirm:
            </Label>
            <Input
              id="confirm-code"
              placeholder={project.code}
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              className="font-mono text-xs"
              autoComplete="off"
            />
            {confirmationInput && !isCodeMatched && (
              <p className="text-[11px] text-destructive">
                Code must match &ldquo;{project.code}&rdquo; exactly.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={mode === 'purge' ? 'destructive' : 'default'}
            size="sm"
            onClick={handleDelete}
            disabled={!isCodeMatched || isPending}
            className="gap-1.5"
          >
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : mode === 'purge' ? (
              <Trash2 className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
            <span>
              {isPending
                ? 'Processing...'
                : mode === 'purge'
                  ? 'Permanently Purge Project'
                  : 'Safely Archive Project'}
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
