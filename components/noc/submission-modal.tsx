'use client';

import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { submitNocApplication } from '@/app/actions/noc';
import { Button } from '@/components/ui/button';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileText,
  Link as LinkIcon,
  Send,
  ShieldAlert,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ProjectDocumentItem, ProjectNocItem } from '@/types/noc';

const submissionSchema = z.object({
  referenceNo: z
    .string()
    .trim()
    .min(1, 'Authority tracking / reference number is required.'),
  submissionDate: z.string().min(1, 'Submission date is required.'),
  proofUrl: z.string(),
  statutoryWaiverReason: z.string().optional(),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface SubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noc: ProjectNocItem;
  readyDocs?: ProjectDocumentItem[];
  currentUserRole?: string;
  onSubmitted: (updated: ProjectNocItem) => void;
}

export function SubmissionModal({
  open,
  onOpenChange,
  noc,
  readyDocs = [],
  currentUserRole,
  onSubmitted,
}: SubmissionModalProps) {
  const unsatisfiedReqs = (noc.requirements || []).filter(
    (r) => !r.isSatisfied,
  );
  const isAdmin = currentUserRole === 'admin';
  const isSubmissionBlocked = unsatisfiedReqs.length > 0 && !isAdmin;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    values: {
      referenceNo: noc.referenceNumber || '',
      submissionDate: new Date().toISOString().split('T')[0],
      proofUrl: '',
      statutoryWaiverReason: '',
    },
  });

  const waiverReason = useWatch({ control, name: 'statutoryWaiverReason' }) || '';

  const canAdminSubmit =
    unsatisfiedReqs.length === 0 ||
    (isAdmin && waiverReason.trim().length >= 15);

  async function onSubmit(values: SubmissionFormValues) {
    if (unsatisfiedReqs.length > 0 && !isAdmin) {
      toast.error(
        'Submission blocked: all statutory checklist items must be satisfied.',
      );
      return;
    }

    if (
      unsatisfiedReqs.length > 0 &&
      isAdmin &&
      (!values.statutoryWaiverReason ||
        values.statutoryWaiverReason.trim().length < 15)
    ) {
      toast.error('Admin waiver justification must be at least 15 characters.');
      return;
    }

    const res = await submitNocApplication(noc.id, {
      authorityReference: values.referenceNo,
      submittedAt: values.submissionDate,
      submissionProofUrl: values.proofUrl.trim() || undefined,
      statutoryWaiverReason: values.statutoryWaiverReason?.trim() || undefined,
    });

    if (!res.success) {
      toast.error(res.error || 'Failed to submit application.');
      return;
    }

    toast.success('Application submitted to statutory authority.');
    onSubmitted({
      ...noc,
      status: 'Submitted',
      referenceNumber: values.referenceNo,
      applyDate: values.submissionDate,
      receiptFileUrl: values.proofUrl.trim() || noc.receiptFileUrl,
      overrideReason:
        values.statutoryWaiverReason?.trim() || noc.overrideReason,
      updatedAt: new Date().toISOString(),
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Send className="h-4 w-4 text-primary" />
            Submit to Statutory Authority
          </DialogTitle>
          <DialogDescription>
            Register the statutory submission for {noc.reviewingAuthority} (
            {noc.description}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5 py-1">
          {/* Statutory Checklist Validation Alert */}
          {unsatisfiedReqs.length > 0 && (
            <div className="p-3 rounded bg-amber-500/10 border border-amber-500/30 text-xs space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-800 dark:text-amber-400">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>
                  Statutory Checklist Incomplete ({unsatisfiedReqs.length}{' '}
                  Pending)
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Authority rules require all statutory checklist items to be
                satisfied prior to submission:
              </p>
              <ul className="list-disc list-inside text-[11px] text-muted-foreground max-h-24 overflow-y-auto space-y-0.5 pl-1">
                {unsatisfiedReqs.map((r) => (
                  <li key={r.id} className="truncate">
                    {r.title}
                  </li>
                ))}
              </ul>
              {isSubmissionBlocked && (
                <div className="pt-1 border-t border-amber-500/20 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                  Submission is locked. Only an Admin can provide a statutory
                  waiver to proceed.
                </div>
              )}
            </div>
          )}

          {/* Admin Waiver Justification Field */}
          {unsatisfiedReqs.length > 0 && isAdmin && (
            <div className="p-2.5 rounded bg-muted/60 border border-border space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                <Label
                  htmlFor="sub-waiver"
                  className="text-xs font-semibold cursor-pointer"
                >
                  Admin Statutory Waiver Justification *
                </Label>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Document reason for submitting with pending statutory items (min
                15 characters). Logged to audit trail.
              </p>
              <Textarea
                id="sub-waiver"
                {...register('statutoryWaiverReason')}
                placeholder="e.g. Preliminary submission authorized under authority fast-track memo #..."
                className="text-xs h-16 resize-none"
              />
            </div>
          )}

          {readyDocs.length > 0 && (
            <div className="p-2.5 rounded bg-emerald-50/70 border border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-emerald-900 dark:text-emerald-200 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  Included Submission Package ({readyDocs.length})
                </span>
                <span className="text-[10px] font-mono uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 px-1 rounded">
                  RE Approved
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {readyDocs.map((d) => (
                  <span
                    key={d.id}
                    className="px-2 py-0.5 rounded bg-white dark:bg-zinc-900 border text-[11px] font-mono text-foreground font-medium"
                  >
                    {d.docNumber} ({d.revision})
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="sub-ref" className="text-xs font-medium">
              Authority Tracking / Reference # *
            </Label>
            <div className="relative mt-1">
              <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="sub-ref"
                {...register('referenceNo')}
                placeholder="e.g. DM-2026-NOC-88912"
                className="pl-8 text-xs font-mono h-8"
              />
            </div>
            {errors.referenceNo && (
              <p className="text-xs text-destructive mt-1">
                {errors.referenceNo.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="sub-date" className="text-xs font-medium">
              Submission Date *
            </Label>
            <div className="relative mt-1">
              <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="sub-date"
                type="date"
                {...register('submissionDate')}
                className="pl-8 text-xs font-mono h-8"
              />
            </div>
            {errors.submissionDate && (
              <p className="text-xs text-destructive mt-1">
                {errors.submissionDate.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="sub-proof" className="text-xs font-medium">
              Submission Receipt / Proof Slip (URL or Reference)
            </Label>
            <div className="relative mt-1">
              <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="sub-proof"
                {...register('proofUrl')}
                placeholder="https://... or receipt ref"
                className="pl-8 text-xs font-mono h-8"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !canAdminSubmit}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {isSubmitting ? 'Submitting...' : 'Confirm Submission'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
