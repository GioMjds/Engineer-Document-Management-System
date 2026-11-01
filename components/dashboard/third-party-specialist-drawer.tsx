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
import { FileText, Upload, CheckCircle2, Clock, Paperclip, FolderOpen } from 'lucide-react';

interface ThirdPartySpecialistDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  projectCode: string;
  projectName: string;
  specialists: ThirdPartySpecialistRecord[];
  userRole?: string;
  onUploadSpecialistFile: (type: ThirdPartySpecialistType, fileName: string, fileSize: string) => void;
  onApproveSpecialistFile: (type: ThirdPartySpecialistType) => void;
}

const ALL_SPECIALIST_TYPES: ThirdPartySpecialistType[] = [
  'Vertical Transportation',
  'Traffic Impact Study',
  'Green Building',
  'Topographical',
  'Geotechnical',
];

export function ThirdPartySpecialistDrawer({
  isOpen,
  onClose,
  projectCode,
  projectName,
  specialists,
  userRole,
  onUploadSpecialistFile,
  onApproveSpecialistFile,
}: ThirdPartySpecialistDrawerProps) {
  const isReadOnly = userRole === 'ceo';
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadType, setActiveUploadType] = useState<ThirdPartySpecialistType | null>(null);

  const getRecord = (type: ThirdPartySpecialistType) => {
    return specialists.find((s) => s.type === type) || {
      id: `spec-${type}`,
      type,
      status: 'Pending' as const,
    };
  };

  const handleSimulateUpload = (type: ThirdPartySpecialistType) => {
    const defaultFileNames: Record<ThirdPartySpecialistType, string> = {
      'Vertical Transportation': 'VT-LIFT-TRAFFIC-ANALYSIS-R01.pdf',
      'Traffic Impact Study': 'TIS-REPORT-RTA-SUBMISSION.pdf',
      'Green Building': 'AL-SAFAT-COMPLIANCE-DOCS.pdf',
      'Topographical': 'TOPO-SURVEY-BOUNDARY-COORDINATES.dwg',
      'Geotechnical': 'GEOTECH-SOIL-BEARING-CAPACITY.pdf',
    };
    const fileName = defaultFileNames[type];
    onUploadSpecialistFile(type, fileName, '6.4 MB');
    toast.success(`Attached ${fileName} for ${type}.`);
  };

  const handleTriggerCustomUpload = (type: ThirdPartySpecialistType) => {
    setActiveUploadType(type);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (activeUploadType && file) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      const sizeStr = `${sizeMb} MB`;
      onUploadSpecialistFile(activeUploadType, file.name, sizeStr);
      toast.success(`Attached ${file.name} (${sizeStr}) for ${activeUploadType}.`);
    }
    setActiveUploadType(null);
  };

  const handleApprove = (type: ThirdPartySpecialistType) => {
    onApproveSpecialistFile(type);
    toast.success(`Approved ${type} technical study.`);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
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
            {projectCode} — {projectName}. Track specialist consultancies and technical study file transmittals.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {ALL_SPECIALIST_TYPES.map((type) => {
            const record = getRecord(type);
            const isApproved = record.status === 'Approved';
            const isUploaded = record.status === 'Uploaded';
            const isPending = record.status === 'Pending';

            return (
              <div
                key={type}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-3.5 transition dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {type}
                    </span>
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
                    {isPending && (
                      <Badge variant="outline" className="text-slate-500 border-dashed">
                        Pending Submission
                      </Badge>
                    )}
                  </div>

                  {record.fileName ? (
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span className="flex items-center gap-1 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                        <FileText className="h-3.5 w-3.5 text-blue-500" />
                        {record.fileName}
                      </span>
                      <span>{record.fileSize}</span>
                      {record.uploadedBy && <span>• Uploaded by {record.uploadedBy}</span>}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400">
                      No technical report uploaded yet for this specialist scope.
                    </p>
                  )}
                </div>

                {!isReadOnly && (
                  <div className="flex items-center gap-1.5">
                    {isPending && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => handleSimulateUpload(type)}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Attach Report
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          title="Choose custom file from disk"
                          onClick={() => handleTriggerCustomUpload(type)}
                        >
                          <FolderOpen className="h-3.5 w-3.5 mr-1" />
                          Browse
                        </Button>
                      </>
                    )}
                    {isUploaded && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => handleSimulateUpload(type)}
                        >
                          <Upload className="h-3.5 w-3.5" />
                          Replace
                        </Button>
                        <Button
                          size="sm"
                          className="gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700"
                          onClick={() => handleApprove(type)}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </Button>
                      </>
                    )}
                    {isApproved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1.5 text-xs text-slate-500"
                        onClick={() => handleSimulateUpload(type)}
                      >
                        Upload Revision
                      </Button>
                    )}
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
