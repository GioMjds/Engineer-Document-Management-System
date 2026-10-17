'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, ChevronDown, ChevronRight, Lock, Unlock, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getAuthorityBadgeStyle } from './noc-matrix-utils';
import type { NocMatrixItem, NocStage } from '@/types/noc';

const STAGES = [
  'Design NOC',
  'Construction NOC',
  'Information NOC',
  'Handover NOC',
] satisfies NocStage[];

export interface NocMatrixSidebarProps {
  items: NocMatrixItem[];
  selectedItemId: string | null;
  onSelectItem: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedAuthorityFilter: string | null;
  onSelectAuthorityFilter: (auth: string | null) => void;
}

// Left navigation rail for browsing statutory NOC blueprints with search, authority filters, and stage tree.
export function NocMatrixSidebar({
  items,
  selectedItemId,
  onSelectItem,
  searchQuery,
  onSearchChange,
  selectedAuthorityFilter,
  onSelectAuthorityFilter,
}: NocMatrixSidebarProps) {
  const [collapsedStages, setCollapsedStages] = useState<Record<string, boolean>>({});
  const selectedItemRef = useRef<HTMLButtonElement | null>(null);

  const toggleStage = (stage: string) => {
    setCollapsedStages((prev) => ({ ...prev, [stage]: !prev[stage] }));
  };

  // Distinct reviewing authorities for filter pills
  const availableAuthorities = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.reviewingAuthority) {
        set.add(i.reviewingAuthority);
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Filter items based on search query and reviewing authority filter
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedAuthorityFilter && item.reviewingAuthority !== selectedAuthorityFilter) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      const rawNum = q.startsWith('#') ? q.slice(1).trim() : q;
      const seqStr = String(item.sequenceNo);
      const seqPadded = seqStr.padStart(2, '0');

      return (
        (item.description || '').toLowerCase().includes(q) ||
        (item.reviewingAuthority || '').toLowerCase().includes(q) ||
        (item.submittedBy || '').toLowerCase().includes(q) ||
        (item.stage || '').toLowerCase().includes(q) ||
        seqStr === rawNum ||
        seqPadded === rawNum ||
        (Boolean(rawNum) && seqStr.includes(rawNum))
      );
    });
  }, [items, searchQuery, selectedAuthorityFilter]);

  // Visible items taking stage collapse into account for keyboard navigation
  const visibleNavigableItems = useMemo(() => {
    const visible = filteredItems.filter((item) => !collapsedStages[item.stage]);
    return visible.length > 0 ? visible : filteredItems;
  }, [filteredItems, collapsedStages]);

  // Keyboard navigation: ArrowUp and ArrowDown
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const activeTag = target?.tagName;
      if (
        activeTag === 'INPUT' ||
        activeTag === 'TEXTAREA' ||
        target?.isContentEditable ||
        target?.closest('[role="dialog"]') ||
        Boolean(document.querySelector('[role="dialog"]'))
      ) {
        return;
      }
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;

      if (visibleNavigableItems.length === 0) return;

      e.preventDefault();
      const currentIndex = visibleNavigableItems.findIndex((i) => i.id === selectedItemId);

      if (e.key === 'ArrowDown') {
        const nextIndex =
          currentIndex >= 0 && currentIndex < visibleNavigableItems.length - 1
            ? currentIndex + 1
            : 0;
        onSelectItem(visibleNavigableItems[nextIndex].id);
      } else if (e.key === 'ArrowUp') {
        const prevIndex =
          currentIndex > 0
            ? currentIndex - 1
            : visibleNavigableItems.length - 1;
        onSelectItem(visibleNavigableItems[prevIndex].id);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [visibleNavigableItems, selectedItemId, onSelectItem]);

  // Auto-scroll selected item into view inside the list
  useEffect(() => {
    if (selectedItemRef.current) {
      selectedItemRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedItemId]);

  return (
    <nav
      aria-label="NOC Matrix Blueprints Navigation"
      className="flex flex-col h-full border-r border-border bg-card/40"
    >
      {/* Top Search & Filter Pills */}
      <div className="p-3 space-y-2.5 border-b border-border bg-card shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search #seq, authority, keyword..."
            aria-label="Search NOC matrix blueprints"
            className="h-8 pl-8 pr-7 text-xs bg-background border-border shadow-none"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => onSearchChange('')}
              aria-label="Clear search query"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer p-0.5 rounded"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        {availableAuthorities.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <button
              type="button"
              onClick={() => onSelectAuthorityFilter(null)}
              className={cn(
                'px-2 py-0.5 rounded text-[10px] font-mono font-medium border transition shrink-0 cursor-pointer shadow-none',
                selectedAuthorityFilter === null
                  ? 'bg-foreground text-background border-foreground font-bold'
                  : 'bg-muted/70 text-muted-foreground border-border hover:text-foreground hover:bg-muted',
              )}
            >
              All ({items.length})
            </button>
            {availableAuthorities.map((auth) => {
              const isSelected = selectedAuthorityFilter === auth;
              return (
                <button
                  key={auth}
                  type="button"
                  onClick={() => onSelectAuthorityFilter(isSelected ? null : auth)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-mono font-medium border transition shrink-0 cursor-pointer shadow-none',
                    isSelected
                      ? 'border-(--site-cyan) bg-(--site-cyan)/15 text-(--site-cyan) font-bold'
                      : 'border-border bg-muted/60 text-muted-foreground hover:text-foreground hover:bg-muted',
                  )}
                >
                  {auth}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Stage Grouped List Tiles */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/60">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No statutory NOC blueprints configured.
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-6 text-center text-xs text-muted-foreground">
            No blueprints match your filter criteria.
          </div>
        ) : (
          STAGES.map((stage) => {
            const stageItems = filteredItems.filter((i) => i.stage === stage);
            if (stageItems.length === 0) return null;
            const isCollapsed = !!collapsedStages[stage];

            return (
              <section key={stage} className="py-1">
                <button
                  type="button"
                  onClick={() => toggleStage(stage)}
                  aria-expanded={!isCollapsed}
                  className="flex items-center justify-between w-full px-3 py-1.5 text-left text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted/40 cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {isCollapsed ? (
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span>{stage}</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="h-4 px-1.5 font-mono text-[9px] font-semibold shadow-none"
                  >
                    {stageItems.length}
                  </Badge>
                </button>

                {!isCollapsed && (
                  <div className="space-y-1 px-2 pb-1 pt-0.5">
                    {stageItems.map((item) => {
                      const isSelected = selectedItemId === item.id;
                      const hasPrereq =
                        typeof item.blockingSequenceNo === 'number' && item.blockingSequenceNo > 0;
                      const paddedSeq = `#${String(item.sequenceNo).padStart(2, '0')}`;

                      return (
                        <button
                          key={item.id}
                          ref={isSelected ? selectedItemRef : null}
                          type="button"
                          onClick={() => onSelectItem(item.id)}
                          aria-current={isSelected ? 'true' : undefined}
                          className={cn(
                            'group flex items-start justify-between gap-2 w-full p-2 rounded-md text-left transition cursor-pointer border shadow-none',
                            isSelected
                              ? 'border-(--site-cyan) bg-(--site-cyan)/10'
                              : 'border-transparent hover:border-border hover:bg-muted/40',
                          )}
                        >
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span className="font-mono text-[11px] font-bold text-foreground shrink-0 mt-0.5">
                              {paddedSeq}
                            </span>
                            <div className="min-w-0 flex-1 space-y-1">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span
                                  className={cn(
                                    'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium border shadow-none',
                                    getAuthorityBadgeStyle(item.reviewingAuthority),
                                  )}
                                >
                                  {item.reviewingAuthority}
                                </span>
                                <span
                                  className="text-xs font-medium text-foreground truncate block flex-1 min-w-0"
                                  title={item.description}
                                >
                                  {item.description}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-mono">
                                <span>{item.requirements?.length || 0} reqs</span>
                                <span>•</span>
                                <span>{item.validityDays}d validity</span>
                              </div>
                            </div>
                          </div>

                          <div className="shrink-0 mt-0.5">
                            {hasPrereq ? (
                              <span title={`Requires prerequisite #${item.blockingSequenceNo}`}>
                                <Lock className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                              </span>
                            ) : (
                              <span title="No prerequisites required">
                                <Unlock className="h-3 w-3 text-muted-foreground/40" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </nav>
  );
}
