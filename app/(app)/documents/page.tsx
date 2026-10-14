import type { Metadata } from 'next';
import { requireUser } from '@/lib/auth';
import { can } from '@/lib/permissions';
import { createClient } from '@/lib/supabase/server';
import { UploadForm } from './upload-form';
import { DownloadButton } from './download-button';
import { ArchiveButton } from './archive-button';
import { StatusBadge } from '@/components/status-badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatSize } from '@/utils/formatters';

export const metadata: Metadata = {
  title: 'Documents',
  description: 'Manage and track engineering documents',
}

export default async function DocumentsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const isDC = can(user.role, 'document.edit');

  // RLS filters this automatically per role
  const { data: documents } = await supabase
    .from('documents')
    .select(
      'id, doc_number, title, status, file_size, created_at, uploaded_by, reviews(decision, comment, created_at)',
    )
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-6">
      <UploadForm userId={user.id} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Documents</h2>
        <div className="rounded-lg border border-border bg-card overflow-hidden shadow-xs">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-36 font-semibold whitespace-nowrap">Doc #</TableHead>
                <TableHead className="min-w-56 font-semibold">Title</TableHead>
                <TableHead className="w-36 font-semibold whitespace-nowrap">Status</TableHead>
                <TableHead className="w-24 font-semibold whitespace-nowrap">Size</TableHead>
                <TableHead className="w-28 font-semibold whitespace-nowrap">Submitted</TableHead>
                <TableHead className="w-36 text-right font-semibold whitespace-nowrap">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents?.length ? (
                documents.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs font-medium whitespace-nowrap">
                      {d.doc_number}
                    </TableCell>
                    <TableCell className="whitespace-normal break-words max-w-xs md:max-w-md">
                      <span className="font-medium text-foreground">{d.title}</span>
                    </TableCell>
                    <TableCell className="whitespace-normal">
                      <StatusBadge status={d.status} />
                      {d.status === 'rejected' && d.reviews?.length > 0 && (
                        <div className="mt-1 text-xs text-red-700 dark:text-red-400">
                          Reason:{' '}
                          {
                            [...d.reviews].sort((a, b) =>
                              b.created_at.localeCompare(a.created_at),
                            )[0].comment
                          }
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {formatSize(d.file_size)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <DownloadButton documentId={d.id} />
                        {isDC && (
                          <ArchiveButton
                            documentId={d.id}
                            docNumber={d.doc_number}
                          />
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-muted-foreground py-8"
                  >
                    No documents yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
