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
import {
  submitResidentEngineerReview,
  submitAreaManagerReview,
} from '@/app/actions/reviews';
import { getDownloadUrl } from '@/app/actions/documents';
import { downloadFileFromUrl } from '@/lib/download';
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
  status?: string;
  file_name: string;
  file_size: number | null;
  projectName?: string;
  projectCode?: string;
  authorName?: string;
  createdAt: string;
  reviews?: ReviewItem[];
  escalationNote?: string | null;
  escalatedBy?: string | null;
}

const DISCIPLINE_COLORS = {
  mep: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  architect:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  structure:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  civil:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
} satisfies Record<string, string>;

export function DrawingReviewModal({
  document,
  userRole,
}: {
  document: ReviewDocument;
  userRole?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    'approve_direct' | 'approve_escalate' | 'reject' | 'approve_am' | null
  >(null);
  const [downloading, setDownloading] = useState(false);

  const isAM = userRole === 'area_manager';
  const isEscalated = document.status === 'escalated';
  const awaitingAM = isEscalated && !isAM;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await getDownloadUrl(document.id);
      if (!res.ok || !res.url) {
        toast.error(res.error || 'Failed to generate download URL.');
        return;
      }
      await downloadFileFromUrl(
        res.url,
        document.file_name || `${document.doc_number}.pdf`,
      );
      toast.success(`Downloaded ${document.file_name || document.doc_number}`);
    } catch {
      toast.error('Download failed.');
    } finally {
      setDownloading(false);
    }
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

  async function handleApproveAM() {
    setPendingAction('approve_am');
    const res = await submitAreaManagerReview({
      documentId: document.id,
      decision: 'approve',
    });
    setPendingAction(null);

    if (!res.success) {
      toast.error(res.error || 'Area Manager approval failed.');
      return;
    }

    toast.success(
      `${document.doc_number} approved by Area Manager: Ready for Authority Submission.`,
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
    const res = isAM || isEscalated
      ? await submitAreaManagerReview({
          documentId: document.id,
          decision: 'reject',
          comment: comment.trim(),
        })
      : await submitResidentEngineerReview({
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
      <DialogTrigger
        render={
          <Button
            size="sm"
            className="bg-[#02a9d3] hover:bg-[#0298be] text-white"
          >
            Review
          </Button>
        }
      />
      <DialogContent className="flex max-h-[90vh] w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl md:max-w-3xl">
        {/* Header */}
        <DialogHeader className="gap-1.5 border-b px-6 pb-4 pt-5 pr-14">
          <div className="flex items-center gap-2">
            <span className="rounded bg-muted px-2 py-0.5 font-mono text-[11px] font-bold text-muted-foreground">
              {document.revision}
            </span>
            {(document.status === 'escalated' || document.escalatedBy) && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3" />
                Escalated
              </span>
            )}
          </div>
          <DialogTitle className="font-mono text-xl font-bold tracking-tight text-foreground">
            Review {document.doc_number}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {document.title}
          </DialogDescription>
        </DialogHeader>

        {/* Body */}
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden px-6 py-5">
          {/* Metadata Card */}
          <div className="rounded-lg border bg-muted/20 p-4">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
              <MetaField label="Project">
                <span className="truncate font-mono text-sm font-semibold text-foreground">
                  {document.projectCode || 'Unassigned'}
                </span>
                {document.projectName && (
                  <span
                    className="truncate text-[11px] text-muted-foreground"
                    title={document.projectName}
                  >
                    {document.projectName}
                  </span>
                )}
              </MetaField>
              <MetaField label="Discipline">
                {document.discipline ? (
                  <Badge
                    variant="outline"
                    className={`w-fit text-[10px] font-bold uppercase ${DISCIPLINE_COLORS[document.discipline] || ''}`}
                  >
                    {document.discipline}
                  </Badge>
                ) : (
                  <span className="text-sm text-muted-foreground">-</span>
                )}
              </MetaField>
              <MetaField label="Author">
                <span
                  className="truncate text-sm font-medium text-foreground"
                  title={document.authorName}
                >
                  {document.authorName || 'Engineer'}
                </span>
              </MetaField>
              <MetaField label="Submission Date">
                <span className="text-sm text-foreground">
                  {new Date(document.createdAt).toLocaleDateString()}
                </span>
              </MetaField>
            </dl>
          </div>

          {/* Description */}
          {document.description && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description / Scope
              </p>
              <div className="rounded-lg border bg-muted/10 p-3 text-sm leading-relaxed text-foreground/90">
                {document.description}
              </div>
            </div>
          )}

          {/* Escalation rationale */}
          {(document.status === 'escalated' || document.escalatedBy) && (
            <div className="rounded-lg border border-amber-500/30 border-l-4 border-l-amber-500 bg-amber-500/10 px-3.5 py-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <span>
                  Escalated by Resident Engineer
                  {document.escalatedBy ? ` (${document.escalatedBy})` : ''}
                </span>
              </div>
              {document.escalationNote && (
                <p className="mt-1.5 pl-5.5 text-xs italic text-amber-800 dark:text-amber-300">
                  &quot;{document.escalationNote}&quot;
                </p>
              )}
            </div>
          )}

          {/* Drawing file */}
          <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-3.5 shadow-xs">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#02a9d3]/10 text-[#02a9d3]">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p
                  className="truncate text-sm font-semibold text-foreground"
                  title={document.file_name}
                >
                  {document.file_name}
                </p>
                <p className="font-mono text-xs text-muted-foreground">
                  {document.file_size
                    ? formatSize(document.file_size)
                    : 'PDF / Drawing'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownload}
              disabled={downloading}
              className="shrink-0 gap-1.5 font-medium hover:border-[#02a9d3]/40 hover:bg-[#02a9d3]/10 hover:text-[#02a9d3]"
            >
              <Download className="h-3.5 w-3.5" />
              {downloading ? 'Preparing…' : 'Download'}
            </Button>
          </div>

          {/* Prior review history */}
          {document.reviews && document.reviews.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                Prior Review History
              </div>
              <ol className="max-h-44 space-y-3 overflow-y-auto border-l pl-4">
                {document.reviews.map((rev) => {
                  const approved = rev.decision === 'approve';
                  return (
                    <li key={rev.id} className="relative space-y-1">
                      <span
                        className={`absolute -left-5.25 top-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-background ${
                          approved ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                      />
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-mono text-xs font-bold">
                          {rev.revision_label}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] capitalize ${
                            approved
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300'
                          }`}
                        >
                          {rev.decision} · {rev.level.toUpperCase()}
                        </Badge>
                        <span className="ml-auto text-[10px] text-muted-foreground">
                          {new Date(rev.created_at).toLocaleString()}
                        </span>
                      </div>
                      {rev.comment && (
                        <p className="text-xs italic text-muted-foreground">
                          &quot;{rev.comment}&quot;
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}
        </div>

        {/* Decision footer */}
        <div className="border-t bg-muted/30 px-6 py-4">
          <div className="mb-3 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Review Decision Panel
          </div>

          {awaitingAM ? (
            <p className="text-sm text-muted-foreground">
              Escalated drawing. Awaiting Area Manager decision.
            </p>
          ) : showRejectForm ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <Label
                  htmlFor="rejection-comment"
                  className="flex items-center gap-1.5 text-xs font-semibold text-red-700 dark:text-red-300"
                >
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Rejection comment (required - minimum 5 characters)
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
                autoFocus
                placeholder="State the specific technical non-compliance (e.g. inadequate pipe sizing per DEWA water regulations, rebar spacing violates ACI 318-19)…"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="resize-none bg-background text-sm"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <span
                  className={`text-xs ${
                    comment.trim().length < 5
                      ? 'text-muted-foreground'
                      : 'font-medium text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {comment.trim().length < 5
                    ? `${5 - comment.trim().length} more character(s) required`
                    : '✓ Comment valid'}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejectForm(false)}
                    className="text-xs"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={comment.trim().length < 5 || pendingAction !== null}
                    onClick={handleReject}
                    className="gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    {pendingAction === 'reject'
                      ? 'Rejecting…'
                      : 'Confirm Rejection'}
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                disabled={pendingAction !== null}
                onClick={() => setShowRejectForm(true)}
                className="shrink-0 gap-1.5 border-red-500/40 font-medium text-red-600 hover:bg-red-500/10 hover:text-red-600 dark:border-red-500/50 dark:text-red-400"
              >
                <XCircle className="h-4 w-4" />
                Reject Drawing
              </Button>

              <div className="flex flex-wrap items-center gap-2.5">
                {isAM ? (
                  <Button
                    type="button"
                    disabled={pendingAction !== null}
                    onClick={handleApproveAM}
                    className="shrink-0 gap-1.5 bg-emerald-600 font-medium text-white hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    {pendingAction === 'approve_am'
                      ? 'Approving…'
                      : 'Approve (Ready for Authority)'}
                  </Button>
                ) : (
                  <>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={pendingAction !== null}
                      onClick={handleApproveEscalate}
                      className="shrink-0 gap-1.5 border-amber-500/50 font-medium text-amber-700 hover:bg-amber-500/10 hover:text-amber-800 dark:border-amber-500/40 dark:text-amber-400"
                    >
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                      {pendingAction === 'approve_escalate'
                        ? 'Escalating…'
                        : 'Approve & Escalate (AM)'}
                    </Button>
                    <Button
                      type="button"
                      disabled={pendingAction !== null}
                      onClick={handleApproveDirect}
                      className="shrink-0 gap-1.5 bg-emerald-600 font-medium text-white hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {pendingAction === 'approve_direct'
                        ? 'Approving…'
                        : 'Approve (Direct)'}
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function MetaField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="flex min-w-0 flex-col">{children}</dd>
    </div>
  );
}
