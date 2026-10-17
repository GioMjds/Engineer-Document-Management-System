'use client';

import { useState, useMemo } from 'react';
import { Search, Download, Shield, Copy, Check } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export interface AuditLogActor {
  id: string;
  full_name: string | null;
  email: string | null;
  role: string | null;
}

export interface AuditLogItem {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  actor: AuditLogActor | null;
}

interface AuditLogsWorkspaceProps {
  initialLogs: AuditLogItem[];
}

type ActionCategory =
  | 'all'
  | 'documents'
  | 'reviews'
  | 'nocs'
  | 'users'
  | 'destructions';

export function AuditLogsWorkspace({ initialLogs }: AuditLogsWorkspaceProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] =
    useState<ActionCategory>('all');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'DOCUMENT_PERMANENT_PURGE':
      case 'NOC_REJECTED':
      case 'DOCUMENT_REVIEW_REJECT':
      case 'USER_DEACTIVATE':
        return (
          <Badge
            variant="outline"
            className="border-destructive/40 bg-destructive/10 text-destructive text-[11px] font-mono uppercase"
          >
            {action.replace(/_/g, ' ')}
          </Badge>
        );
      case 'DOCUMENT_ARCHIVE':
      case 'NOC_SEQUENCE_OVERRIDE':
        return (
          <Badge
            variant="outline"
            className="border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[11px] font-mono uppercase"
          >
            {action.replace(/_/g, ' ')}
          </Badge>
        );
      case 'DOCUMENT_REVIEW_APPROVE':
      case 'NOC_OBTAINED':
      case 'DOCUMENT_RESTORE':
        return (
          <Badge
            variant="outline"
            className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-mono uppercase"
          >
            {action.replace(/_/g, ' ')}
          </Badge>
        );
      case 'DOCUMENT_UPLOAD':
      case 'DOCUMENT_REVISION_UPLOAD':
      case 'NOC_SUBMITTED':
      case 'NOC_FEE_RECORDED':
        return (
          <Badge
            variant="outline"
            className="border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-[11px] font-mono uppercase"
          >
            {action.replace(/_/g, ' ')}
          </Badge>
        );
      default:
        return (
          <Badge
            variant="outline"
            className="border-primary/40 bg-primary/10 text-primary text-[11px] font-mono uppercase"
          >
            {action.replace(/_/g, ' ')}
          </Badge>
        );
    }
  };

  const getSummaryText = (item: AuditLogItem): string => {
    const m = item.metadata ?? {};
    switch (item.action) {
      case 'DOCUMENT_PERMANENT_PURGE':
        return `Permanently purged document "${m.title ?? item.entity_id}"`;
      case 'DOCUMENT_ARCHIVE':
        return `Soft-deleted "${m.title ?? item.entity_id}" (${m.doc_number ?? 'Drawing'})`;
      case 'DOCUMENT_RESTORE':
        return `Restored "${m.title ?? item.entity_id}" back to active scope`;
      case 'DOCUMENT_UPLOAD':
        return `Uploaded initial revision R00 for "${m.title ?? m.doc_number ?? item.entity_id}"`;
      case 'DOCUMENT_REVISION_UPLOAD':
        return `Uploaded revision ${m.new_revision ?? 'new'} for document "${m.title ?? m.doc_number ?? item.entity_id}"`;
      case 'DOCUMENT_EDIT':
        return `Updated metadata for "${m.title ?? m.doc_number ?? item.entity_id}"`;
      case 'NOC_SEQUENCE_OVERRIDE':
        return `Overrode prerequisite sequence. Reason: ${m.reason ?? '-'}`;
      case 'NOC_SUBMITTED':
        return `Submitted NOC with authority ref ${m.authorityReference ?? '-'}`;
      case 'NOC_OBTAINED':
        return `Recorded NOC obtained status (Expires: ${m.expiryDate ?? '-'})`;
      case 'NOC_REJECTED':
        return `Recorded authority rejection. Reason: ${m.rejectionReason ?? '-'}`;
      case 'DOCUMENT_REVIEW_APPROVE':
        return `Approved drawing revision ${m.revision_label ?? 'R00'} at ${String(m.level ?? '').toUpperCase()} level`;
      case 'DOCUMENT_REVIEW_REJECT':
        return `Rejected drawing revision ${m.revision_label ?? 'R00'}: ${m.comment ?? '-'}`;
      case 'USER_INVITE':
        return `Invited new ${String(m.role ?? '').toUpperCase()} user (${m.email ?? '-'})`;
      case 'USER_ROLE_UPDATE':
        return `Changed role of ${m.target_email ?? item.entity_id} from ${m.previous_role ?? '-'} to ${m.new_role ?? '-'}`;
      case 'USER_DEACTIVATE':
        return `Deactivated user account ${m.target_email ?? item.entity_id}`;
      case 'PROJECT_CREATE':
        return `Registered project "${m.name ?? '-'}" (${m.code ?? '-'}) with ${m.instantiated_nocs_count ?? 0} statutory NOCs`;
      case 'PROJECT_MEMBERS_UPDATE':
        return `Updated project team assignments (${m.members_count ?? 0} members)`;
      default:
        return Object.keys(m).length > 0
          ? JSON.stringify(m)
          : 'No extra metadata';
    }
  };

  const filteredLogs = useMemo(() => {
    return initialLogs.filter((log) => {
      // Entity filter
      if (selectedEntity !== 'all' && log.entity !== selectedEntity) {
        return false;
      }

      // Category filter
      if (selectedCategory === 'documents') {
        if (
          !log.action.startsWith('DOCUMENT_') ||
          log.action.includes('REVIEW')
        )
          return false;
      } else if (selectedCategory === 'reviews') {
        if (
          !log.action.includes('REVIEW') &&
          log.action !== 'NOC_OBTAINED' &&
          log.action !== 'NOC_REJECTED'
        ) {
          return false;
        }
      } else if (selectedCategory === 'nocs') {
        if (!log.action.startsWith('NOC_')) return false;
      } else if (selectedCategory === 'users') {
        if (
          !log.action.startsWith('USER_') &&
          !log.action.startsWith('PROJECT_')
        )
          return false;
      } else if (selectedCategory === 'destructions') {
        if (
          log.action !== 'DOCUMENT_PERMANENT_PURGE' &&
          log.action !== 'DOCUMENT_ARCHIVE' &&
          log.action !== 'USER_DEACTIVATE' &&
          log.action !== 'NOC_SEQUENCE_OVERRIDE'
        ) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const actionMatch = log.action.toLowerCase().includes(query);
        const entityMatch = log.entity.toLowerCase().includes(query);
        const entityIdMatch = log.entity_id.toLowerCase().includes(query);
        const actorNameMatch =
          log.actor?.full_name?.toLowerCase().includes(query) ?? false;
        const actorEmailMatch =
          log.actor?.email?.toLowerCase().includes(query) ?? false;
        const metadataMatch = JSON.stringify(log.metadata ?? {})
          .toLowerCase()
          .includes(query);

        return (
          actionMatch ||
          entityMatch ||
          entityIdMatch ||
          actorNameMatch ||
          actorEmailMatch ||
          metadataMatch
        );
      }

      return true;
    });
  }, [initialLogs, selectedEntity, selectedCategory, searchQuery]);

  const stats = useMemo(() => {
    let destructions = 0;
    let reviews = 0;
    let nocs = 0;
    let adminOps = 0;

    for (const log of initialLogs) {
      if (
        log.action === 'DOCUMENT_PERMANENT_PURGE' ||
        log.action === 'DOCUMENT_ARCHIVE' ||
        log.action === 'USER_DEACTIVATE'
      ) {
        destructions++;
      }
      if (
        log.action.includes('REVIEW') ||
        log.action === 'NOC_OBTAINED' ||
        log.action === 'NOC_REJECTED'
      ) {
        reviews++;
      }
      if (log.action.startsWith('NOC_')) {
        nocs++;
      }
      if (
        log.action.startsWith('USER_') ||
        log.action.startsWith('PROJECT_') ||
        log.action === 'NOC_SEQUENCE_OVERRIDE'
      ) {
        adminOps++;
      }
    }

    return {
      total: initialLogs.length,
      destructions,
      reviews,
      nocs,
      adminOps,
    };
  }, [initialLogs]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportCSV = () => {
    const headers = [
      'Timestamp',
      'Actor Name',
      'Actor Email',
      'Actor Role',
      'Action',
      'Entity',
      'Entity ID',
      'Summary',
    ];
    const rows = filteredLogs.map((l) => [
      `"${new Date(l.created_at).toISOString()}"`,
      `"${l.actor?.full_name ?? 'System'}"`,
      `"${l.actor?.email ?? 'System'}"`,
      `"${l.actor?.role ?? 'System'}"`,
      `"${l.action}"`,
      `"${l.entity}"`,
      `"${l.entity_id}"`,
      `"${getSummaryText(l).replace(/"/g, '""')}"`,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((r) => r.join(',')),
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute(
      'download',
      `cvtec-edms-audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="space-y-6" aria-label="Audit Log Governance Workspace">
      {/* Header section */}
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Audit Log & Compliance Ledger
            </h1>
            <Badge
              variant="outline"
              className="text-[11px] font-mono border-primary/30 text-primary"
            >
              Immutable
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Tamper-evident trail for drawing revisions, deletions, NOC
            overrides, and authority submissions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="h-8 gap-1.5 text-xs font-medium"
            aria-label="Export audit ledger to CSV"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            Export CSV ({filteredLogs.length})
          </Button>
        </div>
      </header>

      {/* Metric Tiles */}
      <section
        className="grid grid-cols-2 gap-3 sm:grid-cols-4"
        aria-label="Audit statistics"
      >
        <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
          <p className="text-xs font-medium text-muted-foreground">
            Total Logged Events
          </p>
          <p className="text-2xl font-bold text-foreground mt-1">
            {stats.total}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
          <p className="text-xs font-medium text-destructive">
            Deletions & Purges
          </p>
          <p className="text-2xl font-bold text-destructive mt-1">
            {stats.destructions}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
          <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
            Reviews & Approvals
          </p>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
            {stats.reviews}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3 shadow-2xs">
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">
            Admin Governance & Overrides
          </p>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
            {stats.adminOps}
          </p>
        </div>
      </section>

      {/* Filter and Search Bar */}
      <section
        className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3.5 shadow-2xs"
        aria-label="Audit filters"
      >
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search
              className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Search by actor, action, doc number, reason, or entity ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-xs h-9"
              aria-label="Filter audit events by search query"
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              aria-label="Filter by Entity"
            >
              <option value="all">All Entities</option>
              <option value="documents">Documents</option>
              <option value="project_nocs">Project NOCs</option>
              <option value="profiles">Users & Roles</option>
              <option value="projects">Projects</option>
            </select>
          </div>
        </div>

        {/* Quick Category Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs border-t border-border/50">
          <span className="text-muted-foreground mr-1 text-[11px] font-medium">
            Category:
          </span>
          {(
            [
              ['all', 'All Events'],
              ['destructions', 'Deletions & Purges'],
              ['documents', 'Document Actions'],
              ['reviews', 'Reviews & Decisions'],
              ['nocs', 'Authority NOCs'],
              ['users', 'Admin & Users'],
            ] as const
          ).map(([catKey, catLabel]) => (
            <button
              key={catKey}
              type="button"
              onClick={() => setSelectedCategory(catKey)}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                selectedCategory === catKey
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
              aria-pressed={selectedCategory === catKey}
            >
              {catLabel}
            </button>
          ))}
        </div>
      </section>

      {/* Ledger Table */}
      <section
        className="rounded-lg border border-border bg-card shadow-2xs overflow-hidden"
        aria-label="Audit records"
      >
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-45 text-xs font-semibold">
                Timestamp
              </TableHead>
              <TableHead className="w-50 text-xs font-semibold">
                Actor
              </TableHead>
              <TableHead className="w-40 text-xs font-semibold">
                Action
              </TableHead>
              <TableHead className="w-30 text-xs font-semibold">
                Entity
              </TableHead>
              <TableHead className="text-xs font-semibold">
                Summary & Evidence
              </TableHead>
              <TableHead className="w-22.5 text-right text-xs font-semibold">
                Payload
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-40 text-center">
                  <div className="flex flex-col items-center justify-center text-muted-foreground">
                    <Shield
                      className="h-8 w-8 stroke-1 text-muted-foreground/60 mb-2"
                      aria-hidden="true"
                    />
                    <p className="text-sm font-medium text-foreground">
                      No audit entries found
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {searchQuery ||
                      selectedCategory !== 'all' ||
                      selectedEntity !== 'all'
                        ? 'Try adjusting search terms or filters.'
                        : 'System actions will appear here automatically upon occurrence.'}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const date = new Date(log.created_at);
                const formattedDate = date.toLocaleDateString('en-GB', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                });
                const formattedTime = date.toLocaleTimeString('en-GB', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                });

                return (
                  <TableRow
                    key={log.id}
                    className="hover:bg-muted/40 transition-colors"
                  >
                    <TableCell className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                      <div className="font-medium text-foreground">
                        {formattedDate}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {formattedTime} UTC
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-xs">
                        <div className="font-medium text-foreground flex items-center gap-1.5">
                          {log.actor?.full_name || 'System / Automated'}
                          {log.actor?.role && (
                            <span className="text-[10px] font-mono uppercase px-1 py-0.2 rounded bg-muted text-muted-foreground">
                              {log.actor.role}
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-muted-foreground font-mono truncate max-w-47.5">
                          {log.actor?.email || '-'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {getActionBadge(log.action)}
                    </TableCell>
                    <TableCell className="text-xs font-mono">
                      <Badge
                        variant="outline"
                        className="text-[10px] uppercase font-mono border-border bg-background"
                      >
                        {log.entity}
                      </Badge>
                      <div
                        className="text-[10px] text-muted-foreground truncate max-w-27.5 cursor-pointer hover:text-foreground mt-0.5"
                        onClick={() => copyToClipboard(log.entity_id, log.id)}
                        title={`Click to copy: ${log.entity_id}`}
                      >
                        {copiedId === log.id
                          ? 'Copied!'
                          : log.entity_id.slice(0, 8) + '...'}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-foreground font-sans">
                      <p className="line-clamp-2 leading-relaxed">
                        {getSummaryText(log)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedLog(log)}
                        className="h-7 px-2 text-xs font-mono text-muted-foreground hover:text-foreground"
                        aria-label={`Inspect raw payload for event ${log.id}`}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </section>

      {/* Raw Payload Inspector Dialog */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center justify-between">
              <span>Event Details: {selectedLog?.action}</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Event ID:{' '}
              <code className="font-mono text-[11px] text-foreground">
                {selectedLog?.id}
              </code>
            </DialogDescription>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-2 p-2.5 rounded border border-border bg-muted/20 font-mono text-[11px]">
                <div>
                  <span className="text-muted-foreground">Actor:</span>{' '}
                  <span className="text-foreground font-semibold">
                    {selectedLog.actor?.full_name ?? 'System'} (
                    {selectedLog.actor?.email ?? '-'})
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Role:</span>{' '}
                  <span className="text-foreground uppercase">
                    {selectedLog.actor?.role ?? 'SYSTEM'}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity:</span>{' '}
                  <span className="text-foreground">{selectedLog.entity}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Entity ID:</span>{' '}
                  <span className="text-foreground truncate">
                    {selectedLog.entity_id}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-muted-foreground">Timestamp:</span>{' '}
                  <span className="text-foreground">
                    {new Date(selectedLog.created_at).toISOString()}
                  </span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between pb-1">
                  <span className="font-semibold text-foreground text-xs">
                    Metadata Payload
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-[11px] gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(selectedLog.metadata, null, 2),
                        'metadata',
                      )
                    }
                  >
                    {copiedId === 'metadata' ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy JSON
                      </>
                    )}
                  </Button>
                </div>
                <pre className="p-3 rounded border border-border bg-muted/40 font-mono text-[11px] text-foreground overflow-x-auto max-h-60 leading-relaxed">
                  {JSON.stringify(selectedLog.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </main>
  );
}
