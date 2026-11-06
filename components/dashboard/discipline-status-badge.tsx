'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { DisciplineDetail, DisciplineStageStatus } from '@/types/noc';
import { canUserEditDiscipline } from '@/lib/project-status';
import { ShieldAlert, Clock, Edit3, ArrowRight } from 'lucide-react';

interface DisciplineStatusBadgeProps {
  discipline: 'architecture' | 'structure' | 'mep';
  label: string;
  detail: DisciplineDetail;
  userRole: string;
  isReadOnly?: boolean;
  projectCode?: string;
  onUpdate?: (newStatus: DisciplineStageStatus, remarks?: string) => void;
}

const STAGE_OPTIONS: DisciplineStageStatus[] = [
  'Not Started',
  'In Progress',
  'Under Review',
  'Client Approval',
  'Approved',
  'On Hold',
];

export function DisciplineStatusBadge({
  discipline,
  label,
  detail,
  userRole,
  isReadOnly = false,
  projectCode,
  onUpdate,
}: DisciplineStatusBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<DisciplineStageStatus>(
    detail.status,
  );
  const [remarks, setRemarks] = useState(detail.remarks || '');

  const canEdit = !isReadOnly && canUserEditDiscipline(userRole, discipline);

  const getStatusColor = (status: DisciplineStageStatus) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300';
      case 'In Progress':
        return 'bg-sky-50 text-sky-700 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300';
      case 'Under Review':
        return 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300';
      case 'Client Approval':
        return 'bg-purple-50 text-purple-700 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300';
      case 'On Hold':
        return 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40 dark:text-rose-300';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300';
    }
  };

  const handleOpen = () => {
    setSelectedStatus(detail.status);
    setRemarks(detail.remarks || '');
    setIsOpen(true);
  };

  const handleSave = () => {
    if (onUpdate) {
      onUpdate(selectedStatus, remarks);
    }
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="group flex flex-col items-start gap-1 rounded-md border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 hover:shadow-xs dark:border-slate-800 dark:bg-slate-900"
        aria-label={`View or update ${label} status`}
      >
        <div className="flex w-full items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </span>
          {!isReadOnly && (
            <span className="opacity-0 transition-opacity group-hover:opacity-100">
              <Edit3 className="h-3 w-3 text-slate-400" />
            </span>
          )}
        </div>
        <Badge
          variant="outline"
          className={`px-2 py-0.5 text-xs font-semibold ${getStatusColor(detail.status)}`}
        >
          {detail.status}
        </Badge>
        <span className="line-clamp-1 capitalize text-[11px] text-slate-400 dark:text-slate-500">
          By {detail.updatedBy}
        </span>
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{label} Status Details</span>
              {isReadOnly ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  Analytics (Read Only)
                </Badge>
              ) : !canEdit ? (
                <Badge variant="secondary" className="text-xs font-normal">
                  Read Only
                </Badge>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {isReadOnly
                ? `Viewing ${label} engineering status overview. Stage updates are performed in NOC Tracker.`
                : canEdit
                  ? `Update the current engineering progress stage and remarks for ${label}.`
                  : `Viewing latest ${label} sign-off and milestone history.`}
            </DialogDescription>
          </DialogHeader>

          {canEdit ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Engineering Stage
                </label>
                <Select
                  value={selectedStatus}
                  onValueChange={(val) => {
                    if (val) setSelectedStatus(val as DisciplineStageStatus);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGE_OPTIONS.map((st) => (
                      <SelectItem key={st} value={st}>
                        {st}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Engineering Remarks / Transmittal Notes
                </label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter discipline progress notes or authority review comments..."
                  rows={3}
                  className="text-xs"
                />
              </div>

              <div className="flex items-center gap-2 rounded-md bg-slate-50 p-2 text-xs text-slate-500 dark:bg-slate-800">
                <Clock className="h-3.5 w-3.5" />
                <span>Last updated by {detail.updatedBy}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {isReadOnly ? (
                <div className="rounded-md border border-sky-200 bg-sky-50 p-3 text-xs text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">Analytics View</p>
                      <p className="mt-0.5 text-[11px]">
                        Discipline progress updates and submittals are managed
                        directly in the project NOC Tracker.
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
                  <div className="flex items-start gap-2">
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-semibold">Permission Restricted</p>
                      <p className="mt-0.5 text-[11px]">
                        Only assigned {label} Engineers and Administrators are
                        authorized to update {label} status.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-md border p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Current Stage:</span>
                  <Badge
                    variant="outline"
                    className={getStatusColor(detail.status)}
                  >
                    {detail.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Updated By:</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {detail.updatedBy}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Timestamp:</span>
                  <span>{new Date(detail.updatedAt).toLocaleString()}</span>
                </div>
                {detail.remarks && (
                  <div className="pt-2 border-t text-slate-600 dark:text-slate-400">
                    <span className="font-medium text-slate-800 dark:text-slate-200">
                      Notes:{' '}
                    </span>
                    {detail.remarks}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsOpen(false)}
            >
              Close
            </Button>
            {isReadOnly && projectCode && (
              <Link href={`/noc-tracker/${projectCode}`}>
                <Button size="sm" className="gap-1.5">
                  <span>Open in NOC Tracker</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            )}
            {!isReadOnly && canEdit && (
              <Button size="sm" onClick={handleSave}>
                Save Changes
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
