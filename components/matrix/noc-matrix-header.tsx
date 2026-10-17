'use client';

import { Layers, History, Plus, Building2, ChevronsUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { MasterAuthorityRecord } from '@/types/noc';

export interface NocMatrixHeaderProps {
  masterAuthorities: MasterAuthorityRecord[];
  selectedAuthorityId: number;
  onOpenSelectAuthorityModal: () => void;
  onOpenAddMasterModal: () => void;
  onOpenRevisionDrawer: () => void;
  onOpenAddNocModal: () => void;
  revisionsCount: number;
  canEdit: boolean;
  currentUserRole: string;
}

// Command deck header with master authority modal trigger, revision log trigger, and action controls.
export function NocMatrixHeader({
  masterAuthorities,
  selectedAuthorityId,
  onOpenSelectAuthorityModal,
  onOpenAddMasterModal,
  onOpenRevisionDrawer,
  onOpenAddNocModal,
  revisionsCount,
  canEdit,
  currentUserRole,
}: NocMatrixHeaderProps) {
  const currentAuthority =
    masterAuthorities.find((a) => a.id === selectedAuthorityId) ||
    masterAuthorities[0];

  return (
    <header className="flex flex-col gap-4 border-b border-border pb-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-(--site-navy) text-(--site-cyan) dark:bg-[#0e1c30]">
            <Layers className="h-4 w-4" />
          </span>
          <h1 className="font-heading text-lg font-bold tracking-tight text-foreground">
            Authority NOC Matrix Blueprints
          </h1>
        </div>
        <p className="text-xs text-muted-foreground">
          Statutory approval frameworks, prerequisite chains, and baseline fees across Dubai jurisdictions.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Master Authority Jurisdiction Trigger */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenSelectAuthorityModal}
            className="h-8 gap-2 text-xs font-semibold bg-card border-border shadow-none hover:bg-muted/60 transition-colors cursor-pointer"
            title="Switch Master Authority Jurisdiction"
            aria-label={`Current jurisdiction: ${currentAuthority?.name ?? 'Select Jurisdiction'}`}
          >
            <Building2 className="h-3.5 w-3.5 text-(--site-cyan) shrink-0" />
            <div className="flex items-center gap-1.5 text-left">
              <span className="text-[11px] font-normal text-muted-foreground hidden sm:inline">
                Jurisdiction:
              </span>
              <span className="font-semibold text-foreground truncate max-w-36 sm:max-w-50 md:max-w-65">
                {currentAuthority?.name ?? 'Select Jurisdiction'}
              </span>
              {currentAuthority?.jurisdiction && (
                <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded bg-muted/80 hidden md:inline truncate max-w-35">
                  {currentAuthority.jurisdiction}
                </span>
              )}
            </div>
            <ChevronsUpDown className="h-3 w-3 text-muted-foreground shrink-0 ml-0.5" />
          </Button>

          {currentUserRole === 'admin' && (
            <Button
              variant="outline"
              size="sm"
              onClick={onOpenAddMasterModal}
              title="Register new Master Authority jurisdiction"
              aria-label="Register new Master Authority jurisdiction"
              className="h-8 px-2 text-xs border-dashed cursor-pointer shadow-none"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Audit Log Trigger */}
        <Button
          variant="outline"
          size="sm"
          onClick={onOpenRevisionDrawer}
          className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-none"
        >
          <History className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="hidden sm:inline">Revision Log</span>
          <Badge variant="secondary" className="h-4.5 px-1 font-mono text-[10px] font-bold">
            {revisionsCount}
          </Badge>
        </Button>

        {/* Add Standard NOC Button */}
        {canEdit && (
          <Button
            size="sm"
            onClick={onOpenAddNocModal}
            className="h-8 gap-1.5 bg-(--site-cyan) text-white hover:bg-(--site-cyan-hover) text-xs font-semibold cursor-pointer shadow-none"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Standard NOC</span>
          </Button>
        )}
      </div>
    </header>
  );
}
