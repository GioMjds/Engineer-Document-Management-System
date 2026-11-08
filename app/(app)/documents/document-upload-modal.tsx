'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { uploadDocument } from '@/app/actions/documents';
import { MAX_FILE_SIZE, ALLOWED_MIME_TYPES } from '@/lib/documents';

interface ProjectOption {
  id: string;
  name: string;
  code: string;
}

const documentUploadSchema = z.object({
  projectId: z.string().min(1, 'Please select a project.'),
  discipline: z.enum(['mep', 'architect', 'structure', 'civil']),
  doc_number: z.string().trim().min(1, 'Document number is required.'),
  title: z.string().trim().min(1, 'Title is required.'),
  description: z.string(),
});

type DocumentUploadValues = z.infer<typeof documentUploadSchema>;

export function DocumentUploadModal({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DocumentUploadValues>({
    resolver: zodResolver(documentUploadSchema),
    defaultValues: {
      projectId: projects[0]?.id || '',
      discipline: 'mep',
      doc_number: '',
      title: '',
      description: '',
    },
  });

  async function onSubmit(values: DocumentUploadValues) {
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File exceeds 50 MB limit.');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_number', values.doc_number);
    formData.append('title', values.title);
    if (values.description.trim()) {
      formData.append('description', values.description.trim());
    }
    if (values.discipline) {
      formData.append('discipline', values.discipline);
    }

    const result = await uploadDocument(values.projectId, formData);

    if (!result.success) {
      toast.error(result.error || 'Upload failed.');
      return;
    }

    toast.success('Document uploaded successfully (Revision R00).');
    setOpen(false);
    reset();
    setFile(null);
    router.refresh();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) {
          reset();
          setFile(null);
        }
      }}
    >
      <DialogTrigger
        render={
          <Button className="bg-[#02a9d3] hover:bg-[#0194b8] text-white">
            <Plus className="mr-1.5 h-4 w-4" />
            Upload Document
          </Button>
        }
      />
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document / Drawing</DialogTitle>
          <DialogDescription>
            Submit an initial R00 drawing or document to an assigned project.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="project">Project *</Label>
            <select
              id="project"
              {...register('projectId')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  Project #{p.code}
                </option>
              ))}
            </select>
            {errors.projectId && (
              <p className="text-xs text-destructive">
                {errors.projectId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discipline">Discipline *</Label>
              <select
                id="discipline"
                {...register('discipline')}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="mep">MEP</option>
                <option value="architect">Architect</option>
                <option value="structure">Structure</option>
                <option value="civil">Civil</option>
              </select>
              {errors.discipline && (
                <p className="text-xs text-destructive">
                  {errors.discipline.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="doc_number">Doc Number *</Label>
              <Input
                id="doc_number"
                placeholder="e.g. DWG-STR-001"
                {...register('doc_number')}
              />
              {errors.doc_number && (
                <p className="text-xs text-destructive">
                  {errors.doc_number.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Foundation Structural Layout"
              {...register('title')}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="General notes or scope details..."
              {...register('description')}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="file">File * (PDF, DWG, Images, Office)</Label>
            <Input
              id="file"
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
              onClick={() => {
                setOpen(false);
                reset();
                setFile(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-[#02a9d3] hover:bg-[#0194b8] text-white"
            >
              {isSubmitting ? 'Uploading...' : 'Submit R00'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
