'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  FileText,
  History,
  Clock,
  ShieldCheck,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { submitResidentEngineerReview } from '@/app/actions/reviews';
import { getDownloadUrl } from '@/app/actions/documents';
import { formatSize } from '@/utils/formatters';

export interface ReviewItem {
  id: string;
  revision_label: string;
  level: string;
  decision: string;
  comment: string | null;
  created_at: string;
  reviewerName?: string;
}

export interface ReviewDocument {
  id: string;
  project_id: string | null;
  doc_number: string;
  title: string;
  description: string | null;
  discipline: 'mep' | 'architect' | 'structure' | 'civil' | null;
  revision: string;
  file_name: string;
  file_size: number | null;
  projectName?: string;
  projectCode?: string;
  authorName?: string;
  createdAt: string;
  reviews?: ReviewItem[];
}

const DISCIPLINE_COLORS: Record<string, string> = {
  mep: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  architect: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  structure: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  civil: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
};

export function DrawingReviewModal({
  document,
}: {
  document: ReviewDocument;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'approve_direct' | 'approve_escalate' | 'reject' | null
  >(null);
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    const res = await getDownloadUrl(document.id);
    setDownloading(false);

    if (!res.ok || !res.url) {
      toast.error(res.error || 'Failed to generate download URL.');
      return;
    }

    const a = window.document.createElement('a');
    a.href = res.url;
    a.download = document.file_name || 'drawing';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  }

  async function handleApproveDirect() {
    setPendingAction('approve_direct');
    const res = await submitResidentEngineerReview({
      documentId: document.id,
      decision: 'approve',
      escalateToAreaManager: false,
    });
    setPendingAction(null);

    if (!res.success) {
      toast.error(res.error || 'Approval failed.');
      return;
    }

    toast.success(
      `${document.doc_number} approved directly: Ready for Authority Submission.`,
    );
    setOpen(false);
    router.refresh();
  }

  async function handleApproveEscalate() {
    setPendingAction('approve_escalate');
    const res = await submitResidentEngineerReview({
      documentId: document.id,
      decision: 'approve',
      escalateToAreaManager: true,
    });
    setPendingAction(null);

    if (!res.success) {
      toast.error(res.error || 'Escalation failed.');
      return;
    }

    toast.success(
      `${document.doc_number} approved and escalated to Area Manager queue.`,
    );
    setOpen(false);
    router.refresh();
  }

  async function handleReject() {
    if (!comment || comment.trim().length < 5) {
      toast.error('Rejection comment must be at least 5 characters.');
      return;
    }

    setPendingAction('reject');
    const res = await submitResidentEngineerReview({
      documentId: document.id,
      decision: 'reject',
      comment: comment.trim(),
    });
    setPendingAction(null);

    if (!res.success) {
      toast.error(res.error || 'Rejection failed.');
      return;
    }

    toast.success(`${document.doc_number} rejected with technical feedback.`);
    setComment('');
    setShowRejectForm(false);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" className="bg-[#02a9d3] hover:bg-[#0298be] text-white">Review</Button>} />
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs px-2 py-0.5 rounded bg-muted text-muted-foreground font-semibold">
              {document.revision}
            </span>
            <DialogTitle className="text-lg font-bold tracking-tight">
              Review {document.doc_number}
            </DialogTitle>
          </div>
          <DialogDescription className="text-sm font-medium text-foreground">
            {document.title}
          </DialogDescription>
        </DialogHeader>

        {/* Drawing & Project Metadata */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-muted/40 rounded-lg border text-xs">
          <div>
            <span className="text-muted-foreground block">Project</span>
            <span className="font-semibold text-foreground truncate block">
              {document.projectCode ? `${document.projectCode}` : 'Unassigned'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Discipline</span>
            {document.discipline ? (
              <Badge
                variant="outline"
                className={`text-[10px] uppercase font-bold mt-0.5 ${
                  DISCIPLINE_COLORS[document.discipline] || ''
                }`}
              >
                {document.discipline}
              </Badge>
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </div>
          <div>
            <span className="text-muted-foreground block">Author</span>
            <span className="font-medium text-foreground truncate block">
              {document.authorName || 'Engineer'}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground block">Submitted</span>
            <span className="text-foreground">
              {new Date(document.createdAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {/* Document Description if available */}
        {document.description && (
          <div className="p-3 bg-muted/20 rounded-md border text-xs text-muted-foreground">
            <span className="font-medium text-foreground block mb-0.5">
              Description / Scope:
            </span>
            {document.description}
          </div>
        )}

        {/* Embedded Drawing Asset & Download Bar */}
        <div className="flex items-center justify-between p-3 border rounded-lg bg-card">
          <div className="flex items-center gap-2.5 min-w-0">
            <FileText className="h-5 w-5 text-[#02a9d3] shrink-0" />
            <div className="truncate">
              <p className="text-xs font-medium text-foreground truncate">
                {document.file_name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {document.file_size ? formatSize(document.file_size) : 'PDF / Drawing'}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleDownload}
            disabled={downloading}
            className="gap-1.5 shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            {downloading ? 'Downloading...' : 'Download / View'}
          </Button>
        </div>

        {/* Previous Revision History & Changelog */}
        {document.reviews && document.reviews.length > 0 && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <History className="h-3.5 w-3.5" />
              <span>Prior Revision Review History</span>
            </div>
            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {document.reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="p-2.5 rounded border bg-muted/20 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-foreground">
                        {rev.revision_label}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] ${
                          rev.decision === 'approve'
                            ? 'bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300'
                            : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                        }`}
                      >
                        {rev.decision} ({rev.level.toUpperCase()})
                      </Badge>
                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      {new Date(rev.created_at).toLocaleString()}
                    </span>
                  </div>
                  {rev.comment && (
                    <p className="text-muted-foreground text-xs italic pl-1 border-l-2 border-muted-foreground/30">
                      &quot;{rev.comment}&quot;
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Decision Panel */}
        <div className="space-y-3 border-t pt-4">
          <Label className="text-xs font-semibold text-foreground uppercase tracking-wider block">
            Review Decision Panel
          </Label>

          {showRejectForm ? (
            <div className="space-y-3 p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg">
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="rejection-comment"
                  className="text-xs font-semibold text-red-900 dark:text-red-300 flex items-center gap-1.5"
                >
                  <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                  Mandatory Rejection Comment (minimum 5 characters)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-muted-foreground hover:text-foreground"
                  onClick={() => setShowRejectForm(false)}
                >
                  Cancel
                </Button>
              </div>

              <Textarea
                id="rejection-comment"
                rows={3}
                placeholder="Specify precise technical non-compliance reasons (e.g. Inadequate pipe sizing per DEWA water regulations)..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="text-xs bg-background"
              />

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted-foreground">
                  {comment.trim().length < 5
                    ? `${5 - comment.trim().length} more characters required`
                    : '✓ Comment valid'}
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={comment.trim().length < 5 || pendingAction !== null}
                  onClick={handleReject}
                  className="gap-1.5"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  {pendingAction === 'reject' ? 'Rejecting...' : 'Confirm Rejection'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="destructive"
                disabled={pendingAction !== null}
                onClick={() => setShowRejectForm(true)}
                className="gap-1.5"
              >
                <XCircle className="h-4 w-4" />
                Reject Drawing
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={pendingAction !== null}
                onClick={handleApproveEscalate}
                className="gap-1.5 border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30"
              >
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                {pendingAction === 'approve_escalate'
                  ? 'Escalating...'
                  : 'Approve & Escalate (AM)'}
              </Button>

              <Button
                type="button"
                disabled={pendingAction !== null}
                onClick={handleApproveDirect}
                className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CheckCircle2 className="h-4 w-4" />
                {pendingAction === 'approve_direct'
                  ? 'Approving...'
                  : 'Approve (Direct)'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
