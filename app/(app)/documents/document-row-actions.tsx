'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Download,
  Edit2,
  FileUp,
  Archive,
  MoreVertical,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
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
    ['authority_engineer', 'engineer'].includes(currentUserRole ?? '');
  const [downloading, setDownloading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [revisionOpen, setRevisionOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

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
    <div className="flex items-center justify-end gap-1">
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={handleDownload}
        disabled={downloading}
        title="Download file"
      >
        <Download className="h-3.5 w-3.5" />
      </Button>

      {canEdit && (
        <>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setEditOpen(true)}
            title="Edit Metadata"
          >
            <Edit2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          </Button>

          {/* Edit Metadata Modal */}
          <DocumentEditModal
            open={editOpen}
            onOpenChange={setEditOpen}
            document={document}
          />
        </>
      )}

      {canRevise && (
        <>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setRevisionOpen(true)}
            title="Upload New Revision"
          >
            <FileUp className="h-3.5 w-3.5 text-[#02a9d3]" />
          </Button>

          {/* Upload New Revision Modal */}
          <DocumentRevisionModal
            open={revisionOpen}
            onOpenChange={setRevisionOpen}
            document={document}
          />
        </>
      )}

      {canArchive && (
        <>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => setArchiveOpen(true)}
            title="Archive Document"
          >
            <Archive className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          </Button>

          {/* Archive Confirmation Modal */}
          <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
            <DialogContent className="max-w-sm">
              <DialogHeader>
                <DialogTitle>Archive Document</DialogTitle>
                <DialogDescription>
                  Are you sure you want to archive{' '}
                  <span className="font-semibold text-foreground">
                    {document.doc_number}
                  </span>
                  ? This will soft-delete the document and move it to the Archive view.
                </DialogDescription>
              </DialogHeader>

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
        </>
      )}
    </div>
  );
}
