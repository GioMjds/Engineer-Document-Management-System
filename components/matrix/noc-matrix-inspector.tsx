'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Layers,
  Pencil,
  Eye,
  Lock,
  Unlock,
  Calendar,
  Coins,
  ListChecks,
  History,
  ExternalLink,
  CheckCircle2,
  FileText,
  FileCheck2,
  Receipt,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatAed } from '@/lib/noc-constants';
import {
  getAuthorityBadgeStyle,
  getSubmitterBadgeStyle,
  getDisciplineTag,
  getDisciplineBadgeClass,
  getActionBadgeClass,
  formatUtcTimestamp,
} from './noc-matrix-utils';
import type { NocMatrixItem, NocMatrixRevision } from '@/types/noc';

export interface NocMatrixInspectorProps {
  item: NocMatrixItem | null;
  allItems?: NocMatrixItem[];
  onEditItem?: (item: NocMatrixItem) => void;
  onSelectItem?: (id: string) => void;
  canEdit?: boolean;
  revisions?: NocMatrixRevision[];
  className?: string;
}

export function NocMatrixInspector({
  item,
  allItems = [],
  onEditItem,
  onSelectItem,
  canEdit = false,
  revisions = [],
  className,
}: NocMatrixInspectorProps) {
  const blockingSequenceNo = item?.blockingSequenceNo;
  const masterAuthorityId = item?.masterAuthorityId;
  const itemId = item?.id;

  const predecessor = useMemo(() => {
    if (!blockingSequenceNo || !masterAuthorityId) return null;
    return (
      allItems.find(
        (i) =>
          i.masterAuthorityId === masterAuthorityId &&
          i.sequenceNo === blockingSequenceNo,
      ) || null
    );
  }, [blockingSequenceNo, masterAuthorityId, allItems]);

  // Filter revisions specifically tied to this blueprint
  const itemRevisions = useMemo(() => {
    if (!itemId) return [];
    return revisions.filter((r) => r.matrixItemId === itemId);
  }, [revisions, itemId]);

  // Formatted sequence number
  if (!item) {
    return (
      <aside
        aria-label="NOC Matrix Blueprint Inspector"
        className={cn(
          'flex h-full min-h-130 flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card p-12 text-center shadow-none',
          className,
        )}
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted text-muted-foreground border border-border">
          <Layers className="h-6 w-6" />
        </div>
        <h3 className="mt-4 font-heading text-sm font-semibold text-foreground">
          No Blueprint Selected
        </h3>
        <p className="mt-1.5 max-w-sm text-xs text-muted-foreground leading-relaxed">
          {allItems.length === 0
            ? 'There are currently no statutory NOC blueprints configured for this master authority.'
            : 'Select a statutory NOC blueprint from the navigation list on the left to inspect its statutory checklist, prerequisite chain, and connected document repositories.'}
        </p>
      </aside>
    );
  }

  const formattedSeq = `#${String(item.sequenceNo).padStart(2, '0')}`;
  const predecessorSeq = item.blockingSequenceNo
    ? `#${String(item.blockingSequenceNo).padStart(2, '0')}`
    : null;

  return (
    <article
      aria-label={`Inspector for ${item.reviewingAuthority} ${formattedSeq}`}
      className={cn(
        'flex flex-col rounded-lg border border-border bg-card shadow-none divide-y divide-border',
        className,
      )}
    >
      {/* Top Inspector Header */}
      <header className="p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-muted text-foreground border border-border">
              {formattedSeq}
            </span>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-semibold px-2 py-0.5 shadow-none border',
                getAuthorityBadgeStyle(item.reviewingAuthority),
              )}
            >
              {item.reviewingAuthority}
            </Badge>
            <Badge
              variant="outline"
              className="text-xs font-medium px-2 py-0.5 shadow-none border border-border text-foreground"
            >
              {item.stage}
            </Badge>
            <Badge
              variant="outline"
              className={cn(
                'text-xs font-medium px-2 py-0.5 shadow-none border',
                getSubmitterBadgeStyle(item.submittedBy),
              )}
            >
              {item.submittedBy}
            </Badge>
          </div>

          {/* Action Trigger */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditItem?.(item)}
            className="h-8 gap-1.5 text-xs font-medium cursor-pointer shadow-none"
          >
            {canEdit ? (
              <>
                <Pencil className="h-3.5 w-3.5" />
                <span>Edit Blueprint</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>View Raw Config</span>
              </>
            )}
          </Button>
        </div>

        {/* Blueprint Description */}
        <div>
          <h2 className="font-heading text-base font-semibold text-foreground tracking-tight">
            {item.description}
          </h2>
        </div>

        {/* Metric Indicators */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/30 p-2.5 shadow-none">
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Default Validity
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                {item.validityDays > 0
                  ? `${item.validityDays} days`
                  : 'Permanent'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/30 p-2.5 shadow-none">
            <Coins className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <span className="text-[11px] text-muted-foreground block font-medium">
                Baseline Statutory Fee
              </span>
              <span className="font-mono text-xs font-bold text-foreground">
                {formatAed(item.defaultFee)}
              </span>
            </div>
          </div>
        </div>

        {/* Prerequisite Dependency Banner */}
        {item.blockingSequenceNo ? (
          <div className="flex items-start gap-2.5 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-200 shadow-none">
            <Lock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold text-amber-950 dark:text-amber-100">
                  Prerequisite Milestone Required
                </span>
                <span className="font-mono text-[11px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900 dark:text-amber-200">
                  {predecessorSeq}
                </span>
              </div>
              <p className="text-[11px] text-amber-800 dark:text-amber-300 leading-normal">
                Requires completion of predecessor approval before submittal{' '}
                {predecessor ? (
                  <>
                    (
                    <span className="font-medium">
                      {predecessor.reviewingAuthority}
                    </span>
                    : {predecessor.description}).
                  </>
                ) : (
                  <>({predecessorSeq}).</>
                )}
              </p>
              {predecessor && onSelectItem && (
                <button
                  type="button"
                  onClick={() => onSelectItem(predecessor.id)}
                  className="inline-flex items-center gap-1 font-semibold text-amber-900 dark:text-amber-200 hover:underline pt-0.5 cursor-pointer"
                >
                  Inspect predecessor blueprint {predecessorSeq}
                  <ArrowRight className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-md border border-border bg-muted/20 p-2.5 text-xs text-muted-foreground shadow-none">
            <Unlock className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>
              Independent Approval • No prior statutory NOC dependencies
              required.
            </span>
          </div>
        )}
      </header>

      {/* Tabbed Deck */}
      <Tabs defaultValue="checklist" className="flex-1 flex flex-col w-full">
        <div className="px-5 pt-3 border-b border-border bg-muted/15">
          <TabsList variant="line" className="gap-4">
            <TabsTrigger
              value="checklist"
              className="gap-1.5 text-xs font-medium pb-2.5 cursor-pointer"
            >
              <ListChecks className="h-3.5 w-3.5" />
              <span>Checklist</span>
              <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground">
                {item.requirements?.length || 0}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="gap-1.5 text-xs font-medium pb-2.5 cursor-pointer"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Documents</span>
            </TabsTrigger>
            <TabsTrigger
              value="audit"
              className="gap-1.5 text-xs font-medium pb-2.5 cursor-pointer"
            >
              <History className="h-3.5 w-3.5" />
              <span>Audit Log</span>
              <span className="ml-1 rounded px-1.5 py-0.5 text-[10px] font-mono bg-muted text-muted-foreground">
                {itemRevisions.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* 1. Statutory Checklist Tab */}
        <TabsContent value="checklist" className="p-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider">
              Statutory Requirements Checklist
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              {item.requirements?.filter((r) => r.mandatory).length || 0}{' '}
              mandatory
            </span>
          </div>

          {!item.requirements || item.requirements.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground shadow-none">
              No statutory requirements listed for this blueprint.
            </div>
          ) : (
            <ul className="space-y-2" aria-label="Statutory requirements list">
              {item.requirements.map((req, idx) => {
                const discipline = getDisciplineTag(req.title);
                return (
                  <li
                    key={req.id || `req-${idx}`}
                    className="flex items-start justify-between gap-3 rounded-md border border-border bg-card p-3 shadow-none hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <div className="space-y-1 min-w-0">
                        <p className="text-xs font-medium text-foreground leading-snug wrap-break-words">
                          {req.title}
                        </p>
                        <div className="flex items-center gap-2">
                          {req.mandatory ? (
                            <span className="font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                              * Mandatory
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-muted-foreground">
                              Optional
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={cn(
                        'shrink-0 text-[10px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 shadow-none border',
                        getDisciplineBadgeClass(discipline),
                      )}
                    >
                      [{discipline}]
                    </Badge>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        {/* 2. Documents & Connectors Tab */}
        <TabsContent value="documents" className="p-5 space-y-4">
          <div className="space-y-1">
            <h3 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider">
              Connected Operational Workspaces
            </h3>
            <p className="text-xs text-muted-foreground">
              Direct deep links to query drawing revisions and active permit
              filings.
            </p>
          </div>

          {/* Deep link card 1: Engineering Documents */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-none space-y-2 hover:border-(--site-cyan) transition-colors">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-(--site-cyan) shrink-0" />
                <h4 className="font-heading text-xs font-bold text-foreground">
                  Engineering Document Repository
                </h4>
              </div>
              <Link
                href={`/documents?q=${encodeURIComponent(item.reviewingAuthority)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-(--site-cyan) hover:underline"
              >
                <span>Jump to /documents</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Search approved drawing revisions (
              <code className="font-mono text-[11px] bg-muted px-1 rounded">
                R00
              </code>
              ,{' '}
              <code className="font-mono text-[11px] bg-muted px-1 rounded">
                R01
              </code>
              ) and submittals for {item.reviewingAuthority}.
            </p>
          </div>

          {/* Deep link card 2: Authority NOC Tracker */}
          <div className="rounded-lg border border-border bg-card p-4 shadow-none space-y-2 hover:border-(--site-cyan) transition-colors">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ExternalLink className="h-4 w-4 text-amber-500 shrink-0" />
                <h4 className="font-heading text-xs font-bold text-foreground">
                  Active Authority NOC Tracker
                </h4>
              </div>
              <Link
                href={`/noc-tracker?authority=${encodeURIComponent(item.reviewingAuthority)}&stage=${encodeURIComponent(item.stage)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-600 dark:text-amber-400 hover:underline"
              >
                <span>Jump to /noc-tracker</span>
                <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Inspect project submittals, reference numbers, and 7-day expiry
              timers for {item.stage}.
            </p>
          </div>

          {/* Expected Discipline Deliverables Section */}
          <div className="space-y-2 pt-2 border-t border-border">
            <h4 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider">
              Expected Discipline Deliverables
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="rounded-md border border-border bg-muted/20 p-3 shadow-none space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <FileCheck2 className="h-3.5 w-3.5 text-foreground" />
                  <span>Authority Application Forms</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Official signed submittal form bearing consultant engineer
                  registration number and client authorization.
                </p>
              </div>

              <div className="rounded-md border border-border bg-muted/20 p-3 shadow-none space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <ShieldCheck className="h-3.5 w-3.5 text-foreground" />
                  <span>Stamped Consultant Drawings</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Discipline layout drawings (Architectural, Structural, MEP, or
                  Civil) stamped by licensed Dubai consultant.
                </p>
              </div>

              <div className="rounded-md border border-border bg-muted/20 p-3 shadow-none space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Receipt className="h-3.5 w-3.5 text-foreground" />
                  <span>Fee Clearance Receipt</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Statutory transaction voucher or payment clearance receipt
                  issued through authority payment gateway.
                </p>
              </div>

              <div className="rounded-md border border-border bg-muted/20 p-3 shadow-none space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Lock className="h-3.5 w-3.5 text-foreground" />
                  <span>Predecessor Certificates</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Prior gate clearance certificates required by statutory
                  sequence order before submittal validation.
                </p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 3. Audit Log Tab */}
        <TabsContent value="audit" className="p-5 space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h3 className="font-heading text-xs font-semibold text-foreground uppercase tracking-wider">
              Blueprint Revision History
            </h3>
            <span className="text-[11px] text-muted-foreground font-mono">
              {itemRevisions.length} records
            </span>
          </div>

          {itemRevisions.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-xs text-muted-foreground shadow-none">
              No revision audit entries recorded for this blueprint.
            </div>
          ) : (
            <ul
              className="space-y-2.5"
              aria-label="Blueprint revisions history"
            >
              {itemRevisions.map((rev) => (
                <li
                  key={rev.id}
                  className="rounded-md border border-border bg-card p-3 shadow-none space-y-2"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-[10px] font-mono font-bold px-1.5 py-0.5 shadow-none border',
                          getActionBadgeClass(rev.action),
                        )}
                      >
                        {rev.action}
                      </Badge>
                      <span className="text-xs font-semibold text-foreground">
                        {rev.changedByName ||
                          rev.changedByRole ||
                          rev.changedBy}
                      </span>
                    </div>
                    <time className="font-mono text-[11px] text-muted-foreground">
                      {formatUtcTimestamp(rev.createdAt)}
                    </time>
                  </div>

                  <p className="text-xs text-muted-foreground leading-normal">
                    {rev.changeSummary}
                  </p>

                  {(rev.propagatedProjectsCount > 0 ||
                    rev.propagatedNocsCount > 0) && (
                    <div className="font-mono text-[10px] text-muted-foreground bg-muted/40 rounded px-2 py-1 border border-border w-fit">
                      Propagated to {rev.propagatedProjectsCount} projects (
                      {rev.propagatedNocsCount} NOC records)
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </article>
  );
}
