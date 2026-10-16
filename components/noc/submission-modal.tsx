'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Send, FileText, Calendar, Link as LinkIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitNocApplication } from '@/app/actions/noc';
import type { ProjectNocItem } from '@/types/noc';

const submissionSchema = z.object({
  referenceNo: z.string().trim().min(1, 'Authority tracking / reference number is required.'),
  submissionDate: z.string().min(1, 'Submission date is required.'),
  proofUrl: z.string(),
});

type SubmissionFormValues = z.infer<typeof submissionSchema>;

interface SubmissionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noc: ProjectNocItem;
  onSubmitted: (updated: ProjectNocItem) => void;
}

export function SubmissionModal({
  open,
  onOpenChange,
  noc,
  onSubmitted,
}: SubmissionModalProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SubmissionFormValues>({
    resolver: zodResolver(submissionSchema),
    values: {
      referenceNo: noc.referenceNumber || '',
      submissionDate: new Date().toISOString().split('T')[0],
      proofUrl: '',
    },
  });

  async function onSubmit(values: SubmissionFormValues) {
    const res = await submitNocApplication(noc.id, {
      authorityReference: values.referenceNo,
      submittedAt: values.submissionDate,
      submissionProofUrl: values.proofUrl.trim() || undefined,
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
              <p className="text-xs text-destructive mt-1">{errors.referenceNo.message}</p>
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
              <p className="text-xs text-destructive mt-1">{errors.submissionDate.message}</p>
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
              disabled={isSubmitting}
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
