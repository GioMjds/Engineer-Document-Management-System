'use client';

import { useState, useMemo } from 'react';
import { Building2, Check, Search, Plus, Layers } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { MasterAuthorityRecord } from '@/types/noc';

export interface MasterAuthorityPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterAuthorities: MasterAuthorityRecord[];
  selectedAuthorityId: number;
  onSelectAuthority: (id: number) => void;
  onOpenAddMasterModal?: () => void;
  currentUserRole?: string;
  itemsCountByAuthority?: Record<number, number>;
}

// Modal dialog for selecting and switching statutory master authority jurisdictions.
export function MasterAuthorityPickerModal({
  isOpen,
  onClose,
  masterAuthorities,
  selectedAuthorityId,
  onSelectAuthority,
  onOpenAddMasterModal,
  currentUserRole,
  itemsCountByAuthority = {},
}: MasterAuthorityPickerModalProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredAuthorities = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return masterAuthorities;
    return masterAuthorities.filter(
      (auth) =>
        auth.name.toLowerCase().includes(q) ||
        (auth.jurisdiction && auth.jurisdiction.toLowerCase().includes(q)),
    );
  }, [masterAuthorities, searchQuery]);

  const handleSelect = (id: number) => {
    onSelectAuthority(id);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg shadow-none max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="gap-1.5 pb-2 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-(--site-navy) text-(--site-cyan) dark:bg-[#0e1c30]">
              <Building2 className="h-4 w-4" />
            </span>
            <DialogTitle className="text-base font-bold text-foreground">
              Select Jurisdiction Framework
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground">
            Switch statutory blueprint requirements and clearance milestones across Dubai authorities.
          </DialogDescription>
        </DialogHeader>

        {/* Search and Quick Filters */}
        <div className="relative pt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by authority name or jurisdiction..."
            className="h-8 pl-8 text-xs shadow-none"
            autoFocus
          />
        </div>

        {/* Authority Selection Grid */}
        <div
          role="radiogroup"
          aria-label="Master Authority Jurisdictions"
          className="flex-1 overflow-y-auto min-h-50 max-h-80 space-y-2 py-1 pr-1"
        >
          {filteredAuthorities.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center text-xs text-muted-foreground border border-dashed rounded-lg p-4">
              <Building2 className="h-8 w-8 text-muted-foreground/40 mb-2" />
              <p className="font-medium text-foreground">No jurisdictions found</p>
              <p className="text-[11px] mt-0.5">
                No matching authority records found for &quot;{searchQuery}&quot;.
              </p>
            </div>
          ) : (
            filteredAuthorities.map((auth) => {
              const isSelected = auth.id === selectedAuthorityId;
              const count = itemsCountByAuthority[auth.id];

              return (
                <button
                  key={auth.id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => handleSelect(auth.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-all flex items-start justify-between gap-3 cursor-pointer group',
                    isSelected
                      ? 'border-(--site-cyan) bg-(--site-cyan)/5 dark:bg-(--site-cyan)/10 shadow-xs ring-1 ring-(--site-cyan)'
                      : 'border-border bg-card hover:bg-muted/50 hover:border-border/80',
                  )}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <span
                      className={cn(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-xs transition-colors mt-0.5',
                        isSelected
                          ? 'border-(--site-cyan)/40 bg-(--site-cyan)/15 text-(--site-cyan)'
                          : 'border-border bg-muted/60 text-muted-foreground group-hover:text-foreground',
                      )}
                    >
                      <Building2 className="h-4 w-4" />
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-xs text-foreground group-hover:text-foreground">
                          {auth.name}
                        </span>
                        {isSelected && (
                          <Badge
                            variant="default"
                            className="h-4 px-1.5 text-[9px] bg-(--site-cyan) hover:bg-(--site-cyan) text-white font-medium"
                          >
                            Active
                          </Badge>
                        )}
                      </div>

                      {auth.jurisdiction && (
                        <p className="text-[11px] font-mono text-muted-foreground truncate">
                          {auth.jurisdiction}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-center">
                    {typeof count === 'number' && (
                      <span className="flex items-center gap-1 text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
                        <Layers className="h-3 w-3" />
                        <span>{count}</span>
                      </span>
                    )}

                    <div
                      className={cn(
                        'flex h-5 w-5 items-center justify-center rounded-full border transition-colors',
                        isSelected
                          ? 'border-(--site-cyan) bg-(--site-cyan) text-white'
                          : 'border-border text-transparent group-hover:border-muted-foreground/40',
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Actions */}
        <DialogFooter className="flex items-center justify-between gap-2 border-t border-border pt-3 sm:justify-between">
          <div>
            {currentUserRole === 'admin' && onOpenAddMasterModal && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  onOpenAddMasterModal();
                }}
                className="h-8 gap-1.5 text-xs border-dashed cursor-pointer shadow-none"
              >
                <Plus className="h-3 w-3" />
                <span>Register Jurisdiction</span>
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="h-8 text-xs cursor-pointer shadow-none"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
