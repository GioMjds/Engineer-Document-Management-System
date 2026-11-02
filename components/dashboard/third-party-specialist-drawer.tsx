'use client';

import { useState, useRef } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ThirdPartySpecialistRecord, ThirdPartySpecialistType } from '@/types/noc';
import {
  canUserReviewSpecialist,
  canUserUploadSpecialist,
} from '@/lib/project-status';
import {
  FileText,
  Upload,
  CheckCircle2,
  XCircle,
  Download,
  Paperclip,
  AlertCircle,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { downloadFileFromUrl, downloadBlob } from '@/lib/download';
import { getSpecialistDownloadUrlAction } from '@/app/actions/specialists';

interface ThirdPartySpecialistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectCode: string;
  projectName: string;
  specialists: ThirdPartySpecialistRecord[];
  userRole?: string;
  onUploadSpecialistFile: (
    type: ThirdPartySpecialistType,
    fileName: string,
    fileSize: string,
    revision?: string,
    file?: File,
  ) => void | Promise<void>;
  onApproveSpecialistFile: (type: ThirdPartySpecialistType, remarks?: string) => void;
  onRejectSpecialistFile?: (type: ThirdPartySpecialistType, remarks: string) => void;
  onRemoveSpecialistFile?: (type: ThirdPartySpecialistType) => void;
}

const ALL_SPECIALIST_TYPES = [
  'Vertical Transportation',
  'Traffic Impact Study',
  'Green Building',
  'Topographical',
  'Geotechnical',
] satisfies ThirdPartySpecialistType[];

