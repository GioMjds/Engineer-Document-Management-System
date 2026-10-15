'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, XCircle, Calendar, AlertTriangle, FileCheck } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { recordAuthorityDecision } from '@/app/actions/noc';
import type { ProjectNocItem, NocResubmissionEntry } from '@/types/noc';

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
  const [decision, setDecision] = useState<'obtained' | 'rejected'>('obtained');
  const [expiryDate, setExpiryDate] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (decision === 'obtained') {
      if (!expiryDate) {
        toast.error('Expiry date is mandatory for obtained NOCs.');
        return;
      }
      if (expiryDate <= today) {
        toast.error('Expiry date must be in the future.');
        return;
      }
    } else {
      if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
        toast.error('Authority rejection reason must be at least 5 characters.');
        return;
      }
    }

    setSubmitting(true);
    const res = await recordAuthorityDecision(noc.id, {
      decision,
      expiryDate: decision === 'obtained' ? expiryDate : undefined,
      officialDocumentUrl: decision === 'obtained' ? documentUrl.trim() || undefined : undefined,
      rejectionReason: decision === 'rejected' ? rejectionReason.trim() : undefined,
    });
    setSubmitting(false);

    if (!res.success) {
      toast.error(res.error || 'Failed to record authority decision.');
      return;
    }

    const now = new Date().toISOString();
    if (decision === 'obtained') {
      toast.success('NOC obtained status recorded with automated 14-day expiry tracking.');
      onDecisionRecorded({
        ...noc,
        status: 'Approved',
        expiryDate,
        issuanceDate: now.split('T')[0],
        updatedAt: now,
      });
    } else {
      const currentRevNum = parseInt(noc.revision.replace('R', ''), 10) || 0;
      const nextRev = `R${String(currentRevNum + 1).padStart(2, '0')}`;
      const newEntry: NocResubmissionEntry = {
        id: 'resub-' + Date.now(),
        projectNocId: noc.id,
        revision: nextRev,
        rejectionReason: rejectionReason.trim(),
        rejectionDate: now,
        resubmissionDate: now,
        resubmittedBy: 'Authority Engineer',
      };

      toast.success(`Authority rejection recorded. Revision ${nextRev} created.`);
      onDecisionRecorded({
        ...noc,
        status: 'Rejected',
        revision: nextRev,
        rejectionReason: rejectionReason.trim(),
        resubmissionHistory: [...(noc.resubmissionHistory || []), newEntry],
        updatedAt: now,
      });
    }

    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <FileCheck className="h-4 w-4 text-primary" />
            Record Statutory Authority Decision
          </DialogTitle>
          <DialogDescription>
            Record statutory determination for {noc.reviewingAuthority} ({noc.description}).
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-1">
          {/* Decision Selector */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Authority Determination *</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setDecision('obtained')}
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
                onClick={() => setDecision('rejected')}
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
                <Label htmlFor="decision-expiry" className="text-xs font-medium">
                  Mandatory Expiry Date * (Future date)
                </Label>
                <div className="relative mt-1">
                  <Calendar className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="decision-expiry"
                    type="date"
                    min={today}
                    required
                    value={expiryDate}
                    onChange={(e) => setExpiryDate(e.target.value)}
                    className="pl-8 text-xs font-mono h-8"
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Triggers automated internal and external alerts 14 days prior to expiration.
                </p>
              </div>

              <div>
                <Label htmlFor="decision-doc" className="text-xs font-medium">
                  Official NOC Certificate / Document URL (Optional)
                </Label>
                <Input
                  id="decision-doc"
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://... or certificate ref"
                  className="text-xs font-mono h-8 mt-1"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-1">
              <div>
                <Label htmlFor="decision-reason" className="text-xs font-medium">
                  Authority Rejection Reason * (Min 5 chars)
                </Label>
                <Textarea
                  id="decision-reason"
                  required
                  rows={3}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="e.g. Authority returned drawing comments regarding fire egress calculations."
                  className="text-xs mt-1"
                />
                <div className="flex justify-between items-center text-[11px] text-muted-foreground mt-1">
                  <span className="flex items-center gap-1 text-amber-700 dark:text-amber-400">
                    <AlertTriangle className="h-3 w-3" />
                    Creates next revision in tracker, retaining previous history.
                  </span>
                  <span>{rejectionReason.trim().length} / 5 chars min</span>
                </div>
              </div>
            </div>
          )}

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
              className={`font-semibold ${
                decision === 'obtained'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
            >
              {submitting ? 'Recording...' : decision === 'obtained' ? 'Confirm Obtained' : 'Confirm Rejection'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
