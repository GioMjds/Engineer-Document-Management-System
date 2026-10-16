'use client';

import { useState, useMemo } from 'react';
import { Filter, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { DocumentRowActions } from './document-row-actions';
import { formatSize } from '@/utils/formatters';
import { RejectionFeedbackCard } from './rejection-feedback-card';

export interface DocumentItem {
  id: string;
  project_id: string | null;
  doc_number: string;
  title: string;
  description: string | null;
  discipline: 'mep' | 'architect' | 'structure' | 'civil' | null;
  revision: string;
  status: string;
  file_name: string;
  file_size: number | null;
  created_at: string;
  uploaded_by: string;
  projectName?: string;
  projectCode?: string;
  reviews?: {
    decision: 'approve' | 'reject';
    comment: string | null;
    level?: string;
    reviewerName?: string;
    created_at: string;
  }[];
}

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

const DISCIPLINE_COLORS: Record<string, string> = {
  mep: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  architect:
    'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800',
  structure:
    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
  civil:
    'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
};

export function DocumentTableClient({
  documents,
  projects,
  isDC,
  currentUserRole,
  currentUserId,
}: {
  documents: DocumentItem[];
  projects: ProjectOption[];
  isDC: boolean;
  currentUserRole?: string;
  currentUserId?: string;
}) {
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [disciplineFilter, setDisciplineFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (projectFilter !== 'all' && doc.project_id !== projectFilter) {
        return false;
      }
      if (disciplineFilter !== 'all' && doc.discipline !== disciplineFilter) {
        return false;
      }
      if (statusFilter !== 'all') {
        const docStatus = doc.status.toLowerCase();
        if (statusFilter === 'ready_for_authority') {
          if (docStatus !== 'ready_for_authority' && docStatus !== 'approved') {
            return false;
          }
        } else if (docStatus !== statusFilter.toLowerCase()) {
          return false;
        }
      }
      if (search.trim()) {
        const query = search.toLowerCase();
        const matchesNumber = doc.doc_number.toLowerCase().includes(query);
        const matchesTitle = doc.title.toLowerCase().includes(query);
        const matchesProject =
          doc.projectCode?.toLowerCase().includes(query) ||
          doc.projectName?.toLowerCase().includes(query);
        if (!matchesNumber && !matchesTitle && !matchesProject) {
          return false;
        }
      }
      return true;
    });
  }, [documents, projectFilter, disciplineFilter, statusFilter, search]);

  return (
    <div className="space-y-4">
      {/* Filters Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between bg-card p-3 rounded-lg border border-border shadow-xs">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search */}
          <div className="relative min-w-44 flex-1 md:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Filter by doc # or title..."
              className="pl-8 text-xs h-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Project Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5 text-muted-foreground hidden sm:inline" />
            <select
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Discipline Filter */}
          <select
            value={disciplineFilter}
            onChange={(e) => setDisciplineFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Disciplines</option>
            <option value="mep">MEP</option>
            <option value="architect">Architect</option>
            <option value="structure">Structure</option>
            <option value="civil">Civil</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-md border border-input bg-background px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Statuses</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="ready_for_authority">Ready for Authority</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="text-xs text-muted-foreground self-end md:self-center whitespace-nowrap">
          Showing{' '}
          <span className="font-semibold text-foreground">
            {filteredDocuments.length}
          </span>{' '}
          of {documents.length} docs
        </div>
      </div>

      {/* Document Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
        <Table className="w-full">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="w-32 font-semibold whitespace-nowrap">
                Doc #
              </TableHead>
              <TableHead className="min-w-48 font-semibold">Title</TableHead>
              <TableHead className="w-24 font-semibold whitespace-nowrap">
                Project
              </TableHead>
              <TableHead className="w-28 font-semibold whitespace-nowrap">
                Discipline
              </TableHead>
              <TableHead className="w-16 font-semibold whitespace-nowrap">
                Rev
              </TableHead>
              <TableHead className="w-36 font-semibold whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="w-20 font-semibold whitespace-nowrap">
                Size
              </TableHead>
              <TableHead className="w-28 font-semibold whitespace-nowrap">
                Submitted
              </TableHead>
              <TableHead className="w-32 text-right font-semibold whitespace-nowrap">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length > 0 ? (
              filteredDocuments.map((d) => {
                const rejectionReview =
                  d.status === 'rejected' && d.reviews && d.reviews.length > 0
                    ? [...d.reviews].sort((a, b) =>
                        b.created_at.localeCompare(a.created_at),
                      )[0]
                    : null;

                const disciplineClass = d.discipline
                  ? DISCIPLINE_COLORS[d.discipline] ||
                    'bg-muted text-muted-foreground'
                  : 'bg-muted text-muted-foreground';

                return (
                  <TableRow key={d.id} className="hover:bg-muted/30">
                    <TableCell className="font-mono text-xs font-semibold whitespace-nowrap">
                      {d.doc_number}
                    </TableCell>
                    <TableCell className="whitespace-normal wrap-break-word max-w-xs md:max-w-md">
                      <div className="font-medium text-foreground">
                        {d.title}
                      </div>
                      {d.description && (
                        <div className="text-xs text-muted-foreground truncate max-w-sm">
                          {d.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {d.projectCode || '-'}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {d.discipline ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium uppercase border ${disciplineClass}`}
                        >
                          {d.discipline}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className="font-mono text-[11px] py-0 px-1.5 font-bold text-[#02a9d3]"
                      >
                        {d.revision || 'R00'}
                      </Badge>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <StatusBadge status={d.status} />
                      {rejectionReview && (
                        <RejectionFeedbackCard
                          document={{
                            id: d.id,
                            doc_number: d.doc_number,
                            title: d.title,
                            revision: d.revision || 'R00',
                            file_name: d.file_name,
                            uploaded_by: d.uploaded_by,
                          }}
                          review={{
                            level: rejectionReview.level || 're',
                            reviewerName: rejectionReview.reviewerName,
                            comment: rejectionReview.comment,
                            createdAt: rejectionReview.created_at,
                          }}
                          canUploadRevision={
                            currentUserRole === 'engineer' &&
                            Boolean(
                              currentUserId && d.uploaded_by === currentUserId,
                            )
                          }
                        />
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatSize(d.file_size)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <DocumentRowActions
                        document={{
                          id: d.id,
                          doc_number: d.doc_number,
                          title: d.title,
                          description: d.description,
                          discipline: d.discipline,
                          revision: d.revision || 'R00',
                          file_name: d.file_name,
                          uploaded_by: d.uploaded_by,
                          status: d.status,
                        }}
                        isDC={isDC}
                        currentUserRole={currentUserRole}
                        currentUserId={currentUserId}
                      />
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center text-muted-foreground py-10"
                >
                  No documents found matching filters.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
