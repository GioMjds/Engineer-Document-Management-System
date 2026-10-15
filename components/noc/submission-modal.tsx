'use client';

import { useState } from 'react';
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
  const [referenceNo, setReferenceNo] = useState(noc.referenceNumber || '');
  const [submissionDate, setSubmissionDate] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [proofUrl, setProofUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!referenceNo.trim()) {
      toast.error('Authority tracking / reference number is required.');
      return;
    }
    if (!submissionDate) {
      toast.error('Submission date is required.');
      return;
    }

    setSubmitting(true);
    const res = await submitNocApplication(noc.id, {
      authorityReference: referenceNo.trim(),
      submittedAt: submissionDate,
      submissionProofUrl: proofUrl.trim() || undefined,
    });
    setSubmitting(false);

    if (!res.success) {
      toast.error(res.error || 'Failed to submit application.');
      return;
    }

    toast.success('Application submitted to statutory authority.');
    onSubmitted({
      ...noc,
      status: 'Submitted',
      referenceNumber: referenceNo.trim(),
      applyDate: submissionDate,
      receiptFileUrl: proofUrl.trim() || noc.receiptFileUrl,
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

        <form onSubmit={handleSubmit} className="space-y-3.5 py-1">
          <div>
            <Label htmlFor="sub-ref" className="text-xs font-medium">
              Authority Tracking / Reference # *
            </Label>
            <div className="relative mt-1">
              <FileText className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="sub-ref"
                required
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                placeholder="e.g. DM-2026-NOC-88912"
                className="pl-8 text-xs font-mono h-8"
              />
            </div>
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
                required
                value={submissionDate}
                onChange={(e) => setSubmissionDate(e.target.value)}
                className="pl-8 text-xs font-mono h-8"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="sub-proof" className="text-xs font-medium">
              Submission Receipt / Proof Slip (URL or Reference)
            </Label>
            <div className="relative mt-1">
              <LinkIcon className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="sub-proof"
                value={proofUrl}
                onChange={(e) => setProofUrl(e.target.value)}
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
              disabled={submitting}
              className="bg-primary text-primary-foreground font-semibold"
            >
              {submitting ? 'Submitting...' : 'Confirm Submission'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
