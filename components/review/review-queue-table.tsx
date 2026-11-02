'use client';

import { useState, useMemo } from 'react';
import { Search, Download, Inbox } from 'lucide-react';
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
  DrawingReviewModal,
  type ReviewDocument,
} from './drawing-review-modal';
import { EscalationBadge } from './escalation-badge';
import { getDownloadUrl } from '@/app/actions/documents';
import { toast } from 'sonner';

const DISCIPLINE_COLORS = {
  mep: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  architect:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  structure:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  civil:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
} satisfies Record<string, string>;

export function ReviewQueueTable({
  documents,
  currentUserRole,
}: {
  documents: ReviewDocument[];
  currentUserRole?: string;
}) {
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Extract distinct projects
  const projects = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of documents) {
      if (d.project_id && d.projectCode) {
        map.set(d.project_id, `${d.projectCode} - ${d.projectName || ''}`);
      }
    }
    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [documents]);

  const filtered = useMemo(() => {
    return documents.filter((doc) => {
      // Search filter
      const term = search.toLowerCase().trim();
      if (term) {
        const matchesDoc = doc.doc_number.toLowerCase().includes(term);
        const matchesTitle = doc.title.toLowerCase().includes(term);
        const matchesAuthor = doc.authorName?.toLowerCase().includes(term);
        const matchesProject = doc.projectCode?.toLowerCase().includes(term);
        if (!matchesDoc && !matchesTitle && !matchesAuthor && !matchesProject) {
          return false;
        }
      }

      // Discipline filter
      if (disciplineFilter !== 'all' && doc.discipline !== disciplineFilter) {
        return false;
      }

      // Project filter
      if (projectFilter !== 'all' && doc.project_id !== projectFilter) {
        return false;
      }

      return true;
    });
  }, [documents, search, disciplineFilter, projectFilter]);

  async function handleQuickDownload(doc: ReviewDocument) {
    setDownloadingId(doc.id);
    const res = await getDownloadUrl(doc.id);
    setDownloadingId(null);

    if (!res.ok || !res.url) {
      toast.error(res.error || 'Failed to generate download URL.');
      return;
    }

    const a = window.document.createElement('a');
    a.href = res.url;
    a.download = doc.file_name || 'drawing';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by Sheet Number, Title, Author, or Project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            aria-label="Filter drawings by discipline"
            className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Disciplines</option>
            <option value="mep">MEP</option>
            <option value="architect">Architectural</option>
            <option value="structure">Structural</option>
            <option value="civil">Civil</option>
          </select>

          {projects.length > 1 && (
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              aria-label="Filter drawings by project"
              className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Table view */}
      <div className="rounded-lg border bg-card overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="w-30 text-xs font-semibold">
                Project
              </TableHead>
              <TableHead className="w-35 text-xs font-semibold">
                Sheet Number
              </TableHead>
              <TableHead className="text-xs font-semibold">Title</TableHead>
              <TableHead className="w-27.5 text-xs font-semibold">
                Discipline
              </TableHead>
              <TableHead className="w-32.5 text-xs font-semibold">
                Author
              </TableHead>
              <TableHead className="w-30 text-xs font-semibold">
                Submission Date
              </TableHead>
              <TableHead className="w-17.5 text-xs font-semibold">
                Rev
              </TableHead>
              <TableHead className="w-30 text-right text-xs font-semibold">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length > 0 ? (
              filtered.map((doc) => (
                <TableRow
                  key={doc.id}
                  className="hover:bg-muted/30 transition-colors"
                >
                  <TableCell className="text-xs font-medium text-foreground">
                    <span className="font-semibold block">
                      {doc.projectCode || '-'}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate block max-w-27.5">
                      {doc.projectName || ''}
                    </span>
                  </TableCell>
                  <TableCell className="font-mono text-xs font-semibold text-foreground">
                    {doc.doc_number}
                  </TableCell>
                  <TableCell>
                    <div className="text-xs font-medium text-foreground">
                      {doc.title}
                    </div>
                    {doc.description && (
                      <div className="text-[11px] text-muted-foreground truncate max-w-xs">
                        {doc.description}
                      </div>
                    )}
                    {doc.status === 'escalated' && (
                      <div className="mt-1">
                        <EscalationBadge
                          reviewerName={doc.escalatedBy}
                          notes={doc.escalationNote}
                        />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    {doc.discipline ? (
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase font-bold ${
                          DISCIPLINE_COLORS[doc.discipline] || ''
                        }`}
                      >
                        {doc.discipline}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {doc.authorName || 'Engineer'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      {doc.revision}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleQuickDownload(doc)}
                        disabled={downloadingId === doc.id}
                        title="Download Drawing"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </Button>
                      <DrawingReviewModal
                        document={doc}
                        userRole={currentUserRole}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm font-medium text-foreground">
                      {search ||
                      disciplineFilter !== 'all' ||
                      projectFilter !== 'all'
                        ? 'No submitted drawings match the selected filters.'
                        : 'No drawings currently waiting for review in assigned projects.'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Drawings submitted by Engineers and Document Controllers
                      will appear here.
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