export function ThirdPartySpecialistDrawer({
  isOpen,
  onClose,
  projectCode,
  projectName,
  specialists,
  userRole,
  onUploadSpecialistFile,
  onApproveSpecialistFile,
  onRejectSpecialistFile,
  onRemoveSpecialistFile,
}: ThirdPartySpecialistDrawerProps) {
  const isReadOnly = userRole === 'ceo';
  const isReviewer = canUserReviewSpecialist(userRole);
  const isUploader = canUserUploadSpecialist(userRole);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<ThirdPartySpecialistType | null>(null);
  const [rejectingType, setRejectingType] = useState<ThirdPartySpecialistType | null>(null);
  const [rejectionRemarks, setRejectionRemarks] = useState('');
  const [uploadingType, setUploadingType] = useState<ThirdPartySpecialistType | null>(null);
  const [downloadingType, setDownloadingType] = useState<ThirdPartySpecialistType | null>(null);

  const getRecord = (type: ThirdPartySpecialistType): ThirdPartySpecialistRecord => {
    return (
      specialists.find((s) => s.type === type) || {
        id: `spec-${type}`,
        type,
        status: 'Pending',
      }
    );
  };

  const computeNextRevision = (currentRevision?: string): string => {
    if (!currentRevision) return 'R00';
    const num = parseInt(currentRevision.replace(/\D/g, '') || '0', 10);
    return `R${String(num + 1).padStart(2, '0')}`;
  };

  const handleTriggerCustomUpload = (type: ThirdPartySpecialistType) => {
    setActiveUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (activeUploadType && file) {
      const type = activeUploadType;
      const prev = getRecord(type);
      const rev = computeNextRevision(prev.revision);
      const sizeFormatted =
        file.size >= 1024 * 1024
          ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;
      setUploadingType(type);
      try {
        await onUploadSpecialistFile(type, file.name, sizeFormatted, rev, file);
        setRejectingType(null);
        setRejectionRemarks('');
        toast.success(`Attached ${file.name} (${rev}) for ${type}.`);
      } catch {
        toast.error(`Failed to attach ${file.name}`);
      } finally {
        setUploadingType(null);
      }
    }
    setActiveUploadType(null);
  };

  const handleApprove = (type: ThirdPartySpecialistType) => {
    onApproveSpecialistFile(type);
    setRejectingType(null);
    setRejectionRemarks('');
    toast.success(`Approved ${type} technical study.`);
  };

  const handleConfirmReject = (type: ThirdPartySpecialistType) => {
    const trimmed = rejectionRemarks.trim();
    if (!trimmed) {
      toast.error('Rejection remarks are required.');
      return;
    }
    if (onRejectSpecialistFile) {
      onRejectSpecialistFile(type, trimmed);
    }
    toast.warning(`Rejected ${type}: Requires revision.`);
    setRejectingType(null);
    setRejectionRemarks('');
  };

  const handleDownloadFile = async (record: ThirdPartySpecialistRecord) => {
    if (!record.fileName) return;

    setDownloadingType(record.type);
    try {
      if (record.filePath) {
        const res = await getSpecialistDownloadUrlAction(projectCode, record.type);
        if (res.success && res.url) {
          await downloadFileFromUrl(res.url, record.fileName);
          toast.success(`Downloaded ${record.fileName}`);
          return;
        }
      }

      if (record.fileUrl) {
        await downloadFileFromUrl(record.fileUrl, record.fileName);
        toast.success(`Downloaded ${record.fileName}`);
        return;
      }

      const reportContent = [
        `================================================================`,
        `CVTEC CONSULTING ENGINEERS - TECHNICAL SUBMITTAL TRANSMITTAL`,
        `================================================================`,
        `Project Code:     ${projectCode}`,
        `Project Name:     ${projectName}`,
        `Specialist Scope: ${record.type}`,
        `Document Name:    ${record.fileName}`,
        `Revision:         ${record.revision || 'R00'}`,
        `Current Status:   ${record.status}`,
        `Uploaded By:      ${record.uploadedBy || 'Discipline Engineer'}`,
        `Uploaded At:      ${record.uploadedAt || new Date().toISOString()}`,
        record.reviewedBy ? `Reviewed By:      ${record.reviewedBy}` : '',
        record.reviewedAt ? `Reviewed At:      ${record.reviewedAt}` : '',
        record.remarks ? `Remarks/Notes:    ${record.remarks}` : '',
        `================================================================`,
        `This transmittal confirms receipt and compliance verification`,
        `under Dubai Authority & Technical Statutory Regulations.`,
        `================================================================`,
      ]
        .filter(Boolean)
        .join('\n');

      const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' });
      const downloadName = record.fileName.endsWith('.txt')
        ? record.fileName
        : `${record.fileName.replace(/\.[^/.]+$/, '')}-transmittal.txt`;
      downloadBlob(blob, downloadName);
      toast.success(`Downloaded transmittal for ${record.fileName}`);
    } catch {
      toast.error(`Failed to download ${record.fileName}`);
    } finally {
      setDownloadingType(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.dwg,.doc,.docx,.xls,.xlsx"
          onChange={handleFileChange}
        />
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Paperclip className="h-5 w-5 text-slate-500" />
            <DialogTitle>Third-Party Specialists & Technical Studies</DialogTitle>
          </div>
          <DialogDescription>
            {projectCode} — {projectName}. Transmit technical reports, download submittals, conduct multi-role reviews, and track revisions.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3.5 py-2">
          {ALL_SPECIALIST_TYPES.map((type) => {
            const record = getRecord(type);
            const isApproved = record.status === 'Approved';
            const isUploaded = record.status === 'Uploaded';
            const isRejected = record.status === 'Rejected';
            const isPending = record.status === 'Pending' || !record.fileName;
            const isCurrentlyRejecting = rejectingType === type;

            return (
              <div
                key={type}
                className="rounded-lg border border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-900 space-y-3 shadow-2xs"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        {type}
                      </span>
                      {record.revision && (
                        <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                          {record.revision}
                        </Badge>
                      )}
                      {isApproved && (
                        <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300">
                          Approved Study
                        </Badge>
                      )}
                      {isUploaded && (
                        <Badge className="bg-sky-100 text-sky-800 border-sky-300 dark:bg-sky-950/60 dark:text-sky-300">
                          Uploaded / Under Review
                        </Badge>
                      )}
                      {isRejected && (
                        <Badge className="bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300">
                          Rejected (Revise & Resubmit)
                        </Badge>
                      )}
                      {isPending && (
                        <Badge variant="outline" className="text-slate-500 border-dashed">
                          Pending Submission
                        </Badge>
                      )}
                    </div>

                    {record.fileName ? (
                      <div className="flex items-center gap-2.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate max-w-xs">
                          <FileText className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          {record.fileName}
                        </span>
                        {record.fileSize && <span>({record.fileSize})</span>}
                        {record.uploadedBy && <span>• Uploaded by {record.uploadedBy}</span>}
                        {record.uploadedAt && (
                          <span className="text-[11px] text-slate-400">
                            • {new Date(record.uploadedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">
                        No technical report uploaded yet for this specialist scope.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    {record.fileName && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs text-slate-700 hover:text-slate-900 dark:text-slate-300"
                        title={`Download ${record.fileName}`}
                        disabled={downloadingType === type}
                        onClick={() => handleDownloadFile(record)}
                      >
                        <Download className="h-3.5 w-3.5" />
                        {downloadingType === type ? 'Downloading…' : 'Download'}
                      </Button>
                    )}

                    {!isReadOnly && isReviewer && (isUploaded || isRejected) && (
                      <Button
                        size="sm"
                        className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={() => handleApprove(type)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </Button>
                    )}

                    {!isReadOnly && isReviewer && (isUploaded || isApproved) && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs border-rose-300 text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300"
                        onClick={() => {
                          setRejectingType(type);
                          setRejectionRemarks(record.remarks || '');
                        }}
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        Reject
                      </Button>
                    )}

                    {!isReadOnly && isUploader && isPending && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1.5 text-xs"
                        disabled={uploadingType === type}
                        onClick={() => handleTriggerCustomUpload(type)}
                      >
                        <Upload className="h-3.5 w-3.5" />
                        {uploadingType === type ? 'Attaching…' : 'Attach Report'}
                      </Button>
                    )}

                    {!isReadOnly && isUploader && isUploaded && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          disabled={uploadingType === type}
                          onClick={() => handleTriggerCustomUpload(type)}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {uploadingType === type ? 'Replacing…' : 'Replace'}
                        </Button>
                        {onRemoveSpecialistFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title={`Remove file submission for ${type}`}
                            onClick={() => {
                              onRemoveSpecialistFile(type);
                              toast.info(`Removed file submission for ${type}.`);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}

                    {!isReadOnly && isUploader && isRejected && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                          disabled={uploadingType === type}
                          onClick={() => handleTriggerCustomUpload(type)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          {uploadingType === type ? 'Uploading…' : 'Upload Revision'}
                        </Button>
                        {onRemoveSpecialistFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title={`Remove file submission for ${type}`}
                            onClick={() => {
                              onRemoveSpecialistFile(type);
                              toast.info(`Removed file submission for ${type}.`);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}

                    {!isReadOnly && isUploader && isApproved && (
                      <div className="flex items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="gap-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          onClick={() => handleTriggerCustomUpload(type)}
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                          Upload Revision
                        </Button>
                        {onRemoveSpecialistFile && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                            title={`Remove file submission for ${type}`}
                            onClick={() => {
                              onRemoveSpecialistFile(type);
                              toast.info(`Removed file submission for ${type}.`);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {record.remarks && !isCurrentlyRejecting && (
                  <div className="rounded-md border border-rose-200 bg-rose-50/70 p-2.5 text-xs text-rose-900 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-semibold">Reviewer Rejection Remarks:</p>
                      <p className="leading-relaxed">{record.remarks}</p>
                      {record.reviewedBy && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400">
                          Reviewed by {record.reviewedBy}
                          {record.reviewedAt ? ` on ${new Date(record.reviewedAt).toLocaleDateString()}` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {isCurrentlyRejecting && (
                  <div className="rounded-md border border-rose-300 bg-rose-50/90 dark:border-rose-800 dark:bg-rose-950/50 p-3 space-y-2 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between text-xs font-semibold text-rose-900 dark:text-rose-200">
                      <span>Reason for Rejection & Required Revision ({type})</span>
                      <button
                        type="button"
                        onClick={() => setRejectingType(null)}
                        className="text-[11px] text-slate-500 hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                    <textarea
                      value={rejectionRemarks}
                      onChange={(e) => setRejectionRemarks(e.target.value)}
                      placeholder="e.g. Borehole depth must meet minimum 20m municipality requirement; please revise and resubmit calculation sheets."
                      rows={2}
                      className="w-full rounded border border-rose-200 bg-white p-2 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500 dark:border-rose-800 dark:bg-slate-900 dark:text-slate-100"
                      autoFocus
                    />
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs"
                        onClick={() => setRejectingType(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-xs bg-rose-600 hover:bg-rose-700 text-white"
                        disabled={!rejectionRemarks.trim()}
                        onClick={() => handleConfirmReject(type)}
                      >
                        Confirm Rejection
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
