'use client';

import { useEffect } from 'react';
import {
  X,
  History,
  Building2,
  Calendar,
  ShieldCheck,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { NocMatrixRevision } from '@/types/noc';
import {
  formatRevisionDate,
  formatRoleName,
  getActionBadgeStyle,
} from './noc-matrix-utils';

export interface MatrixRevisionDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  revisions: NocMatrixRevision[];
  masterAuthorityName?: string;
  masterAuthorityId?: number;
  onRollback?: (revisionId: string) => void;
}

export function MatrixRevisionDrawer({
  isOpen,
  onClose,
  revisions,
  masterAuthorityName = 'Master Authority',
}: MatrixRevisionDrawerProps) {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-over Drawer aside */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Revision History & Audit Log"
        className="fixed inset-y-0 right-0 z-40 w-full sm:w-130 bg-background border-l border-border shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <header className="p-4 border-b border-border bg-muted/40 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0 pr-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-(--site-navy) text-(--site-cyan) dark:bg-[#070e1a] shrink-0">
              <History className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-foreground truncate">
                  Revision History & Audit Log
                </h2>
                <Badge
                  variant="secondary"
                  className="font-mono text-[10px] h-4.5 px-1.5"
                >
                  {revisions.length}{' '}
                  {revisions.length === 1 ? 'event' : 'events'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {masterAuthorityName} statutory blueprint modification ledger
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer shrink-0"
            aria-label="Close revision drawer"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Timeline Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
          {revisions.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center rounded-lg border border-dashed border-border bg-card">
              <History className="h-8 w-8 text-muted-foreground mb-2" />
              <h3 className="font-semibold text-xs text-foreground">
                No Template Revisions Recorded
              </h3>
              <p className="mt-1 text-xs text-muted-foreground max-w-xs">
                Modifications, sequencing adjustments, and statutory additions
                for {masterAuthorityName} will be automatically tracked here.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
              {revisions.map((rev) => (
                <div key={rev.id} className="relative group">
                  {/* Timeline dot */}
                  <span
                    className={cn(
                      'absolute -left-6 top-1 h-4 w-4 rounded-full border-2 bg-background flex items-center justify-center ring-4 ring-background',
                      rev.action === 'CREATE'
                        ? 'border-emerald-500 text-emerald-500'
                        : rev.action === 'UPDATE'
                          ? 'border-blue-500 text-blue-500'
                          : rev.action === 'DELETE'
                            ? 'border-rose-500 text-rose-500'
                            : 'border-purple-500 text-purple-500',
                    )}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  </span>

                  {/* Revision Card */}
                  <div className="rounded-lg border border-border bg-card p-3.5 shadow-xs space-y-2.5 transition hover:border-border/80 hover:bg-muted/10">
                    {/* Header: Action & Timestamp */}
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            'inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-mono font-bold border',
                            getActionBadgeStyle(rev.action),
                          )}
                        >
                          {rev.action}
                        </span>
                        <span className="font-medium text-xs text-foreground">
                          {rev.changedByName || 'Authority Engineer'}
                        </span>
                      </div>

                      <span className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground shrink-0">
                        <Calendar className="h-3 w-3" />
                        <span>{formatRevisionDate(rev.createdAt)}</span>
                      </span>
                    </div>

                    {/* Submitter Role Details */}
                    <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 border border-border/60 font-mono text-[10px]">
                        <ShieldCheck className="h-3 w-3 text-muted-foreground" />
                        <span>{formatRoleName(rev.changedByRole)}</span>
                      </span>
                    </div>

                    {/* Change Summary Box */}
                    <div className="rounded-md border border-border/80 bg-muted/30 p-2.5 text-xs text-foreground/90 space-y-1">
                      <div className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground">
                        <FileText className="h-3 w-3" />
                        <span>Justification & Summary:</span>
                      </div>
                      <p className="leading-relaxed whitespace-pre-wrap text-[11px]">
                        {rev.changeSummary}
                      </p>
                    </div>

                    {/* Propagation Metrics */}
                    <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground bg-muted/40 px-2 py-1 rounded border border-border/60">
                      <Building2 className="h-3 w-3 text-(--site-cyan) shrink-0" />
                      <span>
                        Propagated to {rev.propagatedProjectsCount} active{' '}
                        {rev.propagatedProjectsCount === 1
                          ? 'project'
                          : 'projects'}{' '}
                        ({rev.propagatedNocsCount}{' '}
                        {rev.propagatedNocsCount === 1 ? 'NOC' : 'NOCs'})
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <footer className="p-4 border-t border-border bg-muted/20 shrink-0 flex justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            className="text-xs h-8 cursor-pointer"
          >
            Close
          </Button>
        </footer>
      </aside>
    </>
  );
}
