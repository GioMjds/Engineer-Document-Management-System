'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Upload } from 'lucide-react';
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

export function DocumentUploadModal({
  projects,
}: {
  projects: ProjectOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    projects[0]?.id || '',
  );
  const [discipline, setDiscipline] = useState<string>('mep');
  const [docNumber, setDocNumber] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [file, setFile] = useState<File | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedProjectId) {
      toast.error('Please select a project.');
      return;
    }
    if (!docNumber.trim()) {
      toast.error('Document number is required.');
      return;
    }
    if (!title.trim()) {
      toast.error('Title is required.');
      return;
    }
    if (!file) {
      toast.error('Please select a file to upload.');
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('File exceeds 50 MB limit.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('doc_number', docNumber.trim());
    formData.append('title', title.trim());
    if (description.trim()) {
      formData.append('description', description.trim());
    }
    if (discipline) {
      formData.append('discipline', discipline);
    }

    const result = await uploadDocument(selectedProjectId, formData);
    setSubmitting(false);

    if (!result.success) {
      toast.error(result.error || 'Upload failed.');
      return;
    }

    toast.success('Document uploaded successfully (Revision R00).');
    setOpen(false);
    setDocNumber('');
    setTitle('');
    setDescription('');
    setFile(null);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="project">Project *</Label>
            <select
              id="project"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
              required
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="discipline">Discipline *</Label>
              <select
                id="discipline"
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
              <Label htmlFor="doc_number">Doc Number *</Label>
              <Input
                id="doc_number"
                placeholder="e.g. DWG-STR-001"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="title">Document Title *</Label>
            <Input
              id="title"
              placeholder="e.g. Foundation Structural Layout"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="General notes or scope details..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-[#02a9d3] hover:bg-[#0194b8] text-white"
            >
              {submitting ? 'Uploading...' : 'Submit R00'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
