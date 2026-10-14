import { requireCan } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ReviewDialog } from './review-dialog';
import { DownloadButton } from '../documents/download-button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default async function ReviewPage() {
  await requireCan('review.queue');
  const supabase = await createClient();

  const { data: pending } = await supabase
    .from('documents')
    .select(
      'id, doc_number, title, description, created_at, uploader:profiles!documents_uploaded_by_fkey(full_name)',
    )
    .eq('status', 'submitted')
    .order('created_at', { ascending: true }); // oldest first

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">
        Review queue {pending?.length ? `(${pending.length})` : ''}
      </h2>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Doc #</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Submitted by</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {pending?.length ? (
            pending.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-sm">
                  {d.doc_number}
                </TableCell>
                <TableCell>
                  <div>{d.title}</div>
                  {d.description && (
                    <div className="text-xs text-muted-foreground">
                      {d.description}
                    </div>
                  )}
                </TableCell>
                <TableCell>{d.uploader?.full_name || '-'}</TableCell>
                <TableCell>{new Date(d.created_at).toLocaleString()}</TableCell>
                <TableCell className="flex justify-end gap-2">
                  <DownloadButton documentId={d.id} />
                  <ReviewDialog
                    documentId={d.id}
                    docNumber={d.doc_number}
                    title={d.title}
                  />
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell
                colSpan={5}
                className="text-center text-muted-foreground"
              >
                Nothing waiting for review.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
