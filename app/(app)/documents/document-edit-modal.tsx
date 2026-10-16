'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const documentEditSchema = z.object({
  doc_number: z.string().trim().min(1, 'Document number is required.'),
  title: z.string().trim().min(1, 'Title is required.'),
  description: z.string(),
  discipline: z.enum(['mep', 'architect', 'structure', 'civil']),
});

type DocumentEditValues = z.infer<typeof documentEditSchema>;

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

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DocumentEditValues>({
    resolver: zodResolver(documentEditSchema),
    values: {
      doc_number: document.doc_number,
      title: document.title,
      description: document.description || '',
      discipline: (document.discipline || 'mep') as DocumentEditValues['discipline'],
    },
  });

  async function onSubmit(values: DocumentEditValues) {
    const result = await editDocument(document.id, {
      doc_number: values.doc_number,
      title: values.title,
      description: values.description.trim() || undefined,
      discipline: values.discipline,
    });

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="edit-discipline">Discipline</Label>
              <select
                id="edit-discipline"
                {...register('discipline')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="mep">MEP</option>
                <option value="architect">Architect</option>
                <option value="structure">Structure</option>
                <option value="civil">Civil</option>
              </select>
              {errors.discipline && (
                <p className="text-xs text-destructive">{errors.discipline.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-doc_number">Doc Number *</Label>
              <Input
                id="edit-doc_number"
                {...register('doc_number')}
              />
              {errors.doc_number && (
                <p className="text-xs text-destructive">{errors.doc_number.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title *</Label>
            <Input
              id="edit-title"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              rows={3}
              {...register('description')}
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
              disabled={isSubmitting}
              className="bg-[#02a9d3] hover:bg-[#0194b8] text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
