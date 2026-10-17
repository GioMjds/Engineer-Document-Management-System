'use client';

import { recordAuthorityDecision } from '@/app/actions/noc';
import { Button } from '@/components/ui/button';
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
import type { NocResubmissionEntry, ProjectNocItem } from '@/types/noc';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileCheck,
  XCircle,
} from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const authorityResultSchema = z
  .object({
    decision: z.enum(['obtained', 'rejected']),
    expiryDate: z.string(),
    documentUrl: z.string(),
    rejectionReason: z.string(),
  })
  .superRefine((data, ctx) => {
    const today = new Date().toISOString().split('T')[0];
    if (data.decision === 'obtained') {
      if (!data.expiryDate) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiryDate'],
          message: 'Expiry date is mandatory for obtained NOCs.',
        });
      } else if (data.expiryDate <= today) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['expiryDate'],
          message: 'Expiry date must be in the future.',
        });
      }
    } else if (data.decision === 'rejected') {
      if (
        !data.rejectionReason.trim() ||
        data.rejectionReason.trim().length < 5
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['rejectionReason'],
          message: 'Authority rejection reason must be at least 5 characters.',
        });
      }
    }
  });

type AuthorityResultValues = z.infer<typeof authorityResultSchema>;

interface AuthorityResultModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noc: ProjectNocItem;
  onDecisionRecorded: (updated: ProjectNocItem) => void;
}

export function AuthorityResultModal({
  open,
  onOpenChange,
  noc,
  onDecisionRecorded,
}: AuthorityResultModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    control,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<AuthorityResultValues>({
    resolver: zodResolver(authorityResultSchema),
    defaultValues: {
      decision: 'obtained',
      expiryDate: '',
      documentUrl: '',
      rejectionReason: '',
    },
  });

  const decision = useWatch({ control, name: 'decision' });
  const rejectionReason = useWatch({ control, name: 'rejectionReason' });

  async function onSubmit(values: AuthorityResultValues) {
    const res = await recordAuthorityDecision(noc.id, {
      decision: values.decision,
      expiryDate:
        values.decision === 'obtained' ? values.expiryDate : undefined,
      officialDocumentUrl:
        values.decision === 'obtained'
          ? values.documentUrl.trim() || undefined
          : undefined,
      rejectionReason:
        values.decision === 'rejected'
          ? values.rejectionReason.trim()
          : undefined,
    });

    if (!res.success) {
      toast.error(res.error || 'Failed to record authority decision.');
      return;
    }

    const now = new Date().toISOString();
    if (values.decision === 'obtained') {
      toast.success(
        'NOC obtained status recorded with automated 14-day expiry tracking.',
      );
      onDecisionRecorded({
        ...noc,
        status: 'Approved',
        expiryDate: values.expiryDate,
        issuanceDate: now.split('T')[0],
        updatedAt: now,
      });
    } else {
      const currentRevNum = parseInt(noc.revision.replace('R', ''), 10) || 0;
      const nextRev = `R${String(currentRevNum + 1).padStart(2, '0')}`;
      const newEntry: NocResubmissionEntry = {
        id: `resub-${now}`,
        projectNocId: noc.id,
        revision: nextRev,
        rejectionReason: values.rejectionReason.trim(),
        rejectionDate: now,
        resubmissionDate: now,
        resubmittedBy: 'Authority Engineer',
      };

      toast.success(
        `Authority rejection recorded. Revision ${nextRev} created.`,
      );
      onDecisionRecorded({
        ...noc,
        status: 'Rejected',
        revision: nextRev,
        rejectionReason: values.rejectionReason.trim(),
        resubmissionHistory: [...(noc.resubmissionHistory || []), newEntry],
        updatedAt: now,
      });
    }

    onOpenChange(false);
    reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileCheck className="h-4 w-4 text-primary" />
            Record Statutory Authority Decision
          </DialogTitle>
          <DialogDescription>
            Record statutory determination for {noc.reviewingAuthority} (
            {noc.description}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-1">
          {/* Decision Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              Authority Determination *
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setValue('decision', 'obtained')}
                className={`p-2.5 rounded-md border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  decision === 'obtained'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Approved / Obtained</span>
              </button>

              <button
                type="button"
                onClick={() => setValue('decision', 'rejected')}
                className={`p-2.5 rounded-md border text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                  decision === 'rejected'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300'
                    : 'border-border bg-card text-muted-foreground hover:bg-muted'
                }`}
              >
                <XCircle className="h-4 w-4 text-rose-600" />
                <span>Rejected / Comments</span>
              </button>
            </div>
          </div>

          {decision === 'obtained' ? (
            <div className="space-y-3 pt-1">
              <div>
                <Label
                  htmlFor="decision-expiry"
                  className="text-xs font-medium"
                >
                  Mandatory Expiry Date * (Future date)
                </Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="decision-expiry"
                    type="date"
                    min={today}
                    {...register('expiryDate')}
                    className="pl-8 text-xs font-mono h-8"
                  />
                </div>
                {errors.expiryDate && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.expiryDate.message}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground mt-1">
                  Triggers automated internal and external alerts 14 days prior
                  to expiration.
                </p>
              </div>

              <div>
                <Label htmlFor="decision-doc" className="text-xs font-medium">
                  Official NOC Certificate / Document URL (Optional)
                </Label>
                <Input
                  id="decision-doc"
                  {...register('documentUrl')}
                  placeholder="https://... or certificate ref"
                  className="text-xs font-mono h-8 mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <Label
                  htmlFor="decision-reason"
                  className="text-xs font-medium"
                >
                  Authority Rejection Reason * (Min 5 chars)
                </Label>
                <Textarea
                  id="decision-reason"
                  rows={3}
                  {...register('rejectionReason')}
                  placeholder="e.g. Authority returned drawing comments regarding fire egress calculations."
                  className="text-xs mt-1"
                />
                {errors.rejectionReason && (
                  <p className="text-xs text-destructive mt-1">
                    {errors.rejectionReason.message}
                  </p>
                )}
                <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Creates next revision in tracker, retaining previous
                    history.
                  </span>
                  <span>
                    {(rejectionReason || '').trim().length} / 5 chars min
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onOpenChange(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className={`font-semibold ${
                decision === 'obtained'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {isSubmitting
                ? 'Recording...'
                : decision === 'obtained'
                  ? 'Confirm Obtained'
                  : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
