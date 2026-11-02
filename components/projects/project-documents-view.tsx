'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderKanban,
  X,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/status-badge';
import { formatSize } from '@/utils/formatters';
import { getDownloadUrl } from '@/app/(app)/documents/actions';
import { downloadFileFromUrl } from '@/lib/download';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { Route } from 'next';

export interface ProjectDocumentSummary {
  id: string;
  project_id: string | null;
  doc_number: string;
  title: string;
  description: string | null;
  discipline: string | null;
  revision: string;
  status: string;
  file_name: string;
  file_path?: string | null;
  file_size: number | null;
  created_at: string;
  updated_at?: string;
  uploaded_by?: string;
}

export interface ProjectInfo {
  id?: string;
  code: string;
  name?: string;
  description?: string;
  masterAuthority?: string;
  lifecycleStage?: string;
}

interface ProjectDocumentsViewProps {
  project: ProjectInfo;
  documents: ProjectDocumentSummary[];
  isModal?: boolean;
  onClose?: () => void;
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

const DISCIPLINE_LABELS: Record<string, string> = {
  mep: 'MEP',
  architect: 'Architectural',
  structure: 'Structural',
  civil: 'Civil',
};

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? dateStr
      : d.toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        });
  } catch {
    return dateStr;
  }
}

export function ProjectDocumentsView({
  project,
  documents,
  isModal = false,
  onClose,
}: ProjectDocumentsViewProps) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const underReview = documents.filter(
      (d) =>
        d.status.toLowerCase() === 'submitted' ||
        d.status.toLowerCase() === 'escalated',
    ).length;
    const approved = documents.filter(
      (d) =>
        d.status.toLowerCase() === 'approved' ||
        d.status.toLowerCase() === 'ready_for_authority',
    ).length;
    const rejected = documents.filter(
      (d) => d.status.toLowerCase() === 'rejected',
    ).length;

    const disciplineCounts: Record<string, number> = {
      all: documents.length,
      mep: 0,
      architect: 0,
      structure: 0,
      civil: 0,
    };

    for (const doc of documents) {
      const disc = doc.discipline?.toLowerCase();
      if (disc && disc in disciplineCounts) {
        disciplineCounts[disc]++;
      }
    }

    return { underReview, approved, rejected, disciplineCounts };
  }, [documents]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      if (
        disciplineFilter !== 'all' &&
        doc.discipline?.toLowerCase() !== disciplineFilter
      ) {
        return false;
      }

      if (statusFilter !== 'all') {
        const s = doc.status.toLowerCase();
        if (statusFilter === 'under_review') {
          if (s !== 'submitted' && s !== 'escalated') return false;
        } else if (statusFilter === 'approved') {
          if (s !== 'approved' && s !== 'ready_for_authority') return false;
        } else if (s !== statusFilter) {
          return false;
        }
      }

      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesDocNumber = doc.doc_number.toLowerCase().includes(q);
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesDesc = (doc.description || '').toLowerCase().includes(q);
        const matchesFile = (doc.file_name || '').toLowerCase().includes(q);
        if (!matchesDocNumber && !matchesTitle && !matchesDesc && !matchesFile) {
          return false;
        }
      }

      return true;
    });
  }, [documents, disciplineFilter, statusFilter, search]);

  const handleDownload = async (doc: ProjectDocumentSummary) => {
    setDownloadingId(doc.id);
    try {
      const res = await getDownloadUrl(doc.id);
      if (!res.ok || !res.url) {
        toast.error(res.error || 'Failed to download document');
        return;
      }
      await downloadFileFromUrl(
        res.url,
        doc.file_name || `${doc.doc_number}.pdf`,
      );
      toast.success(`Downloaded ${doc.file_name || doc.doc_number}`);
    } catch {
      toast.error('Network error during file download request');
    } finally {
      setDownloadingId(null);
    }
  };

  const handleCloseClick = () => {
    if (onClose) {
      onClose();
    } else {
      router.back();
    }
  };

  const disciplines = [
    { key: 'all', label: 'All Disciplines' },
    { key: 'mep', label: 'MEP' },
    { key: 'architect', label: 'Architectural' },
    { key: 'structure', label: 'Structural' },
    { key: 'civil', label: 'Civil' },
  ];

  return (
    <div className="flex flex-col h-full text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-primary">
                {project.code}
              </span>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                {project.name || project.description || 'Project Submittals'}
              </h2>
              {project.masterAuthority && (
                <Badge
                  variant="outline"
                  className="text-[11px] font-normal border-border bg-muted/40"
                >
                  {project.masterAuthority}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Technical submittals, drawing packages, and compliance records for
              this project.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className="px-2.5 py-1 text-xs font-mono font-medium"
            >
              <FolderKanban className="mr-1 size-3.5" />
              {documents.length} {documents.length === 1 ? 'Doc' : 'Docs'}
            </Badge>
          </div>
        </div>

        {/* Quick summary cards */}
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center sm:text-left">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-center sm:justify-start gap-1">
              <FolderKanban className="size-3 text-muted-foreground" />
              Total Submittals
            </div>
            <div className="mt-1 text-lg font-bold">{documents.length}</div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center sm:text-left">
            <div className="text-[11px] font-medium text-amber-600 dark:text-amber-400 flex items-center justify-center sm:justify-start gap-1">
              <Clock className="size-3" />
              Under Review
            </div>
            <div className="mt-1 text-lg font-bold text-amber-700 dark:text-amber-400">
              {stats.underReview}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center sm:text-left">
            <div className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1">
              <CheckCircle2 className="size-3" />
              Authority Approved
            </div>
            <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-400">
              {stats.approved}
            </div>
          </div>
          <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-center sm:text-left">
            <div className="text-[11px] font-medium text-red-600 dark:text-red-400 flex items-center justify-center sm:justify-start gap-1">
              <AlertTriangle className="size-3" />
              Changes Requested
            </div>
            <div className="mt-1 text-lg font-bold text-red-700 dark:text-red-400">
              {stats.rejected}
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="border-b border-border bg-card/50 px-6 py-3 space-y-3">
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search document # or title..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-md border border-input bg-background px-2.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="all">All Statuses</option>
              <option value="under_review">Under Review</option>
              <option value="approved">Approved / Ready</option>
              <option value="rejected">Changes Requested</option>
              <option value="draft">Draft</option>
            </select>
          </div>
        </div>

        {/* Discipline Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {disciplines.map((d) => {
            const count = stats.disciplineCounts[d.key] ?? 0;
            const active = disciplineFilter === d.key;
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setDisciplineFilter(d.key)}
                className={cn(
                  'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  active
                    ? 'bg-primary text-primary-foreground shadow-xs'
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                <span>{d.label}</span>
                <span
                  className={cn(
                    'rounded-full px-1.5 py-0.2 text-[10px] font-mono',
                    active
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-background/80 text-muted-foreground',
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Documents List */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {filteredDocuments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="rounded-full bg-muted p-3 text-muted-foreground">
              <FileText className="size-6" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-foreground">
              {documents.length === 0
                ? 'No documents submitted'
                : 'No documents match filter'}
            </h3>
            <p className="mt-1 text-xs text-muted-foreground max-w-sm">
              {documents.length === 0
                ? `No engineering documents or drawings have been registered for project ${project.code} yet.`
                : 'Try adjusting your search query or discipline and status filters.'}
            </p>
            {(search ||
              disciplineFilter !== 'all' ||
              statusFilter !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearch('');
                  setDisciplineFilter('all');
                  setStatusFilter('all');
                }}
                className="mt-4 h-7 text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="rounded-lg border border-border overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-border bg-muted/40 font-semibold text-muted-foreground">
                  <tr>
                    <th className="px-3.5 py-2.5">Doc #</th>
                    <th className="px-3.5 py-2.5">Title & Submittal</th>
                    <th className="px-3.5 py-2.5">Discipline</th>
                    <th className="px-3.5 py-2.5 text-center">Rev</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5">Uploaded</th>
                    <th className="px-3.5 py-2.5">Size</th>
                    <th className="px-3.5 py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredDocuments.map((doc) => {
                    const discKey = doc.discipline?.toLowerCase() || '';
                    const discBadgeClass =
                      DISCIPLINE_COLORS[discKey] ||
                      'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300';
                    const discLabel =
                      DISCIPLINE_LABELS[discKey] || doc.discipline || 'General';
                    const isDownloading = downloadingId === doc.id;

                    return (
                      <tr
                        key={doc.id}
                        className="transition-colors hover:bg-muted/20"
                      >
                        <td className="px-3.5 py-2.5 font-mono font-semibold text-foreground whitespace-nowrap">
                          {doc.doc_number}
                        </td>
                        <td className="px-3.5 py-2.5 max-w-xs">
                          <div className="font-medium text-foreground truncate">
                            {doc.title}
                          </div>
                          {doc.description && (
                            <div className="text-[11px] text-muted-foreground truncate">
                              {doc.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={cn('text-[11px] border', discBadgeClass)}
                          >
                            {discLabel}
                          </Badge>
                        </td>
                        <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-muted-foreground">
                            {doc.revision}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap text-muted-foreground">
                          {formatDate(doc.created_at)}
                        </td>
                        <td className="px-3.5 py-2.5 whitespace-nowrap font-mono text-[11px] text-muted-foreground">
                          {formatSize(doc.file_size)}
                        </td>
                        <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownload(doc)}
                            disabled={isDownloading}
                            className="h-7 px-2 text-xs gap-1"
                            title="Download document file"
                          >
                            <Download className="size-3.5" />
                            <span>{isDownloading ? '...' : 'Download'}</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-border bg-card px-6 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-xs">
          <Link
            href={
              (`/documents?project=${project.id || project.code}`) as Route
            }
            className="flex items-center gap-1.5 text-primary hover:underline font-medium"
          >
            <span>Open full Document Library</span>
            <ExternalLink className="size-3.5" />
          </Link>
          <span className="text-border">|</span>
          <Link
            href={`/noc-tracker/${project.code}` as Route}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <ShieldCheck className="size-3.5" />
            <span>NOC Tracker ({project.code})</span>
          </Link>
        </div>

        {isModal && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCloseClick}
            className="h-8 px-3 text-xs"
          >
            Close
          </Button>
        )}
      </div>
    </div>
  );
}
