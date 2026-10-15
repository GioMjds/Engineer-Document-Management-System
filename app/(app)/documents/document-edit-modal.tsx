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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { editDocument } from '@/app/actions/documents';

interface DocumentEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    doc_number: string;
    title: string;
    description: string | null;
    discipline: 'mep' | 'architect' | 'structure' | 'civil' | null;
  };
}

export function DocumentEditModal({
  open,
  onOpenChange,
  document,
}: DocumentEditModalProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [docNumber, setDocNumber] = useState(document.doc_number);
  const [title, setTitle] = useState(document.title);
  const [description, setDescription] = useState(document.description || '');
  const [discipline, setDiscipline] = useState<string>(
    document.discipline || 'mep',
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!docNumber.trim()) {
      toast.error('Document number is required.');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }

    setSubmitting(true);
    const validDiscipline = ['mep', 'architect', 'structure', 'civil'].includes(discipline)
      ? (discipline as 'mep' | 'architect' | 'structure' | 'civil')
      : undefined;

    const result = await editDocument(document.id, {
      doc_number: docNumber.trim(),
      title: title.trim(),
      description: description.trim() || undefined,
      discipline: validDiscipline,
    });

    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Failed to edit document.');
      return;
    }

    toast.success('Document metadata updated.');
    onOpenChange(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Document Metadata</DialogTitle>
          <DialogDescription>
            Update document parameters or adjust indexing information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-discipline">Discipline</Label>
              <select
                id="edit-discipline"
                value={discipline}
                onChange={(e) => setDiscipline(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="mep">MEP</option>
                <option value="architect">Architect</option>
                <option value="structure">Structure</option>
                <option value="civil">Civil</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-doc_number">Doc Number *</Label>
              <Input
                id="edit-doc_number"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              {submitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
