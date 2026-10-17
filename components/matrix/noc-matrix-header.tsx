'use client';

import { Layers, History, Plus, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { MasterAuthorityRecord } from '@/types/noc';

export interface NocMatrixHeaderProps {
  masterAuthorities: MasterAuthorityRecord[];
  selectedAuthorityId: number;
  onSelectAuthority: (id: number) => void;
  onOpenAddMasterModal: () => void;
  onOpenRevisionDrawer: () => void;
  onOpenAddNocModal: () => void;
  revisionsCount: number;
  canEdit: boolean;
  currentUserRole: string;
}

// Command deck header with master authority selector, revision log trigger, and action controls.
export function NocMatrixHeader({
  masterAuthorities,
  selectedAuthorityId,
  onSelectAuthority,
  onOpenAddMasterModal,
  onOpenRevisionDrawer,
  onOpenAddNocModal,
  revisionsCount,
  canEdit,
  currentUserRole,
}: NocMatrixHeaderProps) {
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
        {/* Master Authority Selector */}
        <div className="flex items-center gap-1.5">
          <Select
            value={String(selectedAuthorityId)}
            onValueChange={(val) => {
              if (val) {
                onSelectAuthority(Number(val));
              }
            }}
          >
            <SelectTrigger className="h-8 min-w-55 text-xs font-semibold bg-card border-border shadow-none">
              <Building2 className="mr-1.5 h-3.5 w-3.5 text-(--site-cyan)" />
              <SelectValue placeholder="Select Authority" />
            </SelectTrigger>
            <SelectContent>
              {masterAuthorities.map((auth) => (
                <SelectItem key={auth.id} value={String(auth.id)} className="text-xs">
                  <div className="flex items-center justify-between gap-3 w-full">
                    <span className="font-semibold">{auth.name}</span>
                    {auth.jurisdiction && (
                      <span className="text-[10px] font-mono text-muted-foreground">
                        {auth.jurisdiction}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

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
