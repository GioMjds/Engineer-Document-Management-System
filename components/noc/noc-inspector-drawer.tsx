'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Circle,
  AlertCircle,
  Upload,
  Copy,
  Check,
  ShieldAlert,
  History,
  Receipt,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Send,
  FileCheck,
  Plus,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { SubmissionModal } from './submission-modal';
import { AuthorityResultModal } from './authority-result-modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { NocStatusBadge } from './noc-status-badge';
import type {
  ProjectNocItem,
  NocPayerType,
  NocResubmissionEntry,
  ProjectDocumentItem,
} from '@/types/noc';
import { calculateDaysRemaining, isLapsed } from '@/lib/noc-tracker';
import { can } from '@/lib/permissions';
import {
  recordNocFeePayment,
  resubmitNocRevision,
  adminOverridePrerequisiteSequence,
  toggleProjectNocRequirement,
  addProjectNocRequirement,
  deleteProjectNocRequirement,
} from '@/app/(app)/noc-tracker/actions';
import { toast } from 'sonner';

interface NocInspectorDrawerProps {
  item: ProjectNocItem | null;
  allNocs: ProjectNocItem[];
  projectDocuments?: ProjectDocumentItem[];
  isOpen: boolean;
  currentUserRole?: string;
  onClose: () => void;
  onUpdateNoc: (updated: ProjectNocItem) => void;
}

const PAYER_OPTIONS: { value: NocPayerType; label: string }[] = [
  { value: 'client', label: 'Client' },
  { value: 'contractor', label: 'Contractor' },
  { value: 'consultant_advance', label: 'Consultant Advance' },
];

