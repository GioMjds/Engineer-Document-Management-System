'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { uploadDocumentRevision } from '@/app/actions/documents';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/documents';

interface DocumentRevisionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    doc_number: string;
    title: string;
    revision: string;
  };
}

export function DocumentRevisionModal({
  open,
  onOpenChange,
  document,
}: DocumentRevisionModalProps) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentRev = document.revision || 'R00';
  const match = currentRev.match(/^R(\d+)$/i);
  const nextRev = match
    ? `R${String(parseInt(match[1], 10) + 1).padStart(2, '0')}`
    : 'R01';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!file) {
      toast.error('Please choose a revised file to upload.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File exceeds 50 MB limit.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);

    const result = await uploadDocumentRevision(document.id, formData);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to upload revision.');
      return;
    }

    toast.success(`Uploaded revision ${result.newRevision || nextRev}. Status set to submitted.`);
    onOpenChange(false);
    setFile(null);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload New Revision</DialogTitle>
          <DialogDescription>
            Advance document from <span className="font-semibold text-foreground">{currentRev}</span> to{' '}
            <span className="font-semibold text-[#02a9d3]">{nextRev}</span>.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="rounded-md border border-border bg-muted/40 p-3 space-y-1 text-xs">
            <div>
              <span className="text-muted-foreground">Document:</span>{' '}
              <span className="font-mono font-medium">{document.doc_number}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Title:</span>{' '}
              <span className="font-medium text-foreground">{document.title}</span>
            </div>
            <div>
              <span className="text-muted-foreground">New Target Revision:</span>{' '}
              <span className="font-semibold text-[#02a9d3]">{nextRev}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="revision-file">Replacement Drawing / File *</Label>
            <Input
              id="revision-file"
              type="file"
              accept={ALLOWED_MIME_TYPES.join(',')}
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              required
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#02a9d3] hover:bg-[#0194b8] text-white"
            >
              {submitting ? 'Uploading...' : `Submit ${nextRev}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
