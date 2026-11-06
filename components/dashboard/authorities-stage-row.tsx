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
import type { DisciplineStageStatus } from '@/types/noc';
import { canUserEditDiscipline } from '@/lib/project-status';
import { Landmark, ShieldAlert, Edit3, ArrowRight } from 'lucide-react';

interface AuthoritiesStageRowProps {
  designStage: DisciplineStageStatus;
  constructionStage: DisciplineStageStatus;
  revisionStage: DisciplineStageStatus;
  updatedBy: string;
  userRole: string;
  isReadOnly?: boolean;
  projectCode?: string;
  onUpdate?: (
    stageKey: 'designStage' | 'constructionStage' | 'revisionStage',
    newStatus: DisciplineStageStatus,
  ) => void;
}

const STAGE_OPTIONS = [
  'Not Started',
  'In Progress',
  'Under Review',
  'Client Approval',
  'Approved',
  'On Hold',
] satisfies DisciplineStageStatus[];

export function AuthoritiesStageRow({
  designStage,
  constructionStage,
  revisionStage,
  updatedBy,
  userRole,
  isReadOnly = false,
  projectCode,
  onUpdate,
}: AuthoritiesStageRowProps) {
  const [activeDialog, setActiveDialog] = useState<
    'designStage' | 'constructionStage' | 'revisionStage' | null
  >(null);
  const [selectedStatus, setSelectedStatus] =
    useState<DisciplineStageStatus>('Not Started');

  const canEdit = !isReadOnly && canUserEditDiscipline(userRole, 'authorities');

  const getStageColor = (status: DisciplineStageStatus) => {
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

  const handleOpen = (
    stageKey: 'designStage' | 'constructionStage' | 'revisionStage',
  ) => {
    const current =
      stageKey === 'designStage'
        ? designStage
        : stageKey === 'constructionStage'
          ? constructionStage
          : revisionStage;
    setSelectedStatus(current);
    setActiveDialog(stageKey);
  };

  const handleSave = () => {
    if (activeDialog && onUpdate) {
      onUpdate(activeDialog, selectedStatus);
      setActiveDialog(null);
    }
  };

  const getStageTitle = (key: string) => {
    switch (key) {
      case 'designStage':
        return 'Authorities Status – Design Stage';
      case 'constructionStage':
        return 'Authorities Status – Construction Stage';
      case 'revisionStage':
        return 'Authorities Status – Revision Stage';
      default:
        return 'Authorities Status';
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span className="flex items-center gap-1.5 font-medium">
          <Landmark className="h-3.5 w-3.5 text-slate-400" />
          Authorities Stages
        </span>
        <span className="text-[11px]">Authority Engr: {updatedBy}</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => handleOpen('designStage')}
          className="group flex flex-col items-start gap-1 rounded-md border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-[11px] text-slate-500">Design</span>
            {!isReadOnly && (
              <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
            )}
          </div>
          <Badge
            variant="outline"
            className={`px-1.5 py-0 text-[10px] ${getStageColor(designStage)}`}
          >
            {designStage}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleOpen('constructionStage')}
          className="group flex flex-col items-start gap-1 rounded-md border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-[11px] text-slate-500">Construction</span>
            {!isReadOnly && (
              <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
            )}
          </div>
          <Badge
            variant="outline"
            className={`px-1.5 py-0 text-[10px] ${getStageColor(constructionStage)}`}
          >
            {constructionStage}
          </Badge>
        </button>

        <button
          type="button"
          onClick={() => handleOpen('revisionStage')}
          className="group flex flex-col items-start gap-1 rounded-md border border-slate-200 bg-white p-2 text-left transition hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-[11px] text-slate-500">Revision</span>
            {!isReadOnly && (
              <Edit3 className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 text-slate-400" />
            )}
          </div>
          <Badge
            variant="outline"
            className={`px-1.5 py-0 text-[10px] ${getStageColor(revisionStage)}`}
          >
            {revisionStage}
          </Badge>
        </button>
      </div>

      <Dialog
        open={activeDialog !== null}
        onOpenChange={(open) => !open && setActiveDialog(null)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>{activeDialog && getStageTitle(activeDialog)}</span>
              {isReadOnly && (
                <Badge variant="secondary" className="text-xs font-normal">
                  Analytics (Read Only)
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              {isReadOnly
                ? 'Viewing authority submission milestone progress. Stage transitions are managed in NOC Tracker.'
                : canEdit
                  ? 'Update the authority submission milestone progress for this stage.'
                  : 'Viewing authority progress milestone history.'}
            </DialogDescription>
          </DialogHeader>

          {canEdit ? (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Authority Milestone Stage
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
                        Authority review stage transitions and updates are
                        managed directly in the project NOC Tracker.
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
                        Only assigned Authority Engineers and Administrators can
                        update Authority Stages.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveDialog(null)}
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
    </div>
  );
}
