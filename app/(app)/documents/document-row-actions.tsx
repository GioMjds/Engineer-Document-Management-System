'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Download,
  FileEdit,
  UploadCloud,
  Archive,
  Loader2,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DocumentEditModal } from './document-edit-modal';
import { DocumentRevisionModal } from './document-revision-modal';
import { archiveDocument, getDownloadUrl } from '@/app/actions/documents';

interface DocumentRowItem {
  id: string;
  doc_number: string;
  title: string;
  description: string | null;
  discipline: 'mep' | 'architect' | 'structure' | 'civil' | null;
  revision: string;
  status: string;
  file_name: string;
  uploaded_by?: string;
}

export function DocumentRowActions({
  document,
  isDC,
  currentUserRole,
  currentUserId,
}: {
  document: DocumentRowItem;
  isDC: boolean;
  currentUserRole?: string;
  currentUserId?: string;
}) {
  const router = useRouter();
  const canEdit =
    isDC ||
    (currentUserRole === 'authority_engineer' &&
      Boolean(currentUserId && document.uploaded_by === currentUserId));
  const canArchive = isDC;
  const canRevise =
    isDC ||
    currentUserRole === 'authority_engineer' ||
    (currentUserRole === 'engineer' &&
      document.status === 'rejected' &&
      Boolean(currentUserId && document.uploaded_by === currentUserId));

  const [downloading, setDownloading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    const res = await getDownloadUrl(document.id);
    setDownloading(false);

    if (!res.ok || !res.url) {
      toast.error(res.error || 'Failed to generate download URL.');
      return;
    }

    const a = window.document.createElement('a');
    a.href = res.url;
    a.download = document.file_name || 'document';
    window.document.body.appendChild(a);
    a.click();
    window.document.body.removeChild(a);
  }

  async function handleArchive() {
    setArchiving(true);
    const res = await archiveDocument(document.id);
    setArchiving(false);

    if (!res.success) {
      toast.error(res.error || 'Failed to archive document.');
      return;
    }

    toast.success(`Archived ${document.doc_number}.`);
    setArchiveOpen(false);
    router.refresh();
  }

  return (
    <div className="flex items-center justify-end">
      {/* Desktop / Tablet Segmented Toolbar with Tooltips */}
      <TooltipProvider delay={120} closeDelay={80}>
        <div className="hidden sm:inline-flex items-center rounded-md border border-border/70 bg-card p-0.5 shadow-2xs">
          {/* Download Action */}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleDownload}
                  disabled={downloading}
                  aria-label={`Download drawing ${document.file_name || document.doc_number}`}
                  className="size-7 rounded-sm text-foreground/80 hover:text-foreground hover:bg-muted/80 focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                >
                  {downloading ? (
                    <Loader2 className="size-3.5 animate-spin text-primary" />
                  ) : (
                    <Download className="size-3.5" />
                  )}
                </Button>
              }
            />
            <TooltipContent
              side="top"
              sideOffset={6}
              className="text-left max-w-56"
            >
              <div className="font-semibold text-foreground flex items-center justify-between gap-2">
                <span>Download File</span>
                <span className="font-mono text-[10px] text-[#02a9d3]">
                  {document.revision || 'R00'}
                </span>
              </div>
              <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                {document.file_name || 'Download latest file'}
              </div>
            </TooltipContent>
          </Tooltip>

          {/* Edit Metadata Action */}
          {canEdit && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setEditOpen(true)}
                    aria-label={`Edit metadata for ${document.doc_number}`}
                    className="size-7 rounded-sm text-foreground/80 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/80 dark:hover:bg-blue-950/40 focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                  >
                    <FileEdit className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent
                side="top"
                sideOffset={6}
                className="text-left max-w-52"
              >
                <div className="font-semibold text-foreground">
                  Edit Metadata
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Update title, discipline, or document parameters
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Upload Revision Action */}
          {canRevise && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => setRevisionOpen(true)}
                    aria-label={`Upload revision for ${document.doc_number}`}
                    className="size-7 rounded-sm text-foreground/80 hover:text-[#02a9d3] hover:bg-sky-50/80 dark:hover:bg-sky-950/40 focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                  >
                    <UploadCloud className="size-3.5" />
                  </Button>
                }
              />
              <TooltipContent
                side="top"
                sideOffset={6}
                className="text-left max-w-56"
              >
                <div className="font-semibold text-foreground">
                  Upload Revision
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Submit revised drawing file and increment revision
                </div>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Archive Action */}
          {canArchive && (
            <>
              <div
                className="h-3.5 w-px bg-border/70 mx-0.5"
                aria-hidden="true"
              />
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setArchiveOpen(true)}
                      aria-label={`Archive document ${document.doc_number}`}
                      className="size-7 rounded-sm text-muted-foreground/80 hover:text-destructive hover:bg-destructive/10 focus-visible:ring-1 focus-visible:ring-ring transition-colors"
                    >
                      <Archive className="size-3.5" />
                    </Button>
                  }
                />
                <TooltipContent
                  side="top"
                  sideOffset={6}
                  className="text-left max-w-56"
                >
                  <div className="font-semibold text-destructive">
                    Archive Document
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    Soft-delete drawing and transfer to Archive repository
                  </div>
                </TooltipContent>
              </Tooltip>
            </>
          )}
        </div>
      </TooltipProvider>

      {/* Mobile Compact Overflow Menu */}
      <div className="inline-flex sm:hidden">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon-xs"
                aria-label={`Actions for ${document.doc_number}`}
                className="size-7 rounded-md"
              >
                <MoreHorizontal className="size-3.5 text-muted-foreground" />
              </Button>
            }
          />
          <PopoverContent
            align="end"
            side="bottom"
            sideOffset={4}
            className="w-56 p-1.5 shadow-md border border-border"
          >
            <div className="px-2 py-1 border-b border-border mb-1">
              <div className="font-mono text-xs font-semibold text-foreground">
                {document.doc_number}
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                {document.title}
              </div>
            </div>

            <div className="space-y-0.5">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  handleDownload();
                }}
                disabled={downloading}
                className="w-full flex items-center gap-2.5 px-2 py-2 text-xs rounded-md text-foreground hover:bg-muted transition-colors text-left"
              >
                <Download className="size-3.5 text-muted-foreground shrink-0" />
                <div className="flex-1 truncate">
                  <div className="font-medium">Download File</div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    Rev {document.revision || 'R00'}
                  </div>
                </div>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setEditOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 text-xs rounded-md text-foreground hover:bg-blue-50 dark:hover:bg-blue-950/40 text-left transition-colors"
                >
                  <FileEdit className="size-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                  <div>
                    <div className="font-medium">Edit Metadata</div>
                    <div className="text-[10px] text-muted-foreground">
                      Title, discipline
                    </div>
                  </div>
                </button>
              )}

              {canRevise && (
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    setRevisionOpen(true);
                  }}
                  className="w-full flex items-center gap-2.5 px-2 py-2 text-xs rounded-md text-foreground hover:bg-sky-50 dark:hover:bg-sky-950/40 text-left transition-colors"
                >
                  <UploadCloud className="size-3.5 text-[#02a9d3] shrink-0" />
                  <div>
                    <div className="font-medium">Upload Revision</div>
                    <div className="text-[10px] text-muted-foreground">
                      Submit update
                    </div>
                  </div>
                </button>
              )}

              {canArchive && (
                <>
                  <div className="h-px bg-border my-1" />
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setArchiveOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-2 text-xs rounded-md text-destructive hover:bg-destructive/10 text-left transition-colors"
                  >
                    <Archive className="size-3.5 shrink-0" />
                    <div>
                      <div className="font-medium">Archive Document</div>
                      <div className="text-[10px] text-destructive/80">
                        Move to archive
                      </div>
                    </div>
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Shared Modals */}
      {canEdit && (
        <DocumentEditModal
          open={editOpen}
          onOpenChange={setEditOpen}
          document={document}
        />
      )}

      {canRevise && (
        <DocumentRevisionModal
          open={revisionOpen}
          onOpenChange={setRevisionOpen}
          document={document}
        />
      )}

      {canArchive && (
        <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Archive className="size-4 text-amber-600 dark:text-amber-400" />
                <span>Archive Document</span>
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to archive{' '}
                <span className="font-semibold text-foreground font-mono">
                  {document.doc_number}
                </span>
                ? This will soft-delete the document and move it to the Archive
                repository.
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-md border border-border bg-muted/40 p-2.5 text-xs space-y-0.5">
              <div className="text-muted-foreground">
                Title:{' '}
                <span className="text-foreground font-medium">
                  {document.title}
                </span>
              </div>
              <div className="text-muted-foreground">
                Current Revision:{' '}
                <span className="font-mono text-[#02a9d3] font-semibold">
                  {document.revision || 'R00'}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setArchiveOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={archiving}
                onClick={handleArchive}
              >
                {archiving ? 'Archiving...' : 'Confirm Archive'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