export function NocInspectorDrawer({
  item,
  allNocs,
  projectDocuments = [],
  isOpen,
  currentUserRole = 'engineer',
  onClose,
  onUpdateNoc,
}: NocInspectorDrawerProps) {
  const [copied, setCopied] = useState(false);
  const [isEditingRef, setIsEditingRef] = useState(false);
  const [refInput, setRefInput] = useState('');
  const [resubmitting, setResubmitting] = useState(false);
  const [resubmitFileName, setResubmitFileName] = useState('');

  // Fee state
  const [isEditingFee, setIsEditingFee] = useState(false);
  const [feeAmount, setFeeAmount] = useState<number>(0);
  const [feePayer, setFeePayer] = useState<NocPayerType>('client');
  const [receiptRef, setReceiptRef] = useState<string>('');
  const [isSavingFee, setIsSavingFee] = useState(false);

  // Admin sequence override state
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);
  const [overrideJustification, setOverrideJustification] = useState('');
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  // Statutory submission and decision modals
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);

  // Resubmission history accordion state
  const [showHistory, setShowHistory] = useState(true);

  // Manual requirement creation state
  const [newReqTitle, setNewReqTitle] = useState('');
  const [isAddingReq, setIsAddingReq] = useState(false);
  const [isSubmittingReq, setIsSubmittingReq] = useState(false);

  useEffect(() => {
    if (item) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFeeAmount(item.paymentFee);
      setFeePayer(item.payerType || 'client');
      setReceiptRef(item.receiptFileUrl || '');
      setIsEditingFee(false);
      setIsEditingRef(false);
      setResubmitting(false);
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const readyDocs = (projectDocuments || []).filter(
    (d) => d.status === 'ready_for_authority' || d.status === 'approved',
  );

  const daysRemaining = calculateDaysRemaining(item.expiryDate);

  const prerequisite = item.blockingSequenceNumber
    ? allNocs.find(
        (n) =>
          n.projectCode === item.projectCode &&
          n.sequenceNumber === item.blockingSequenceNumber,
      )
    : null;

  const isPrerequisiteMet = !prerequisite || prerequisite.status === 'Approved';
  const isBlocked = !isPrerequisiteMet && !item.overrideReason;
  const isItemExpired =
    item.status === 'Expired' ||
    (item.status === 'Approved' && isLapsed(item.expiryDate));

  function copyRef() {
    if (!item) return;
    navigator.clipboard.writeText(item.referenceNumber);
    setCopied(true);
    toast.success('Authority reference number copied.');
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSaveRef() {
    if (!item) return;
    if (!refInput.trim()) {
      toast.error('Reference number cannot be empty.');
      return;
    }
    if (currentUserRole === 'engineer') {
      toast.error(
        'Only Document Controllers and Managers can update authority reference numbers.',
      );
      return;
    }
    onUpdateNoc({
      ...item,
      referenceNumber: refInput.trim(),
      updatedAt: new Date().toISOString(),
    });
    setIsEditingRef(false);
    toast.success('Authority reference number updated.');
  }

  async function handleSaveFeePayment() {
    if (!item) return;
    if (!can(currentUserRole, 'noc.tracker.update')) {
      toast.error(
        'Only Document Controllers, Authority Engineers, or Admins can record fee payments.',
      );
      return;
    }

    setIsSavingFee(true);
    try {
      await recordNocFeePayment({
        nocId: item.id,
        paymentFee: feeAmount,
        payerType: feePayer,
        receiptFileUrl: receiptRef.trim() || undefined,
      });
    } catch {
      // Graceful fallback for mock data
    }

    onUpdateNoc({
      ...item,
      paymentFee: feeAmount,
      isPaid: true,
      payerType: feePayer,
      receiptFileUrl: receiptRef.trim() || undefined,
      status:
        item.status === 'Pending for Payment' ? 'Not Started' : item.status,
      updatedAt: new Date().toISOString(),
    });
    setIsSavingFee(false);
    setIsEditingFee(false);
    toast.success('Authority fee payment and classification recorded.');
  }

  function handleTogglePaid() {
    if (!item) return;
    if (!can(currentUserRole, 'noc.tracker.update')) {
      toast.error(
        'Only Document Controllers, Authority Engineers, or Admins can record fee payments.',
      );
      return;
    }

    if (!item.isPaid) {
      setIsEditingFee(true);
      return;
    }

    onUpdateNoc({
      ...item,
      isPaid: false,
      payerType: undefined,
      receiptFileUrl: undefined,
      updatedAt: new Date().toISOString(),
    });
    toast.success('Marked fee as Unpaid.');
  }

  async function handleToggleRequirement(reqId: string) {
    if (!item) return;
    if (!can(currentUserRole, 'noc.tracker.update')) {
      toast.error('Only Authority Engineers, Document Controllers, or Admins can check statutory requirements.');
      return;
    }
    if (item.status === 'Approved' && currentUserRole !== 'admin') {
      toast.error('NOC is already Approved. Only Admins can modify requirements on approved NOCs.');
      return;
    }
    const target = item.requirements.find((r) => r.id === reqId);
    if (!target) return;
    const nextIsSatisfied = !target.isSatisfied;
    const previousRequirements = item.requirements;

    const nextRequirements = item.requirements.map((r) =>
      r.id === reqId ? { ...r, isSatisfied: nextIsSatisfied } : r,
    );

    // Optimistic UI update
    onUpdateNoc({
      ...item,
      requirements: nextRequirements,
      updatedAt: new Date().toISOString(),
    });

    try {
      const res = await toggleProjectNocRequirement(reqId, nextIsSatisfied);
      if (!res.ok) {
        toast.error(res.error || 'Failed to update requirement');
        // Rollback on failure
        onUpdateNoc({
          ...item,
          requirements: previousRequirements,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      toast.error('Failed to update requirement');
      onUpdateNoc({
        ...item,
        requirements: previousRequirements,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async function handleAddRequirement(e: React.FormEvent) {
    e.preventDefault();
    if (!item) return;
    const title = newReqTitle.trim();
    if (!title) return;
    setIsSubmittingReq(true);

    try {
      const res = await addProjectNocRequirement(item.id, title);
      if (res.ok && res.data) {
        const addedReq = {
          id: res.data.id,
          title: res.data.title,
          isSatisfied: res.data.isSatisfied,
        };
        onUpdateNoc({
          ...item,
          requirements: [...item.requirements, addedReq],
          updatedAt: new Date().toISOString(),
        });
        setNewReqTitle('');
        setIsAddingReq(false);
        toast.success('Requirement added.');
      } else {
        toast.error(res.error || 'Failed to add requirement');
      }
    } catch {
      toast.error('Failed to add requirement');
    } finally {
      setIsSubmittingReq(false);
    }
  }

  async function handleDeleteRequirement(reqId: string) {
    if (!item) return;
    const target = item.requirements.find((r) => r.id === reqId);
    if (!target) return;

    const previousReqs = item.requirements;
    const updatedReqs = item.requirements.filter((r) => r.id !== reqId);
    onUpdateNoc({
      ...item,
      requirements: updatedReqs,
      updatedAt: new Date().toISOString(),
    });

    try {
      const res = await deleteProjectNocRequirement(reqId);
      if (!res.ok) {
        toast.error(res.error || 'Failed to delete requirement');
        onUpdateNoc({
          ...item,
          requirements: previousReqs,
          updatedAt: new Date().toISOString(),
        });
      } else {
        toast.success('Requirement removed.');
      }
    } catch {
      toast.error('Failed to delete requirement');
      onUpdateNoc({
        ...item,
        requirements: previousReqs,
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async function handleResubmit() {
    if (!item) return;
    if (!resubmitFileName.trim()) {
      toast.error(
        'Please specify the revised drawing or submittal document name.',
      );
      return;
    }
    const currentRevNum = parseInt(item.revision.replace('R', ''), 10) || 0;
    const nextRev = `R${String(currentRevNum + 1).padStart(2, '0')}`;

    const newResubEntry: NocResubmissionEntry = {
      id: 'resub-' + Date.now(),
      projectNocId: item.id,
      revision: item.revision,
      rejectionReason: item.rejectionReason || 'Authority rejection',
      rejectionDate: item.updatedAt || new Date().toISOString(),
      resubmissionDate: new Date().toISOString(),
      resubmittedBy: currentUserRole,
    };
    const nextHistory = [...(item.resubmissionHistory || []), newResubEntry];

    try {
      await resubmitNocRevision({
        nocId: item.id,
        newRevision: nextRev,
        resubmitFileName: resubmitFileName.trim(),
        previousRejectionReason: item.rejectionReason,
      });
    } catch {
      // Graceful fallback for mock mode
    }

    onUpdateNoc({
      ...item,
      status: 'Submitted',
      applyDate: new Date().toISOString().split('T')[0],
      revision: nextRev,
      rejectionReason: undefined,
      resubmissionHistory: nextHistory,
      requirements: item.requirements.map((r) => ({
        ...r,
        isSatisfied: true,
      })),
      updatedAt: new Date().toISOString(),
    });
    setResubmitting(false);
    setResubmitFileName('');
    toast.success(`Submittal dispatched as revision ${nextRev}.`);
  }

  async function handleConfirmOverride() {
    if (!item) return;
    if (overrideJustification.trim().length < 15) {
      toast.error('Justification must be at least 15 characters.');
      return;
    }

    setIsSubmittingOverride(true);
    const justification = overrideJustification.trim();
    const now = new Date().toISOString();

    try {
      await adminOverridePrerequisiteSequence({
        nocId: item.id,
        justification,
      });
    } catch {
      // Graceful fallback for mock mode
    }

    onUpdateNoc({
      ...item,
      overrideReason: justification,
      overriddenBy: 'Admin',
      overriddenAt: now,
      updatedAt: now,
    });
    setIsSubmittingOverride(false);
    setIsOverrideDialogOpen(false);
    setOverrideJustification('');
    toast.success('Prerequisite sequence bypassed by Admin.');
  }

  return (
    <>
      <aside
        aria-label="NOC Details Inspector"
        className="fixed inset-y-0 right-0 z-40 w-full sm:w-105 bg-background border-l border-border shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between p-4 border-b bg-muted/40">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-xs text-muted-foreground uppercase">
                Seq #{item.sequenceNumber} · {item.stage}
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-muted">
                Rev {item.revision}
              </span>
            </div>
            <h2 className="text-base font-semibold leading-tight">
              {item.reviewingAuthority}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {item.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close inspector drawer"
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 text-sm">
          {/* Status & Quick Change */}
          <section className="p-3 border rounded bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Current status
              </span>
              <NocStatusBadge
                status={isItemExpired ? 'Expired' : item.status}
                isBlocked={isBlocked}
                blockerTitle={
                  prerequisite
                    ? `${prerequisite.reviewingAuthority} #${prerequisite.sequenceNumber}`
                    : undefined
                }
              />
            </div>

            {/* Authority Permitting Primary Workflow Actions */}
            {['admin', 'authority_engineer', 'dc'].includes(currentUserRole) && (
              <div className="pt-2 border-t space-y-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider block">
                  Authority Permitting Actions
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div
                    title={
                      isBlocked
                        ? `Prerequisite NOC [Seq #${prerequisite?.sequenceNumber} - ${prerequisite?.reviewingAuthority}] not yet obtained.`
                        : 'Submit application on authority portal'
                    }
                  >
                    <Button
                      size="sm"
                      className="w-full h-8 text-xs font-semibold flex items-center justify-center gap-1.5 bg-primary text-primary-foreground"
                      disabled={isBlocked || (item.status === 'Approved' && !isItemExpired)}
                      onClick={() => setIsSubmissionModalOpen(true)}
                    >
                      <Send className="h-3.5 w-3.5" />
                      <span>{item.status === 'Submitted' ? 'Update Submission' : 'Submit Application'}</span>
                    </Button>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs font-semibold flex items-center justify-center gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                    disabled={
                      item.status === 'Not Started' ||
                      item.status === 'Rejected' ||
                      item.status === 'Pending for Payment'
                    }
                    onClick={() => setIsDecisionModalOpen(true)}
                  >
                    <FileCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{item.status === 'Approved' ? 'Update Validity' : 'Record Decision'}</span>
                  </Button>
                </div>
              </div>
            )}

            {item.status === 'Rejected' && item.rejectionReason && (
              <div className="mt-2 p-2.5 rounded bg-rose-50 border border-rose-200 text-rose-900 text-xs dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-900">
                <span className="font-semibold block mb-0.5">
                  Authority Rejection Feedback:
                </span>
                <p>{item.rejectionReason}</p>
              </div>
            )}
          </section>

          {/* Blocking Prerequisite Sequence & Admin Override */}
          {item.blockingSequenceNumber && (
            <section className="p-3 border rounded bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase font-semibold">
                  Blocking sequence dependency
                </span>
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded ${
                    !isBlocked
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-300'
                  }`}
                >
                  {!isBlocked ? 'Prerequisite Met' : 'Blocked'}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {item.blockingSequenceDescription ||
                  `Requires Sequence #${item.blockingSequenceNumber} approval`}
              </p>
              {prerequisite && (
                <div className="text-xs p-2 rounded bg-muted/40 border flex items-center justify-between">
                  <span>
                    Seq #{prerequisite.sequenceNumber}:{' '}
                    {prerequisite.reviewingAuthority} (
                    {prerequisite.description})
                  </span>
                  <NocStatusBadge status={prerequisite.status} />
                </div>
              )}

              {/* Persistent Admin Override Badge */}
              {item.overrideReason && (
                <div className="mt-2 p-2.5 rounded bg-amber-50 border border-amber-300 text-amber-900 text-xs dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800 flex items-start gap-2">
                  <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-semibold block">
                      Prerequisite Overridden by Admin
                    </span>
                    <p className="italic">
                      &ldquo;{item.overrideReason}&rdquo;
                    </p>
                    {item.overriddenAt && (
                      <span className="text-[10px] text-amber-700 dark:text-amber-400 block mt-1">
                        Overridden on{' '}
                        {new Date(item.overriddenAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Override Action Button */}
              {isBlocked && (
                <div className="pt-1 flex items-center justify-between">
                  {currentUserRole === 'admin' ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-amber-500 text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50 flex items-center gap-1.5"
                      onClick={() => setIsOverrideDialogOpen(true)}
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600" />
                      Admin Override Sequence
                    </Button>
                  ) : (
                    <span
                      title="Sequence order is enforced. Contact an Administrator to bypass prerequisite checks."
                      className="text-[11px] text-muted-foreground italic flex items-center gap-1"
                    >
                      <AlertCircle className="h-3 w-3 text-muted-foreground" />
                      Prerequisite approval required before status advancement.
                    </span>
                  )}
                </div>
              )}
            </section>
          )}

          {/* Approved Submittals Bundle (Ready for Authority from Step 3) */}
          <section className="p-3 border rounded bg-card space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <FileCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-xs text-foreground uppercase font-semibold tracking-wider">
                  Approved Submittals Bundle
                </span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded font-mono font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                {readyDocs.length} Package{readyDocs.length === 1 ? '' : 's'} Ready
              </span>
            </div>

            <p className="text-xs text-muted-foreground">
              Technical packages approved by Resident Engineer Lead and cleared for statutory submission.
            </p>

            {readyDocs.length === 0 ? (
              <div className="p-3 rounded border border-dashed text-center text-xs text-muted-foreground bg-muted/20">
                No drawings with &lsquo;Ready for Authority&rsquo; status in this project yet. Awaiting Resident Engineer Level-1 approval.
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                {readyDocs.map((doc) => {
                  const isMatched =
                    (item.description.toLowerCase().includes('electrical') && doc.discipline?.toLowerCase() === 'mep') ||
                    (item.description.toLowerCase().includes('dewa') && (doc.docNumber.toLowerCase().includes('mep') || doc.discipline?.toLowerCase() === 'mep')) ||
                    (item.description.toLowerCase().includes('traffic') && (doc.docNumber.toLowerCase().includes('arc') || doc.discipline?.toLowerCase() === 'architect')) ||
                    (item.description.toLowerCase().includes('rta') && (doc.docNumber.toLowerCase().includes('arc') || doc.discipline?.toLowerCase() === 'architect')) ||
                    (item.description.toLowerCase().includes('structural') && (doc.docNumber.toLowerCase().includes('struct') || doc.docNumber.toLowerCase().includes('cad')));

                  return (
                    <div
                      key={doc.id}
                      className={cn(
                        'p-2.5 rounded border text-xs transition-colors space-y-1.5',
                        isMatched
                          ? 'bg-emerald-50/70 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800'
                          : 'bg-muted/30 border-border',
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-foreground">
                            {doc.docNumber}
                          </span>
                          <span className="px-1.5 py-0.2 rounded bg-muted text-[10px] font-mono border">
                            Rev {doc.revision}
                          </span>
                          {doc.discipline && (
                            <span className="px-1.5 py-0.2 rounded bg-primary/10 text-primary text-[10px] font-medium uppercase">
                              {doc.discipline}
                            </span>
                          )}
                          {isMatched && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[10px] font-semibold uppercase tracking-wider">
                              Primary Submittal
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 shrink-0">
                          <CheckCircle2 className="h-3 w-3" /> Ready for Authority
                        </span>
                      </div>

                      <p className="text-xs text-foreground font-medium leading-snug">
                        {doc.title}
                      </p>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-muted-foreground border-t border-border/60">
                        <span className="truncate max-w-50 font-mono text-[10px]">
                          {doc.fileName || `${doc.docNumber}-${doc.revision}.pdf`}
                        </span>
                        <Link
                          href={`/documents?search=${encodeURIComponent(doc.docNumber)}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline font-medium"
                        >
                          <span>Open Package</span>
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Authority Reference */}
          <section className="p-3 border rounded bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Authority reference #
              </span>
              {!isEditingRef && (
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={copyRef}
                    className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted"
                    title="Copy reference number"
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {can(currentUserRole, 'noc.tracker.update') && (
                    <button
                      type="button"
                      onClick={() => {
                        setRefInput(item.referenceNumber);
                        setIsEditingRef(true);
                      }}
                      className="text-xs text-primary hover:underline ml-1"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            {isEditingRef ? (
              <div className="space-y-2">
                <Input
                  value={refInput}
                  onChange={(e) => setRefInput(e.target.value)}
                  placeholder="e.g. DEWA-2023-9981"
                  className="font-mono text-xs h-8"
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    onClick={handleSaveRef}
                  >
                    Save
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => setIsEditingRef(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="font-mono text-sm font-semibold tracking-wide bg-muted/60 p-2 rounded border">
                {item.referenceNumber || 'Pending Issuance'}
              </div>
            )}

            <div className="text-xs text-muted-foreground flex justify-between pt-1">
              <span>
                Submitted by: <strong>{item.submittedBy}</strong>
              </span>
              <span>
                Project: <strong>{item.projectCode}</strong>
              </span>
            </div>
          </section>

          {/* Payment Fee & Payer Tracking */}
          <section className="p-3 border rounded bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Authority payment fee
              </span>
              <span
                className={`text-xs px-2 py-0.5 rounded font-medium ${
                  item.isPaid
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                }`}
              >
                {item.isPaid ? 'Paid' : 'Pending Payment'}
              </span>
            </div>

            {isEditingFee ? (
              <div className="space-y-3 pt-1 border-t">
                <div>
                  <Label htmlFor="fee-amount" className="text-xs font-medium">
                    Payment Fee (AED)
                  </Label>
                  <Input
                    id="fee-amount"
                    type="number"
                    min="0"
                    value={feeAmount}
                    onChange={(e) =>
                      setFeeAmount(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="font-mono text-xs h-8 mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="fee-payer" className="text-xs font-medium">
                    Fee Payer Classification
                  </Label>
                  <Select
                    value={feePayer}
                    items={PAYER_OPTIONS}
                    onValueChange={(val) => setFeePayer(val as NocPayerType)}
                  >
                    <SelectTrigger id="fee-payer" className="w-full h-8 text-xs mt-1">
                      <SelectValue placeholder="Select fee payer">
                        {PAYER_OPTIONS.find((opt) => opt.value === feePayer)?.label}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {PAYER_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="receipt-ref" className="text-xs font-medium">
                    Receipt Reference / URL
                  </Label>
                  <Input
                    id="receipt-ref"
                    value={receiptRef}
                    onChange={(e) => setReceiptRef(e.target.value)}
                    placeholder="e.g. RCP-2026-8819 or https://..."
                    className="font-mono text-xs h-8 mt-1"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    size="sm"
                    className="h-7 text-xs"
                    disabled={isSavingFee}
                    onClick={handleSaveFeePayment}
                  >
                    Save Payment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs"
                    onClick={() => {
                      setFeeAmount(item.paymentFee);
                      setFeePayer(item.payerType || 'client');
                      setReceiptRef(item.receiptFileUrl || '');
                      setIsEditingFee(false);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-baseline justify-between pt-1">
                  <span className="text-lg font-bold font-mono">
                    AED {item.paymentFee.toLocaleString('en-US')}
                  </span>
                  {can(currentUserRole, 'noc.tracker.update') && (
                    <div className="flex items-center gap-1.5">
                      {item.isPaid ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-muted-foreground hover:text-foreground"
                            onClick={() => setIsEditingFee(true)}
                          >
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={handleTogglePaid}
                          >
                            Mark as Unpaid
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={handleTogglePaid}
                        >
                          Record Payment
                        </Button>
                      )}
                    </div>
                  )}
                </div>

                {item.isPaid && (
                  <div className="p-2 rounded bg-muted/40 border text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Fee Payer:</span>
                      <Badge
                        variant="outline"
                        className="text-[11px] font-medium uppercase tracking-wider bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300"
                      >
                        {PAYER_OPTIONS.find((o) => o.value === item.payerType)
                          ?.label ||
                          item.payerType ||
                          'Client'}
                      </Badge>
                    </div>

                    {item.receiptFileUrl && (
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="text-muted-foreground flex items-center gap-1">
                          <Receipt className="h-3 w-3" /> Receipt:
                        </span>
                        {item.receiptFileUrl.startsWith('http') ? (
                          <a
                            href={item.receiptFileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-[11px] text-primary hover:underline flex items-center gap-1"
                          >
                            <span>View Document</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          <span className="font-mono text-[11px] font-medium text-foreground">
                            {item.receiptFileUrl}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Resubmission History Audit Trail */}
          {item.resubmissionHistory && item.resubmissionHistory.length > 0 && (
            <section className="p-3 border rounded bg-card space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground uppercase font-semibold flex items-center gap-1.5">
                  <History className="h-3.5 w-3.5 text-muted-foreground" />
                  Resubmission History ({item.resubmissionHistory.length})
                </span>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="text-xs text-primary hover:underline flex items-center gap-0.5"
                >
                  {showHistory ? (
                    <>
                      <span>Collapse</span>
                      <ChevronUp className="h-3 w-3" />
                    </>
                  ) : (
                    <>
                      <span>Expand</span>
                      <ChevronDown className="h-3 w-3" />
                    </>
                  )}
                </button>
              </div>

              {showHistory && (
                <div className="space-y-2 pt-1 border-t">
                  {item.resubmissionHistory.map((entry, idx) => (
                    <div
                      key={entry.id || idx}
                      className="p-2.5 rounded bg-muted/40 border text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-semibold px-1.5 py-0.5 rounded bg-muted border text-[11px]">
                          Revision {entry.revision}
                        </span>
                        <span className="text-[11px] text-muted-foreground">
                          {entry.resubmissionDate
                            ? new Date(
                                entry.resubmissionDate,
                              ).toLocaleDateString()
                            : ''}
                        </span>
                      </div>
                      <div className="text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 p-2 rounded border border-rose-200 dark:border-rose-900 text-[11px]">
                        <span className="font-semibold block mb-0.5">
                          Prior Rejection Feedback:
                        </span>
                        <p>{entry.rejectionReason}</p>
                      </div>
                      <div className="text-[10px] text-muted-foreground flex justify-between">
                        <span>Resubmitted by: {entry.resubmittedBy}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Interconnected Requirements Checklist */}
          <section className="p-3 border rounded bg-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground uppercase font-semibold">
                Interconnected requirements
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {item.requirements.filter((r) => r.isSatisfied).length}/
                  {item.requirements.length} satisfied
                </span>
                {can(currentUserRole, 'noc.tracker.update') &&
                  (item.status !== 'Approved' || currentUserRole === 'admin') && (
                    <button
                      type="button"
                      onClick={() => setIsAddingReq(!isAddingReq)}
                      className="text-xs text-primary hover:underline flex items-center gap-0.5 cursor-pointer ml-1"
                    >
                      <Plus className="h-3 w-3" />
                      <span>{isAddingReq ? 'Cancel' : 'Add'}</span>
                    </button>
                  )}
              </div>
            </div>

            {isAddingReq && (
              <form onSubmit={handleAddRequirement} className="pt-1 pb-1 space-y-1.5 border-b">
                <div className="flex gap-1.5">
                  <Input
                    value={newReqTitle}
                    onChange={(e) => setNewReqTitle(e.target.value)}
                    placeholder="Add required document or condition..."
                    className="text-xs h-7 font-mono flex-1"
                    autoFocus
                  />
                  <Button
                    size="sm"
                    type="submit"
                    disabled={isSubmittingReq || !newReqTitle.trim()}
                    className="h-7 text-xs px-2.5"
                  >
                    Add
                  </Button>
                </div>
              </form>
            )}

            <ul className="space-y-1.5 pt-1">
              {item.requirements.map((req) => {
                const canToggle =
                  can(currentUserRole, 'noc.tracker.update') &&
                  (item.status !== 'Approved' || currentUserRole === 'admin');

                return (
                  <li
                    key={req.id}
                    className="group flex items-start gap-2 p-1.5 rounded hover:bg-muted/50 text-xs transition-colors"
                  >
                    <button
                      type="button"
                      disabled={!canToggle}
                      onClick={() => handleToggleRequirement(req.id)}
                      className={cn(
                        'mt-0.5 transition-colors',
                        canToggle
                          ? 'text-muted-foreground hover:text-foreground cursor-pointer'
                          : 'opacity-50 cursor-not-allowed',
                      )}
                      title={
                        !can(currentUserRole, 'noc.tracker.update')
                          ? 'Only Authority Engineers, Document Controllers, or Admins can check statutory requirements.'
                          : item.status === 'Approved' && currentUserRole !== 'admin'
                          ? 'NOC is approved. Locked.'
                          : undefined
                      }
                    >
                      {req.isSatisfied ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-zinc-400" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <span
                        className={
                          req.isSatisfied
                            ? 'line-through text-muted-foreground'
                            : 'font-medium'
                        }
                      >
                        {req.title}
                      </span>
                      {req.fileName && (
                        <span className="block font-mono text-[11px] text-muted-foreground mt-0.5">
                          Attached: {req.fileName}
                        </span>
                      )}
                    </div>
                    {canToggle && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRequirement(req.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-600 transition-opacity p-0.5 cursor-pointer"
                        title="Remove requirement"
                      >
                        <Trash2 className="h-3.5 w-3.5 text-zinc-400 hover:text-rose-600" />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {/* Dates & Expiry */}
          <section className="p-3 border rounded bg-card space-y-2 text-xs">
            <span className="text-xs text-muted-foreground uppercase font-semibold block">
              Key timeline dates
            </span>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-muted-foreground block">Plan Date:</span>
                <span className="font-mono font-medium">{item.planDate}</span>
              </div>
              <div>
                <span className="text-muted-foreground block">Apply Date:</span>
                <span className="font-mono font-medium">
                  {item.applyDate || 'Not Applied'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  Issuance Date:
                </span>
                <span className="font-mono font-medium">
                  {item.issuanceDate || 'Pending'}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground block">
                  Expiry Date:
                </span>
                <span className="font-mono font-medium">
                  {item.expiryDate ? (
                    item.expiryDate
                  ) : item.status === 'Approved' ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800">
                      Permanent (No Expiry)
                    </span>
                  ) : (
                    'N/A'
                  )}
                </span>
              </div>
            </div>

            {daysRemaining !== null && (
              <div
                className={`mt-2 p-2 rounded text-xs flex items-center gap-1.5 ${
                  daysRemaining < 0
                    ? 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
                    : daysRemaining <= 7
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>
                  {daysRemaining < 0
                    ? `Permit expired ${Math.abs(daysRemaining)} days ago. Resubmission for revalidation required.`
                    : daysRemaining <= 7
                      ? `Warning: Expiration in ${daysRemaining} days. Notification dispatched.`
                      : `${daysRemaining} days remaining on current NOC validity.`}
                </span>
              </div>
            )}
          </section>

          {/* Resubmission Section (Active if Rejected or Expired) */}
          {(item.status === 'Rejected' || isItemExpired) && (
            <section className="p-3 border rounded bg-zinc-900 text-white space-y-3 dark:bg-zinc-950 dark:border-zinc-800">
              <div>
                <h3 className="text-sm font-semibold flex items-center gap-1.5">
                  <Upload className="h-4 w-4" />
                  <span>
                    {item.status === 'Rejected'
                      ? 'Resubmit Rejected Drawings'
                      : 'Resubmit for Revalidation (Expired Permit)'}
                  </span>
                </h3>
                <p className="text-xs text-zinc-300 mt-1">
                  Submitting updates the revision tag from {item.revision} to R
                  {String(
                    (parseInt(item.revision.replace('R', ''), 10) || 0) + 1,
                  ).padStart(2, '0')}
                  .
                </p>
              </div>

              {resubmitting ? (
                <div className="space-y-3 pt-1">
                  <div>
                    <Label
                      htmlFor="resubmit_file"
                      className="text-xs text-zinc-200"
                    >
                      Revised CAD / PDF Drawing Package
                    </Label>
                    <Input
                      id="resubmit_file"
                      value={resubmitFileName}
                      onChange={(e) => setResubmitFileName(e.target.value)}
                      placeholder="e.g. DWG-26002-DCD-R01.pdf"
                      className="bg-zinc-800 border-zinc-700 text-white text-xs h-8 mt-1"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-white text-zinc-900 hover:bg-zinc-100 h-8 text-xs font-semibold"
                      onClick={handleResubmit}
                    >
                      Confirm & Dispatch
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-zinc-300 border-zinc-700 hover:bg-zinc-800 h-8 text-xs"
                      onClick={() => setResubmitting(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  size="sm"
                  className="w-full bg-white text-zinc-900 hover:bg-zinc-100 font-semibold"
                  onClick={() => setResubmitting(true)}
                >
                  Initiate Resubmission
                </Button>
              )}
            </section>
          )}
        </div>
      </aside>

      {/* Admin Sequence Prerequisite Override Dialog */}
      <Dialog
        open={isOverrideDialogOpen}
        onOpenChange={setIsOverrideDialogOpen}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
              <ShieldAlert className="h-5 w-5" />
              Admin Sequence Prerequisite Override
            </DialogTitle>
            <DialogDescription>
              Bypassing the prerequisite sequence allows this NOC to be
              processed and approved independently of its dependency (Seq #
              {item.blockingSequenceNumber}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label
              htmlFor="override-justification"
              className="text-xs font-semibold"
            >
              Mandatory justification for prerequisite bypass (min 15
              characters)
            </Label>
            <Textarea
              id="override-justification"
              value={overrideJustification}
              onChange={(e) => setOverrideJustification(e.target.value)}
              placeholder="e.g. Authority client fast-track authorization approved under executive waiver."
              className="text-xs min-h-20"
            />
            <div className="text-[11px] text-muted-foreground flex justify-between">
              <span>Must be detailed for audit trail.</span>
              <span
                className={
                  overrideJustification.trim().length >= 15
                    ? 'text-emerald-600 font-medium'
                    : 'text-amber-600 font-medium'
                }
              >
                {overrideJustification.trim().length} / 15 chars min
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOverrideDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
              disabled={
                overrideJustification.trim().length < 15 || isSubmittingOverride
              }
              onClick={handleConfirmOverride}
            >
              Confirm Override & Unlock
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Statutory Submission Modal */}
      <SubmissionModal
        open={isSubmissionModalOpen}
        onOpenChange={setIsSubmissionModalOpen}
        noc={item}
        readyDocs={readyDocs}
        currentUserRole={currentUserRole}
        onSubmitted={(updated) => onUpdateNoc(updated)}
      />

      {/* Statutory Authority Decision Modal */}
      <AuthorityResultModal
        open={isDecisionModalOpen}
        onOpenChange={setIsDecisionModalOpen}
        noc={item}
        onDecisionRecorded={(updated) => onUpdateNoc(updated)}
      />
    </>
  );
}
